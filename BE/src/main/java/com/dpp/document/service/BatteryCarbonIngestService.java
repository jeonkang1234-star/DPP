package com.dpp.document.service;

import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.blockchain.client.BlockchainClient;
import com.dpp.blockchain.entity.BlockchainAnchor;
import com.dpp.blockchain.repository.BlockchainAnchorRepository;
import com.dpp.document.client.ParserClient;
import com.dpp.document.client.ZkpClient;
import com.dpp.document.config.DocumentIntegrationProperties;
import com.dpp.document.dto.BatteryCarbonUploadResponse;
import com.dpp.document.entity.Document;
import com.dpp.document.entity.DocumentLink;
import com.dpp.document.entity.Dpp;
import com.dpp.document.entity.ZkpProof;
import com.dpp.document.repository.DocumentLinkRepository;
import com.dpp.document.repository.DocumentRepository;
import com.dpp.document.repository.DppRepository;
import com.dpp.document.repository.ZkpProofRepository;
import com.dpp.document.zkp.BatteryZkpMapper;
import com.dpp.dpp.entity.DppFieldValue;
import com.dpp.dpp.repository.DppFieldValueRepository;
import com.dpp.dpp.repository.DppQueryRepository;
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
 * REQ-DOCUMENT: 업로드된 배터리 탄소발자국 선언(Q2_07) 1건을 파서 -> ZKP(battery-check) ->
 * (선택) 블록체인 순으로 넘긴다. DocumentIngestService(Mill Sheet)와 같은 다항목 verdicts
 * 구조 - 다만 capacityDeclarationFlag는 CbamIngestService의 obligated와 같은 정보성
 * 플래그라 specPassed 판정에서 제외한다(재생원료 Co/Li/Ni/Pb 4항목만으로 판정).
 *
 * 이 문서는 responsible_role='TEST_LAB'(V17__seed_requirement_battery.sql) - PCF/LCA·EPD와
 * 같은 환경성적 문서 범주라 V14__partner_role_split.sql과 같은 기준을 적용했다.
 */
@Service
public class BatteryCarbonIngestService {

    private static final Logger log = LoggerFactory.getLogger(BatteryCarbonIngestService.class);

    private static final String REGISTRY_CODE = "Q2_07";
    private static final String DOC_TYPE_CODE = "BATTERY_CARBON_REPORT";
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
    private final ZkpClient zkpClient;
    private final Optional<BlockchainClient> blockchainClient;
    private final DocumentIntegrationProperties properties;
    private final ObjectMapper objectMapper;
    private final NotificationRepository notificationRepository;

    public BatteryCarbonIngestService(UserAccountRepository userAccountRepository,
                                       DppRepository dppRepository,
                                       DocumentRepository documentRepository,
                                       DocumentLinkRepository documentLinkRepository,
                                       DppQueryRepository dppQueryRepository,
                                       ZkpProofRepository zkpProofRepository,
                                       DppFieldValueRepository dppFieldValueRepository,
                                       BlockchainAnchorRepository blockchainAnchorRepository,
                                       ParserClient parserClient,
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
        this.zkpClient = zkpClient;
        this.blockchainClient = blockchainClient;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public BatteryCarbonUploadResponse ingestBatteryCarbonReport(Long userId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업로드된 파일이 없습니다.");
        }

        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 사용자입니다."));
        Long orgId = user.getOrgId();
        if (orgId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이 계정에 연결된 조직이 없습니다.");
        }
        Dpp dpp = dppRepository.findFirstByOwnerOrgId(orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "이 조직에 연결된 DPP가 없습니다. (테스트 시드가 적용됐는지 확인하세요)"));

        Map<String, Object> parsed;
        try {
            parsed = parserClient.parse(file, REGISTRY_CODE);
        } catch (RestClientException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "문서 파서 서비스 호출에 실패했습니다: " + e.getMessage(), e);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "업로드 파일을 읽지 못했습니다.", e);
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> batteryPcfValues = (Map<String, Object>) parsed.get("battery_pcf_values");
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

        BatteryZkpMapper.BatteryZkpInput zkpInput;
        try {
            zkpInput = BatteryZkpMapper.build(batteryPcfValues);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "배터리 탄소발자국 선언 필수 항목을 문서에서 읽지 못했습니다: " + e.getMessage(), e);
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
            zkpResult = zkpClient.proveBatteryCheck(
                    zkpInput.coThresholdX10(), zkpInput.liThresholdX10(), zkpInput.niThresholdX10(),
                    zkpInput.pbThresholdX10(), zkpInput.capacityThresholdX10(),
                    zkpInput.coX10(), zkpInput.liX10(), zkpInput.niX10(), zkpInput.pbX10(), zkpInput.capacityX10());
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
        // capacityDeclarationFlag는 CbamIngestService의 obligated와 같은 정보성 플래그다 -
        // "적합/부적합"이 아니라 "탄소발자국 선언 의무 대상인가"라서 specPassed 판정에서
        // 제외하고 재생원료 4항목(Co/Li/Ni/Pb)만으로 판정한다.
        boolean specPassed = verdicts != null
                && Boolean.TRUE.equals(verdicts.get("coOk"))
                && Boolean.TRUE.equals(verdicts.get("liOk"))
                && Boolean.TRUE.equals(verdicts.get("niOk"))
                && Boolean.TRUE.equals(verdicts.get("pbOkOrExempt"));
        boolean capacityDeclarationRequired = verdicts != null && Boolean.TRUE.equals(verdicts.get("capacityDeclarationFlag"));
        Object proofData = zkpResult.get("proof");

        if (!specPassed) {
            notifySpecFailure(orgId, document, verdicts);
        }

        // claim_type은 zkp_proof CHECK 제약(ORIGIN/CERT_VALID/RECYCLED_RATE/CUSTOMS_FIT/
        // CARBON_LIMIT)을 지켜야 한다 - 재생원료 함유율 판정이라 'RECYCLED_RATE'가 정확히 맞는다.
        ZkpProof zkpProof = new ZkpProof();
        zkpProof.setDppId(dpp.getDppId());
        zkpProof.setDocumentId(document.getDocumentId());
        zkpProof.setClaimType("RECYCLED_RATE");
        zkpProof.setCircuitName("battery-check");
        zkpProof.setStatus(specPassed ? "VERIFIED" : "REJECTED");
        zkpProof.setVerifiedAt(OffsetDateTime.now());
        String proofDataJson;
        String publicSignalsJson;
        try {
            proofDataJson = objectMapper.writeValueAsString(proofData);
            publicSignalsJson = objectMapper.writeValueAsString(Map.of(
                    "coThresholdX10", zkpInput.coThresholdX10(),
                    "liThresholdX10", zkpInput.liThresholdX10(),
                    "niThresholdX10", zkpInput.niThresholdX10(),
                    "pbThresholdX10", zkpInput.pbThresholdX10(),
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

        // 재생원료 함유율/탄소발자국 선언의무 플래그는 이 문서가 유일한 출처라 매 업로드마다
        // 무조건 최신 값으로 덮어쓴다(CbamIngestService의 CBAM_APPLICABLE과 동일한 패턴 -
        // "적용 제외" 재판정 등 재업로드 시 이전 값이 남아있으면 안 됨). 정격용량(RATED_
        // CAPACITY_KWH)은 사용자가 다른 화면에서 수기로도 입력할 수 있는 일반 SPEC 필드라
        // 비어 있을 때만 채운다(OEKOTEX_CERT_NO와 동일한 fillIfEmpty 원칙).
        setFieldValue(dpp.getDppId(), orgId, userId, "RECYCLED_COBALT_RATE", String.valueOf(zkpInput.co()));
        setFieldValue(dpp.getDppId(), orgId, userId, "RECYCLED_LITHIUM_RATE", String.valueOf(zkpInput.li()));
        setFieldValue(dpp.getDppId(), orgId, userId, "RECYCLED_NICKEL_RATE", String.valueOf(zkpInput.ni()));
        setFieldValue(dpp.getDppId(), orgId, userId, "RECYCLED_LEAD_RATE", String.valueOf(zkpInput.pb()));
        setFieldValue(dpp.getDppId(), orgId, userId, "BATTERY_CARBON_DECLARATION_REQUIRED", String.valueOf(capacityDeclarationRequired));
        fillIfEmpty(dpp.getDppId(), orgId, userId, "RATED_CAPACITY_KWH", String.valueOf(zkpInput.capacityKwh()));

        dppQueryRepository.recalcCompleteness(dpp.getDppId());

        return new BatteryCarbonUploadResponse(
                document.getDocumentId(),
                zkpProof.getProofId(),
                dpp.getDppId(),
                dpp.getPublicUuid(),
                cryptoVerified,
                specPassed,
                verdicts,
                zkpInput.co(),
                zkpInput.li(),
                zkpInput.ni(),
                zkpInput.pb(),
                zkpInput.capacityKwh(),
                capacityDeclarationRequired,
                documentAnchorTxId,
                zkpAnchorTxId
        );
    }

    /** 값이 있든 없든 항상 최신 파싱 결과로 덮어쓴다 - CbamIngestService의 CBAM_APPLICABLE과 동일. */
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

    /** 이미 값이 있으면(수기 입력 포함) 덮어쓰지 않는다 - OekotexIngestService.fillCertNoIfEmpty와 동일. */
    private void fillIfEmpty(Long dppId, Long orgId, Long userId, String fieldCode, String value) {
        Optional<DppFieldValue> existing = dppFieldValueRepository.findByDppIdAndFieldCode(dppId, fieldCode);
        if (existing.isPresent() && existing.get().getValueText() != null && !existing.get().getValueText().isBlank()) {
            return;
        }
        setFieldValue(dppId, orgId, userId, fieldCode, value);
    }

    private void notifySpecFailure(Long orgId, Document document, Map<String, Object> verdicts) {
        List<String> failedKeys = verdicts == null ? List.of() : verdicts.entrySet().stream()
                .filter(e -> !"capacityDeclarationFlag".equals(e.getKey()))
                .filter(e -> !Boolean.TRUE.equals(e.getValue()))
                .map(Map.Entry::getKey)
                .toList();
        String body = document.getFileName() + " - 재생원료 함유율 미달 항목: "
                + (failedKeys.isEmpty() ? "확인 필요" : String.join(", ", failedKeys));
        for (UserAccount recipient : userAccountRepository.findByOrgId(orgId)) {
            Notification notification = new Notification();
            notification.setRecipientUserId(recipient.getUserId());
            notification.setCategory(NotificationCategory.CERT);
            notification.setTitle("배터리 탄소발자국 선언 검증 실패");
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
}
