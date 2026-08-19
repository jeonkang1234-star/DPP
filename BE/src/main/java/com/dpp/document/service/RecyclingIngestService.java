package com.dpp.document.service;

import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.blockchain.client.BlockchainClient;
import com.dpp.blockchain.entity.BlockchainAnchor;
import com.dpp.blockchain.repository.BlockchainAnchorRepository;
import com.dpp.document.client.ParserClient;
import com.dpp.document.client.ZkpClient;
import com.dpp.document.config.DocumentIntegrationProperties;
import com.dpp.document.dto.RecyclingUploadResponse;
import com.dpp.document.entity.Document;
import com.dpp.document.entity.DocumentLink;
import com.dpp.document.entity.Dpp;
import com.dpp.document.entity.ZkpProof;
import com.dpp.document.repository.DocumentLinkRepository;
import com.dpp.document.repository.DocumentRepository;
import com.dpp.document.repository.DppRepository;
import com.dpp.document.repository.ZkpProofRepository;
import com.dpp.document.zkp.RecyclingZkpMapper;
import com.dpp.dpp.entity.DppFieldValue;
import com.dpp.dpp.repository.DppFieldValueRepository;
import com.dpp.dpp.repository.DppQueryRepository;
import com.dpp.dpp.service.SpecFieldAutoFillService;
import com.dpp.notify.entity.Notification;
import com.dpp.notify.entity.NotificationCategory;
import com.dpp.notify.repository.NotificationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * REQ-DOCUMENT: 업로드된 재활용 처리 결과 보고서(Q4_15) 1건을 파서 -> ZKP(recycling-check) ->
 * (선택) 블록체인 순으로 넘긴다. verdicts 3항목(cuOk/liOk/coOk) 전부 실제 규격 판정이라
 * SteelMillCheck과 동일하게 "전부 true인지"로 specPassed를 판단한다(정보성 플래그 없음).
 *
 * 이 문서는 responsible_role='RECYCLER'(V17__seed_requirement_battery.sql) - 제조사도
 * 원자재 공급사도 아닌 실제 재활용 처리시설이 발급하는 문서라, role 테이블에 있었지만
 * 담당 필드가 하나도 없어 초대 옵션에서 빠져 있던 RECYCLER 역할을 처음 실사용한다
 * (InvitationService.ALLOWED_ROLE_CODES에도 추가함).
 */
@Service
public class RecyclingIngestService {

    private static final Logger log = LoggerFactory.getLogger(RecyclingIngestService.class);

    private static final String REGISTRY_CODE = "Q4_15";
    private static final String DOC_TYPE_CODE = "RECYCLING_REPORT";
    private static final DateTimeFormatter TIMESTAMP_FORMAT = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    private final UserAccountRepository userAccountRepository;
    private final DppRepository dppRepository;
    private final DocumentRepository documentRepository;
    private final DocumentLinkRepository documentLinkRepository;
    private final DppQueryRepository dppQueryRepository;
    private final ZkpProofRepository zkpProofRepository;
    private final DppFieldValueRepository dppFieldValueRepository;
    private final BlockchainAnchorRepository blockchainAnchorRepository;
    private final ParserClient parserClient;
    private final SpecFieldAutoFillService specFieldAutoFillService;
    private final ZkpClient zkpClient;
    private final Optional<BlockchainClient> blockchainClient;
    private final DocumentIntegrationProperties properties;
    private final ObjectMapper objectMapper;
    private final NotificationRepository notificationRepository;

    public RecyclingIngestService(UserAccountRepository userAccountRepository,
                                   DppRepository dppRepository,
                                   DocumentRepository documentRepository,
                                   DocumentLinkRepository documentLinkRepository,
                                   DppQueryRepository dppQueryRepository,
                                   ZkpProofRepository zkpProofRepository,
                                   DppFieldValueRepository dppFieldValueRepository,
                                   BlockchainAnchorRepository blockchainAnchorRepository,
                                   ParserClient parserClient,
                                   SpecFieldAutoFillService specFieldAutoFillService,
                                   ZkpClient zkpClient,
                                   Optional<BlockchainClient> blockchainClient,
                                   DocumentIntegrationProperties properties,
                                   ObjectMapper objectMapper,
                                   NotificationRepository notificationRepository) {
        this.userAccountRepository = userAccountRepository;
        this.dppRepository = dppRepository;
        this.documentRepository = documentRepository;
        this.documentLinkRepository = documentLinkRepository;
        this.dppQueryRepository = dppQueryRepository;
        this.zkpProofRepository = zkpProofRepository;
        this.dppFieldValueRepository = dppFieldValueRepository;
        this.blockchainAnchorRepository = blockchainAnchorRepository;
        this.parserClient = parserClient;
        this.specFieldAutoFillService = specFieldAutoFillService;
        this.zkpClient = zkpClient;
        this.blockchainClient = blockchainClient;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public RecyclingUploadResponse ingestRecyclingReport(Long userId, Long dppId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업로드된 파일이 없습니다.");
        }

        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 사용자입니다."));
        Long orgId = user.getOrgId();
        if (orgId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이 계정에 연결된 조직이 없습니다.");
        }
        if (dppId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "dppId가 필요합니다.");
        }
        // 2026-08-19 수정: 예전엔 findFirstByOwnerOrgId로 "이 조직의 첫 번째 DPP"에 항상
        // 붙였다 - 그래서 새 DPP를 새로 만들어도 업로드는 계속 옛날 DPP로 가고, 그 DPP에
        // 이미 있는 문서와 content_hash가 겹치면 실제로는 다른 DPP에 올리는 건데도
        // ux_document_dedup 제약에 걸려 "이미 업로드된 파일입니다"가 났다. 이제 dppId를
        // 명시적으로 받아서 그 DPP가 실제로 이 조직 소유인지까지 확인한다.
        Dpp dpp = dppRepository.findByDppIdAndOwnerOrgId(dppId, orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "지정한 DPP를 찾을 수 없거나 이 조직 소유가 아닙니다. (dppId=" + dppId + ")"));

        Map<String, Object> parsed;
        try {
            parsed = parserClient.parse(file, REGISTRY_CODE, dpp.getDomain());
        } catch (RestClientException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "문서 파서 서비스 호출에 실패했습니다: " + e.getMessage(), e);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "업로드 파일을 읽지 못했습니다.", e);
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> recyclingResultValues = (Map<String, Object>) parsed.get("recycling_result_values");
        String textSha256 = (String) parsed.get("text_sha256");
        if (textSha256 == null) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "파서가 문서 해시를 계산하지 못했습니다.");
        }

        documentRepository.findByOwnerTypeAndOwnerIdAndDocTypeCodeAndContentHash(
                        "DPP", dpp.getDppId(), DOC_TYPE_CODE, textSha256)
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "이미 업로드된 파일입니다. (documentId=" + existing.getDocumentId()
                                    + ", 검토상태=" + existing.getReviewStatus() + ")");
                });

        RecyclingZkpMapper.RecyclingZkpInput zkpInput;
        try {
            zkpInput = RecyclingZkpMapper.build(recyclingResultValues);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "재활용 처리 결과 보고서 필수 항목을 문서에서 읽지 못했습니다: " + e.getMessage(), e);
        }

        String storedFileName = UUID.randomUUID() + ".pdf";
        Path uploadDir = Path.of(properties.getUploadDir());
        Path storedPath = uploadDir.resolve(storedFileName);
        try {
            Files.createDirectories(uploadDir);
            Files.write(storedPath, file.getBytes());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "업로드 파일 저장에 실패했습니다.", e);
        }

        Document document = new Document();
        document.setDocTypeCode(DOC_TYPE_CODE);
        document.setOwnerType("DPP");
        document.setOwnerId(dpp.getDppId());
        document.setSubmittedByOrg(orgId);
        document.setFileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : storedFileName);
        document.setFileUri(storedPath.toString());
        document.setContentHash(textSha256);
        document.setMimeType(file.getContentType());
        document.setFileSize(file.getSize());
        document.setParsedAt(OffsetDateTime.now());
        document.setCreatedBy(userId);
        document = documentRepository.save(document);

        String documentAnchorTxId = anchorDocumentHash(document, orgId);

        Map<String, Object> zkpResult;
        try {
            zkpResult = zkpClient.proveRecyclingCheck(
                    zkpInput.cuThresholdX10(), zkpInput.liThresholdX10(), zkpInput.coThresholdX10(),
                    zkpInput.cuX10(), zkpInput.liDerivedX10(), zkpInput.coDerivedX10());
        } catch (RestClientException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "ZKP 증명 서비스 호출에 실패했습니다: " + e.getMessage(), e);
        }
        boolean cryptoVerified = Boolean.TRUE.equals(zkpResult.get("verified"));
        if (!cryptoVerified) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "ZKP 증명 생성에 실패했습니다 (증명 검증 실패).");
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> verdicts = (Map<String, Object>) zkpResult.get("verdicts");
        boolean specPassed = verdicts != null && !verdicts.isEmpty()
                && verdicts.values().stream().allMatch(v -> Boolean.TRUE.equals(v));
        Object proofData = zkpResult.get("proof");

        if (!specPassed) {
            notifySpecFailure(orgId, document, verdicts);
        }

        // claim_type은 zkp_proof CHECK 제약을 지켜야 한다(BatteryCarbonIngestService와 동일한
        // 이유) - 물질회수율 판정이라 'RECYCLED_RATE'.
        ZkpProof zkpProof = new ZkpProof();
        zkpProof.setDppId(dpp.getDppId());
        zkpProof.setDocumentId(document.getDocumentId());
        zkpProof.setClaimType("RECYCLED_RATE");
        zkpProof.setCircuitName("recycling-check");
        zkpProof.setStatus(specPassed ? "VERIFIED" : "REJECTED");
        zkpProof.setVerifiedAt(OffsetDateTime.now());
        String proofDataJson;
        String publicSignalsJson;
        try {
            proofDataJson = objectMapper.writeValueAsString(proofData);
            publicSignalsJson = objectMapper.writeValueAsString(Map.of(
                    "cuThresholdX10", zkpInput.cuThresholdX10(),
                    "liThresholdX10", zkpInput.liThresholdX10(),
                    "coThresholdX10", zkpInput.coThresholdX10(),
                    "verdicts", verdicts
            ));
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "증명 결과 직렬화에 실패했습니다.", e);
        }
        zkpProof.setProofData(proofDataJson);
        zkpProof.setPublicSignals(publicSignalsJson);
        zkpProof = zkpProofRepository.save(zkpProof);

        String zkpAnchorTxId = anchorZkpVerification(document, zkpProof, publicSignalsJson, specPassed, orgId);

        document.setReviewStatus(specPassed ? "APPROVED" : "REJECTED");
        documentRepository.save(document);

        DocumentLink link = new DocumentLink();
        link.setDocumentId(document.getDocumentId());
        link.setDppId(dpp.getDppId());
        link.setLinkType("DIRECT");
        documentLinkRepository.save(link);

        // 물질회수율/종합재활용효율은 이 문서가 유일한 출처라 매 업로드마다 최신 값으로
        // 덮어쓴다(BatteryCarbonIngestService와 동일한 원칙).
        setFieldValue(dpp.getDppId(), orgId, userId, "RECYCLED_COPPER_RECOVERY_RATE", String.valueOf(zkpInput.cu()));
        setFieldValue(dpp.getDppId(), orgId, userId, "RECYCLED_LITHIUM_RECOVERY_RATE", String.valueOf(zkpInput.liDerived()));
        setFieldValue(dpp.getDppId(), orgId, userId, "RECYCLED_COBALT_RECOVERY_RATE", String.valueOf(zkpInput.coDerived()));
        if (zkpInput.overallRecyclingRatePercent() != null) {
            setFieldValue(dpp.getDppId(), orgId, userId, "OVERALL_RECYCLING_EFFICIENCY", String.valueOf(zkpInput.overallRecyclingRatePercent()));
        }

        // 라벨 사전 기반 일괄 채움 - 위 개별 매핑(ZKP 입력값 그대로)과 달리 문서 본문의
        // 라벨에서 뽑는다. 둘 다 "비어 있을 때만" 쓰므로 먼저 채운 쪽이 이긴다.
        //
        // 위 setFieldValue들과 달리 specPassed 게이트를 건다. 저쪽은 회로가 이미 검증한
        // 입력값이라 판정 결과와 무관하게 "그 문서가 주장한 값"으로 남길 의미가 있지만,
        // 이쪽은 문서 본문 아무 데서나 라벨로 긁어오는 경로다. 반려한 문서는 안 믿기로
        // 한 문서인데 거기서 추가 데이터를 더 꺼내오는 건 앞뒤가 안 맞는다.
        if (specPassed) {
            applySpecFields(dpp, orgId, userId, parsed, document.getDocumentId());
        }

        dppQueryRepository.recalcCompleteness(dpp.getDppId());

        return new RecyclingUploadResponse(
                document.getDocumentId(),
                zkpProof.getProofId(),
                dpp.getDppId(),
                dpp.getPublicUuid(),
                cryptoVerified,
                specPassed,
                verdicts,
                zkpInput.cu(),
                zkpInput.liDerived(),
                zkpInput.coDerived(),
                zkpInput.overallRecyclingRatePercent(),
                documentAnchorTxId,
                zkpAnchorTxId
        );
    }

    private void setFieldValue(Long dppId, Long orgId, Long userId, String fieldCode, String value) {
        DppFieldValue row = dppFieldValueRepository.findByDppIdAndFieldCode(dppId, fieldCode)
                .orElseGet(() -> {
                    DppFieldValue v = new DppFieldValue();
                    v.setDppId(dppId);
                    v.setFieldCode(fieldCode);
                    return v;
                });
        row.setValueText(value);
        row.setSubmittedByOrg(orgId);
        row.setSubmittedByUser(userId);
        row.setUpdatedAt(OffsetDateTime.now());
        dppFieldValueRepository.save(row);
    }

    private void notifySpecFailure(Long orgId, Document document, Map<String, Object> verdicts) {
        List<String> failedKeys = verdicts == null ? List.of() : verdicts.entrySet().stream()
                .filter(e -> !Boolean.TRUE.equals(e.getValue()))
                .map(Map.Entry::getKey)
                .toList();
        String body = document.getFileName() + " - 물질회수율 미달 항목: "
                + (failedKeys.isEmpty() ? "확인 필요" : String.join(", ", failedKeys));
        for (UserAccount recipient : userAccountRepository.findByOrgId(orgId)) {
            Notification notification = new Notification();
            notification.setRecipientUserId(recipient.getUserId());
            notification.setCategory(NotificationCategory.CERT);
            notification.setTitle("재활용 처리 결과 검증 실패");
            notification.setBody(body);
            notificationRepository.save(notification);
        }
    }

    private String anchorDocumentHash(Document document, Long orgId) {
        if (blockchainClient.isEmpty()) {
            log.info("blockchain.enabled=false - documentId={} 해시 앵커링 생략", document.getDocumentId());
            return null;
        }
        BlockchainAnchor anchor = new BlockchainAnchor();
        anchor.setTargetType("DOCUMENT");
        anchor.setTargetId(document.getDocumentId());
        anchor.setContentHash(document.getContentHash());
        anchor.setChannelName("dppchannel");
        anchor.setChaincode("dpp-ledger-chaincode");
        try {
            BlockchainClient.ChainResult result = blockchainClient.get().recordDocumentHash(
                    document.getDocumentId().toString(),
                    document.getDocTypeCode(),
                    document.getContentHash(),
                    orgId.toString(),
                    OffsetDateTime.now().format(TIMESTAMP_FORMAT));
            anchor.setTxId(result.txId());
            anchor.setStatus("CONFIRMED");
            anchor.setAnchoredAt(OffsetDateTime.now());
            blockchainAnchorRepository.save(anchor);
            return result.txId();
        } catch (Exception e) {
            log.warn("documentId={} 블록체인 해시 앵커링 실패: {}", document.getDocumentId(), e.getMessage(), e);
            anchor.setStatus("FAILED");
            anchor.setErrorMessage(truncate(e.getMessage(), 500));
            blockchainAnchorRepository.save(anchor);
            return null;
        }
    }

    private String anchorZkpVerification(Document document, ZkpProof zkpProof, String publicSignalsJson,
                                          boolean verified, Long orgId) {
        if (blockchainClient.isEmpty()) {
            log.info("blockchain.enabled=false - proofId={} 검증결과 앵커링 생략", zkpProof.getProofId());
            return null;
        }
        BlockchainAnchor anchor = new BlockchainAnchor();
        anchor.setTargetType("EVENT");
        anchor.setTargetId(zkpProof.getProofId());
        anchor.setContentHash(sha256Hex(zkpProof.getProofData()));
        anchor.setChannelName("dppchannel");
        anchor.setChaincode("dpp-ledger-chaincode");
        try {
            BlockchainClient.ChainResult result = blockchainClient.get().recordZkpVerification(
                    document.getDocumentId().toString(),
                    zkpProof.getProofId().toString(),
                    publicSignalsJson,
                    verified,
                    orgId.toString(),
                    OffsetDateTime.now().format(TIMESTAMP_FORMAT));
            anchor.setTxId(result.txId());
            anchor.setStatus("CONFIRMED");
            anchor.setAnchoredAt(OffsetDateTime.now());
            blockchainAnchorRepository.save(anchor);
            return result.txId();
        } catch (Exception e) {
            log.warn("proofId={} 블록체인 검증결과 앵커링 실패: {}", zkpProof.getProofId(), e.getMessage(), e);
            anchor.setStatus("FAILED");
            anchor.setErrorMessage(truncate(e.getMessage(), 500));
            blockchainAnchorRepository.save(anchor);
            return null;
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return null;
        }
        return s.length() <= max ? s : s.substring(0, max);
    }

    private static String sha256Hex(String text) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest((text == null ? "" : text).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 알고리즘을 사용할 수 없습니다.", e);
        }
    }

    /**
     * 라벨 사전 기반 일괄 채움(parser/spec_extractor.py -> spec_fields).
     * requirement_field.data_source='PARSER'인 필드를 문서에서 뽑아 field_code 그대로
     * 돌려주므로 문서 유형별 분기 없이 그대로 넘긴다. 이 서비스가 원래부터 채우던 필드와
     * 겹쳐도 양쪽 다 "비어 있을 때만" 쓰기 때문에 먼저 채운 쪽이 이긴다.
     *
     * 규격 판정에 실패한 문서(specPassed=false)에서는 호출하지 않는다 - "증명에 실패했으면
     * 데이터 파싱 안되게"(2026-08-18 피드백)라는 기존 원칙 그대로다.
     */
    @SuppressWarnings("unchecked")
    private void applySpecFields(Dpp dpp, Long orgId, Long userId, Map<String, Object> parsed, Long documentId) {
        Object raw = parsed.get("spec_fields");
        if (!(raw instanceof Map)) {
            return;
        }
        specFieldAutoFillService.apply(dpp.getDppId(), dpp.getDomain(), orgId, userId,
                (Map<String, Object>) raw, documentId);
    }

}
