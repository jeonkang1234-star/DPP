package com.dpp.document.service;

import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.blockchain.client.BlockchainClient;
import com.dpp.blockchain.entity.BlockchainAnchor;
import com.dpp.blockchain.repository.BlockchainAnchorRepository;
import com.dpp.document.client.ParserClient;
import com.dpp.document.client.ZkpClient;
import com.dpp.document.config.DocumentIntegrationProperties;
import com.dpp.document.dto.CareLabelUploadResponse;
import com.dpp.document.entity.Document;
import com.dpp.document.entity.DocumentLink;
import com.dpp.document.entity.Dpp;
import com.dpp.document.entity.MaterialComposition;
import com.dpp.document.entity.ZkpProof;
import com.dpp.document.repository.DocumentLinkRepository;
import com.dpp.document.repository.DocumentRepository;
import com.dpp.document.repository.DppRepository;
import com.dpp.document.repository.MaterialCompositionRepository;
import com.dpp.document.repository.ZkpProofRepository;
import com.dpp.document.zkp.FiberZkpMapper;
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
import java.math.BigDecimal;
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
 * REQ-DOCUMENT: 업로드된 섬유 케어라벨(Q1_04) 1건을 파서 -> ZKP(fiber-sum-check) -> (선택)
 * 블록체인 순으로 넘겨 document/zkp_proof/blockchain_anchor 행을 만드는 오케스트레이션.
 * com.dpp.document.service.DocumentIngestService(Mill Sheet)와 완전히 같은 구조 -
 * 회로 출력이 항목별 Map이 아니라 단일 Bool(혼용률 합계 판정)이라는 점만 다르다.
 */
@Service
public class CareLabelIngestService {

    private static final Logger log = LoggerFactory.getLogger(CareLabelIngestService.class);

    private static final String REGISTRY_CODE = "Q1_04";
    private static final String DOC_TYPE_CODE = "CARE_LABEL";
    private static final DateTimeFormatter TIMESTAMP_FORMAT = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    private final UserAccountRepository userAccountRepository;
    private final DppRepository dppRepository;
    private final DocumentRepository documentRepository;
    private final DocumentLinkRepository documentLinkRepository;
    private final DppQueryRepository dppQueryRepository;
    private final ZkpProofRepository zkpProofRepository;
    private final BlockchainAnchorRepository blockchainAnchorRepository;
    private final MaterialCompositionRepository materialCompositionRepository;
    private final DppFieldValueRepository dppFieldValueRepository;
    private final ParserClient parserClient;
    private final ZkpClient zkpClient;
    private final Optional<BlockchainClient> blockchainClient;
    private final DocumentIntegrationProperties properties;
    private final ObjectMapper objectMapper;
    private final NotificationRepository notificationRepository;

    public CareLabelIngestService(UserAccountRepository userAccountRepository,
                                   DppRepository dppRepository,
                                   DocumentRepository documentRepository,
                                   DocumentLinkRepository documentLinkRepository,
                                   DppQueryRepository dppQueryRepository,
                                   ZkpProofRepository zkpProofRepository,
                                   BlockchainAnchorRepository blockchainAnchorRepository,
                                   MaterialCompositionRepository materialCompositionRepository,
                                   DppFieldValueRepository dppFieldValueRepository,
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
        this.blockchainAnchorRepository = blockchainAnchorRepository;
        this.materialCompositionRepository = materialCompositionRepository;
        this.dppFieldValueRepository = dppFieldValueRepository;
        this.parserClient = parserClient;
        this.zkpClient = zkpClient;
        this.blockchainClient = blockchainClient;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public CareLabelUploadResponse ingestCareLabel(Long userId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업로드된 파일이 없습니다.");
        }

        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 사용자입니다."));
        Long orgId = user.getOrgId();
        if (orgId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이 계정에 연결된 조직(제조사)이 없습니다.");
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
        List<Object> fiberComposition = (List<Object>) parsed.get("fiber_composition");
        String textSha256 = (String) parsed.get("text_sha256");
        if (textSha256 == null) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "파서가 문서 해시를 계산하지 못했습니다.");
        }

        // 중복 업로드 방지 - DocumentIngestService(Mill Sheet)와 동일한 패턴.
        documentRepository.findByOwnerTypeAndOwnerIdAndDocTypeCodeAndContentHash(
                        "DPP", dpp.getDppId(), DOC_TYPE_CODE, textSha256)
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "이미 업로드된 파일입니다. (documentId=" + existing.getDocumentId()
                                    + ", 검토상태=" + existing.getReviewStatus() + ")");
                });

        FiberZkpMapper.FiberZkpInput zkpInput;
        try {
            zkpInput = FiberZkpMapper.build(fiberComposition);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "섬유 케어라벨 필수 항목을 문서에서 읽지 못했습니다: " + e.getMessage(), e);
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

        // 섬유 혼용률을 material_composition(entry_kind='MATERIAL')에 자동 저장 -
        // DocumentIngestService.persistChemicalComposition(CHEM_ELEMENT)과 같은 패턴.
        persistFiberComposition(dpp.getDppId(), document.getDocumentId(), fiberComposition);

        // 2026-08-18 강 요청("섬유도 파싱할 수 있는 데이터 다 파싱") - "Made in KR ·
        // PL-TEE-180 / LOT-2026-0201-A · GTIN ..."에서 로트 번호를 FABRIC_LOT_NO에 채우고,
        // 섬유 혼용률 중 이름에 "재생"이 포함된 항목들의 비율 합을 RECYCLED_FIBER_RATE에
        // 채운다(예: "재생 폴리아미드 15%" -> 15). 둘 다 이미 값이 있으면(수기 입력 포함)
        // 덮어쓰지 않는다.
        String lotNo = (String) parsed.get("lot_no");
        if (lotNo != null && !lotNo.isBlank()) {
            fillIfEmpty(dpp.getDppId(), orgId, userId, "FABRIC_LOT_NO", lotNo.trim());
        }
        Double recycledFiberPercent = sumRecycledFiberPercent(fiberComposition);
        if (recycledFiberPercent != null) {
            fillIfEmpty(dpp.getDppId(), orgId, userId, "RECYCLED_FIBER_RATE", String.valueOf(recycledFiberPercent));
        }

        String documentAnchorTxId = anchorDocumentHash(document, orgId);

        Map<String, Object> zkpResult;
        try {
            zkpResult = zkpClient.proveFiberSumCheck(zkpInput.targetX10(), zkpInput.toleranceX10(),
                    zkpInput.p1(), zkpInput.p2(), zkpInput.p3(), zkpInput.p4());
        } catch (RestClientException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "ZKP 증명 서비스 호출에 실패했습니다: " + e.getMessage(), e);
        }
        boolean cryptoVerified = Boolean.TRUE.equals(zkpResult.get("verified"));
        if (!cryptoVerified) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "ZKP 증명 생성에 실패했습니다 (증명 검증 실패).");
        }
        boolean specPassed = Boolean.TRUE.equals(zkpResult.get("passed"));
        Object proofData = zkpResult.get("proof");

        if (!specPassed) {
            notifySpecFailure(orgId, document, zkpInput.totalPercent());
        }

        ZkpProof zkpProof = new ZkpProof();
        zkpProof.setDppId(dpp.getDppId());
        zkpProof.setDocumentId(document.getDocumentId());
        zkpProof.setClaimType("CERT_VALID");
        zkpProof.setCircuitName("fiber-sum-check");
        zkpProof.setStatus(specPassed ? "VERIFIED" : "REJECTED");
        zkpProof.setVerifiedAt(OffsetDateTime.now());
        String proofDataJson;
        String publicSignalsJson;
        try {
            proofDataJson = objectMapper.writeValueAsString(proofData);
            publicSignalsJson = objectMapper.writeValueAsString(Map.of(
                    "targetX10", zkpInput.targetX10(),
                    "toleranceX10", zkpInput.toleranceX10(),
                    "specPassed", specPassed
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

        dppQueryRepository.recalcCompleteness(dpp.getDppId());

        return new CareLabelUploadResponse(
                document.getDocumentId(),
                zkpProof.getProofId(),
                dpp.getDppId(),
                dpp.getPublicUuid(),
                cryptoVerified,
                specPassed,
                zkpInput.totalPercent(),
                documentAnchorTxId,
                zkpAnchorTxId
        );
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

    private void notifySpecFailure(Long orgId, Document document, double totalPercent) {
        String body = document.getFileName() + " - 섬유 혼용률 합계 " + totalPercent + "% (기준 100% ±0.5%p 초과)";
        for (UserAccount recipient : userAccountRepository.findByOrgId(orgId)) {
            Notification notification = new Notification();
            notification.setRecipientUserId(recipient.getUserId());
            notification.setCategory(NotificationCategory.CERT);
            notification.setTitle("섬유 케어라벨 검증 실패");
            notification.setBody(body);
            notificationRepository.save(notification);
        }
    }

    /**
     * fiber_composition([{fiber, percent}, ...]) 중 fiber 이름에 "재생"이 들어간 항목들의
     * percent 합계를 재생 섬유 함유율로 본다 - GRS 인증서(영문 자유서식)보다 케어라벨의
     * 구조화된 섬유 조성표가 더 신뢰도 높은 출처라 이쪽을 우선한다. "재생" 섬유가 하나도
     * 없으면(순수 원사 제품) null - 있는데 0%라고 잘못 채우지 않는다.
     */
    @SuppressWarnings("unchecked")
    private Double sumRecycledFiberPercent(List<Object> fiberComposition) {
        if (fiberComposition == null) {
            return null;
        }
        double sum = 0;
        boolean found = false;
        for (Object item : fiberComposition) {
            if (!(item instanceof Map<?, ?> map)) {
                continue;
            }
            Map<String, Object> data = (Map<String, Object>) map;
            Object fiber = data.get("fiber");
            Object percent = data.get("percent");
            if (fiber != null && String.valueOf(fiber).contains("재생") && percent instanceof Number n) {
                sum += n.doubleValue();
                found = true;
            }
        }
        return found ? sum : null;
    }

    /** DocumentSlotService.fillIfEmpty와 동일한 "이미 값 있으면 안 덮어씀" 정책. */
    private void fillIfEmpty(Long dppId, Long orgId, Long userId, String fieldCode, String value) {
        Optional<DppFieldValue> existing = dppFieldValueRepository.findByDppIdAndFieldCode(dppId, fieldCode);
        if (existing.isPresent() && existing.get().getValueText() != null && !existing.get().getValueText().isBlank()) {
            return;
        }
        DppFieldValue row = existing.orElseGet(() -> {
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

    @SuppressWarnings("unchecked")
    private void persistFiberComposition(Long dppId, Long documentId, List<Object> fiberComposition) {
        if (fiberComposition == null || fiberComposition.isEmpty()) {
            return;
        }
        materialCompositionRepository.deleteAll(
                materialCompositionRepository.findByDppIdAndEntryKind(dppId, "MATERIAL"));
        for (Object item : fiberComposition) {
            if (!(item instanceof Map<?, ?> map)) {
                continue;
            }
            Map<String, Object> data = (Map<String, Object>) map;
            Object fiber = data.get("fiber");
            Object percent = data.get("percent");
            if (fiber == null || !(percent instanceof Number n)) {
                continue;
            }
            MaterialComposition row = new MaterialComposition();
            row.setDppId(dppId);
            row.setEntryKind("MATERIAL");
            row.setMaterialName(String.valueOf(fiber));
            row.setContentRate(BigDecimal.valueOf(n.doubleValue()));
            row.setContentUnit("PERCENT");
            row.setSourceDocumentId(documentId);
            materialCompositionRepository.save(row);
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
