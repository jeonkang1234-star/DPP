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
    private final SpecFieldAutoFillService specFieldAutoFillService;
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
                                 SpecFieldAutoFillService specFieldAutoFillService,
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
        this.specFieldAutoFillService = specFieldAutoFillService;
        this.zkpClient = zkpClient;
        this.blockchainClient = blockchainClient;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.notificationRepository = notificationRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public OekotexUploadResponse ingestOekotexLabel(Long userId, Long dppId, MultipartFile file) {
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

        // 라벨 사전 기반 일괄 채움 - 규격 판정(pH 4.0~7.5)을 통과한 문서에서만 값을 가져온다.
        if (specPassed) {
            applySpecFields(dpp, orgId, userId, parsed, document.getDocumentId(), specPassed);
        }

        dppQueryRepository.recalcCompleteness(dpp.getDppId());

        auditLogService.record(userId, "CREATE", "DOCUMENT", document.getDocumentId(),
                "OEKOTEX_LABEL (DOC-" + document.getDocumentId() + ")", specPassed ? "성공" : "검증 실패", documentAnchorTxId);

        // ZKP 검증도 감사 로그에 남긴다 - EU 시장감시 감사 로그는 DPP 등록과 ZKP 검증만
        // 보여주므로(AuditLogRepository.findRecent의 target_type 필터, 2026-08-22 강 요청),
        // 여기서 남기지 않으면 "영업비밀 값을 공개하지 않고 규정 충족을 증명했다"는 사실이
        // 감독기관 화면에 전혀 나타나지 않는다.
        // action은 "VERIFY"가 아니라 "CREATE"다 - audit_log.action에 CHECK 제약이 있어서
        // 허용된 7개 값(CREATE/UPDATE/DELETE/APPROVE/REJECT/LOGIN/EXPORT) 밖의 값을 넣으면
        // INSERT가 실패한다. 화면 문구는 AuditLogService.actionLabel이 "ZKP 검증"으로 바꿔 준다.
        auditLogService.record(userId, "CREATE", "ZKP_PROOF", zkpProof.getProofId(),
                "OEKOTEX_LABEL ZKP (DPP-" + dpp.getDppId() + ")", specPassed ? "충족" : "미충족", zkpAnchorTxId);

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
        BlockchainAnchor anchor = new BlockchainAnchor();
        anchor.setTargetType("DOCUMENT");
        anchor.setTargetId(document.getDocumentId());
        anchor.setContentHash(document.getContentHash());
        anchor.setChannelName("dppchannel");
        anchor.setChaincode("dpp-ledger-chaincode");
        if (blockchainClient.isEmpty()) {
            // blockchain.enabled=false(로컬·데모)여도 앵커 기록 자체는 남긴다 - 해시는 진짜고
            // tx_id만 가상이다(V1__schema.sql: "MOCK = 1차 프로토타입(해시는 실제, tx_id는 가상)",
            // fn_create_dpp_snapshot의 p_mock=true와 같은 원칙). 예전엔 여기서 그냥 return null
            // 이라 문서를 아무리 올려도 blockchain_anchor에 행이 하나도 안 생겼고, 그래서 관리자
            // 대시보드의 "최근 앵커링"이 항상 "기록 없음", "30일 성공률"이 항상 빈칸이었다
            // (2026-08-20 강 리포트). 체인이 켜진 환경에서는 이 분기를 타지 않는다.
            anchor.setStatus("MOCK");
            anchor.setTxId("mock-" + anchor.getContentHash());
            anchor.setAnchoredAt(OffsetDateTime.now());
            blockchainAnchorRepository.save(anchor);
            log.info("blockchain.enabled=false - targetType={} targetId={} MOCK 앵커로 기록",
                    anchor.getTargetType(), anchor.getTargetId());
            return anchor.getTxId();
        }
        try {
            BlockchainClient.ChainResult result = blockchainClient.get().recordDocumentHash(
                    document.getDocumentId().toString(),
                    document.getDocTypeCode(),
                    document.getContentHash(),
                    orgId.toString(),
                    OffsetDateTime.now().format(TIMESTAMP_FORMAT));
            anchor.setTxId(result.txId());
            // block_no는 2026-08-22에 처음 채우기 시작했다 - 그전엔 이 컬럼을 쓰는 코드가
            // 아예 없어서 관리자 대시보드 '블록 높이'가 구조상 항상 비어 있었다(강 리포트).
            anchor.setBlockNo(result.blockNumber());
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
        BlockchainAnchor anchor = new BlockchainAnchor();
        anchor.setTargetType("EVENT");
        anchor.setTargetId(zkpProof.getProofId());
        anchor.setContentHash(sha256Hex(zkpProof.getProofData()));
        anchor.setChannelName("dppchannel");
        anchor.setChaincode("dpp-ledger-chaincode");
        if (blockchainClient.isEmpty()) {
            // blockchain.enabled=false(로컬·데모)여도 앵커 기록 자체는 남긴다 - 해시는 진짜고
            // tx_id만 가상이다(V1__schema.sql: "MOCK = 1차 프로토타입(해시는 실제, tx_id는 가상)",
            // fn_create_dpp_snapshot의 p_mock=true와 같은 원칙). 예전엔 여기서 그냥 return null
            // 이라 문서를 아무리 올려도 blockchain_anchor에 행이 하나도 안 생겼고, 그래서 관리자
            // 대시보드의 "최근 앵커링"이 항상 "기록 없음", "30일 성공률"이 항상 빈칸이었다
            // (2026-08-20 강 리포트). 체인이 켜진 환경에서는 이 분기를 타지 않는다.
            anchor.setStatus("MOCK");
            anchor.setTxId("mock-" + anchor.getContentHash());
            anchor.setAnchoredAt(OffsetDateTime.now());
            blockchainAnchorRepository.save(anchor);
            log.info("blockchain.enabled=false - targetType={} targetId={} MOCK 앵커로 기록",
                    anchor.getTargetType(), anchor.getTargetId());
            return anchor.getTxId();
        }
        try {
            BlockchainClient.ChainResult result = blockchainClient.get().recordZkpVerification(
                    document.getDocumentId().toString(),
                    zkpProof.getProofId().toString(),
                    publicSignalsJson,
                    verified,
                    orgId.toString(),
                    OffsetDateTime.now().format(TIMESTAMP_FORMAT),
                    // 증명 산출물(proof_data)의 SHA-256 - 이 앵커 행의 content_hash와 같은 값이다.
                    // 원장에 판정(기준값/참거짓)만 남기면 뒷받침한 증명이 나중에 바뀌어도
                    // 확인할 수 없어서 함께 기록한다(2026-08-20 강 지적).
                    anchor.getContentHash());
            anchor.setTxId(result.txId());
            // block_no는 2026-08-22에 처음 채우기 시작했다 - 그전엔 이 컬럼을 쓰는 코드가
            // 아예 없어서 관리자 대시보드 '블록 높이'가 구조상 항상 비어 있었다(강 리포트).
            anchor.setBlockNo(result.blockNumber());
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
    private void applySpecFields(Dpp dpp, Long orgId, Long userId, Map<String, Object> parsed,
                                 Long documentId, Boolean zkpPassed) {
        Object raw = parsed.get("spec_fields");
        if (!(raw instanceof Map)) {
            return;
        }
        specFieldAutoFillService.apply(dpp.getDppId(), dpp.getDomain(), orgId, userId,
                (Map<String, Object>) raw, documentId, zkpPassed);
    }

}
