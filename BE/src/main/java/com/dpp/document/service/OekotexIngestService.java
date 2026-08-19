package com.dpp.document.service;

import com.dpp.audit.service.AuditLogService;
import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.blockchain.client.BlockchainClient;
import com.dpp.blockchain.entity.BlockchainAnchor;
import com.dpp.blockchain.repository.BlockchainAnchorRepository;
import com.dpp.document.client.ParserClient;
import com.dpp.document.client.ZkpClient;
import com.dpp.document.config.DocumentIntegrationProperties;
import com.dpp.document.dto.OekotexUploadResponse;
import com.dpp.document.entity.Document;
import com.dpp.document.entity.DocumentLink;
import com.dpp.document.entity.Dpp;
import com.dpp.document.entity.ZkpProof;
import com.dpp.document.repository.DocumentLinkRepository;
import com.dpp.document.repository.DocumentRepository;
import com.dpp.document.repository.DppRepository;
import com.dpp.document.repository.ZkpProofRepository;
import com.dpp.document.zkp.OekotexZkpMapper;
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
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * REQ-DOCUMENT: 업로드된 OEKO-TEX 라벨(Q3_10) 1건을 파서 -> ZKP(oekotex-check) -> (선택)
 * 블록체인 순으로 넘긴다. CareLabelIngestService와 완전히 같은 구조 - 실측값이 pH 하나뿐이라
 * material_composition 저장 단계가 없다는 점만 다르다.
 *
 * 이 문서는 responsible_role='TEST_LAB'(V16__seed_requirement_textile.sql) - 실제로는
 * OEKO-TEX 인증기관이 발급하는 문서라 제3자 시험·인증기관 범주로 분류했다(V14__partner_role_
 * split.sql과 동일한 기준). 그래서 DPP 소유 조직(제조사)이 아니라 초대받은 TEST_LAB 참여
 * 협력사가 이 엔드포인트를 호출하는 게 정상 시나리오다 - 그런데 이 서비스는 Mill Sheet/CBAM과
 * 마찬가지로 "이 계정 조직의 첫 번째 DPP"에 자동으로 붙이는 임시 패턴을 그대로 따른다
 * (product/DPP 선택 화면이 아직 없어서, dppRepository.findFirstByOwnerOrgId 자체가 소유
 * 조직 기준이라 - 참여 협력사가 이 엔드포인트를 실제로 호출하려면 향후 dppId를 직접 받는
 * 방식으로 확장이 필요하다. 지금은 소유 조직이 스스로 발급받아 대신 업로드하는 경우도
 * 흔하다고 보고 그대로 둔다).
 */
@Service
public class OekotexIngestService {

    private static final Logger log = LoggerFactory.getLogger(OekotexIngestService.class);

    private static final String REGISTRY_CODE = "Q3_10";
    private static final String DOC_TYPE_CODE = "OEKOTEX_LABEL";
    private static final String CERT_NO_FIELD_CODE = "OEKOTEX_CERT_NO";
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
    private final AuditLogService auditLogService;

    public OekotexIngestService(UserAccountRepository userAccountRepository,
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
                                 NotificationRepository notificationRepository,
                                 AuditLogService auditLogService) {
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
        this.auditLogService = auditLogService;
    }

    @Transactional
    public OekotexUploadResponse ingestOekotexLabel(Long userId, MultipartFile file) {
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
        Map<String, Object> oekotexValues = (Map<String, Object>) parsed.get("oekotex_values");
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

        OekotexZkpMapper.OekotexZkpInput zkpInput;
        try {
            zkpInput = OekotexZkpMapper.build(oekotexValues);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "OEKO-TEX 라벨 필수 항목을 문서에서 읽지 못했습니다: " + e.getMessage(), e);
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
            zkpResult = zkpClient.proveOekotexCheck(zkpInput.lowX10(), zkpInput.highX10(), zkpInput.phX10());
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
            notifySpecFailure(orgId, document, zkpInput.ph());
        }

        ZkpProof zkpProof = new ZkpProof();
        zkpProof.setDppId(dpp.getDppId());
        zkpProof.setDocumentId(document.getDocumentId());
        zkpProof.setClaimType("CERT_VALID");
        zkpProof.setCircuitName("oekotex-check");
        zkpProof.setStatus(specPassed ? "VERIFIED" : "REJECTED");
        zkpProof.setVerifiedAt(OffsetDateTime.now());
        String proofDataJson;
        String publicSignalsJson;
        try {
            proofDataJson = objectMapper.writeValueAsString(proofData);
            publicSignalsJson = objectMapper.writeValueAsString(Map.of(
                    "lowX10", zkpInput.lowX10(),
                    "highX10", zkpInput.highX10(),
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

        // 인증번호 자동 채움 - extractor.py의 문서번호 추출 패턴("인증(서)? 번호 ..." 포함)이
        // 모든 문서 유형에 공통으로 시도되는 document_id를 그대로 쓴다. 이미 값이 있으면(수기
        // 입력 포함) 덮어쓰지 않는다 - DocumentSlotService.fillIfEmpty와 동일한 원칙.
        String documentId = (String) parsed.get("document_id");
        if (documentId != null && !documentId.isBlank()) {
            fillCertNoIfEmpty(dpp.getDppId(), orgId, userId, documentId);
        }

        dppQueryRepository.recalcCompleteness(dpp.getDppId());

        auditLogService.record(userId, "CREATE", "DOCUMENT", document.getDocumentId(),
                "OEKOTEX_LABEL (DOC-" + document.getDocumentId() + ")", specPassed ? "성공" : "검증 실패", documentAnchorTxId);

        return new OekotexUploadResponse(
                document.getDocumentId(),
                zkpProof.getProofId(),
                dpp.getDppId(),
                dpp.getPublicUuid(),
                cryptoVerified,
                specPassed,
                zkpInput.ph(),
                documentAnchorTxId,
                zkpAnchorTxId
        );
    }

    private void fillCertNoIfEmpty(Long dppId, Long orgId, Long userId, String certNo) {
        Optional<DppFieldValue> existing = dppFieldValueRepository.findByDppIdAndFieldCode(dppId, CERT_NO_FIELD_CODE);
        if (existing.isPresent() && existing.get().getValueText() != null && !existing.get().getValueText().isBlank()) {
            return;
        }
        DppFieldValue row = existing.orElseGet(() -> {
            DppFieldValue v = new DppFieldValue();
            v.setDppId(dppId);
            v.setFieldCode(CERT_NO_FIELD_CODE);
            return v;
        });
        row.setValueText(certNo);
        row.setSubmittedByOrg(orgId);
        row.setSubmittedByUser(userId);
        row.setUpdatedAt(OffsetDateTime.now());
        dppFieldValueRepository.save(row);
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

    private void notifySpecFailure(Long orgId, Document document, double ph) {
        String body = document.getFileName() + " - pH " + ph + " (기준 4.0~7.5 범위 초과)";
        for (UserAccount recipient : userAccountRepository.findByOrgId(orgId)) {
            Notification notification = new Notification();
            notification.setRecipientUserId(recipient.getUserId());
            notification.setCategory(NotificationCategory.CERT);
            notification.setTitle("OEKO-TEX 라벨 검증 실패");
            notification.setBody(body);
            notificationRepository.save(notification);
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
