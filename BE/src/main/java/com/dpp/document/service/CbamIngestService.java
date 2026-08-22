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
import com.dpp.document.dto.CbamUploadResponse;
import com.dpp.document.entity.Document;
import com.dpp.document.entity.DocumentLink;
import com.dpp.document.entity.Dpp;
import com.dpp.document.entity.ZkpProof;
import com.dpp.document.repository.DocumentLinkRepository;
import com.dpp.document.repository.DocumentRepository;
import com.dpp.document.repository.DppRepository;
import com.dpp.document.repository.ZkpProofRepository;
import com.dpp.dpp.entity.DppFieldValue;
import com.dpp.dpp.repository.DppFieldValueRepository;
import com.dpp.dpp.repository.DppQueryRepository;
import com.dpp.dpp.service.SpecFieldAutoFillService;
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
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * REQ-DOCUMENT: CBAM(Q2_06) 탄소보고서 업로드 -> 파서 -> cbam-check ZKP -> (선택) 블록체인
 * 순으로 처리한다. DocumentIngestService(Mill Sheet)와 같은 패턴이지만 핵심 차이가 하나 있다:
 *
 * SteelMillCheck의 verdicts(적합/부적합)와 달리, CbamCheck의 출력(obligated)은 "적합
 * 여부"가 아니라 "연간 누적 수입량이 de minimis(50t) 기준을 초과해서 신고 의무가
 * 발생했는가"다 - true/false 둘 다 정상적인 결과라서 review_status(승인/반려)에 매핑하면
 * 안 된다. 그래서 문서 자체는 파싱+증명이 성공하면 항상 APPROVED로 두고, obligated
 * 값은 정보로서 CBAM_APPLICABLE 필드(requirement_field FIELD_VALUE)에 자동 반영만 한다 -
 * 사용자가 그 값을 또 수기로 체크할 필요가 없어진다.
 */
@Service
public class CbamIngestService {

    private static final Logger log = LoggerFactory.getLogger(CbamIngestService.class);

    private static final String REGISTRY_CODE = "Q2_06";
    private static final String DOC_TYPE_CODE = "CBAM_REPORT";
    private static final String CBAM_APPLICABLE_FIELD_CODE = "CBAM_APPLICABLE";
    /** circuits.mjs/README의 de minimis 기준(50t) x10 스케일 - 소수 1자리까지 정수화. */
    private static final long DE_MINIMIS_X10 = 500;
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
    private final AuditLogService auditLogService;

    public CbamIngestService(UserAccountRepository userAccountRepository,
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
        this.auditLogService = auditLogService;
    }

    @Transactional
    public CbamUploadResponse ingestCbamReport(Long userId, Long dppId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업로드된 파일이 없습니다.");
        }

        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 사용자입니다."));
        Long orgId = user.getOrgId();
        if (orgId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이 계정에 연결된 조직(제조사)이 없습니다.");
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

        // 1) 파서 호출
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
        Map<String, Object> cbamValues = (Map<String, Object>) parsed.get("cbam_values");
        String textSha256 = (String) parsed.get("text_sha256");
        if (textSha256 == null) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "파서가 문서 해시를 계산하지 못했습니다.");
        }
        Object importQtyRaw = cbamValues == null ? null : cbamValues.get("import_quantity_t");
        if (!(importQtyRaw instanceof Number importQtyNumber)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "CBAM 수입 수량을 문서에서 읽지 못했습니다.");
        }
        double importQuantityT = importQtyNumber.doubleValue();

        // 1-1) 중복 업로드 방지 - DocumentIngestService(Mill Sheet)에서 발견된 패턴과 동일
        // (ux_document_dedup 유니크 제약, 2026-08-15). ZKP 호출 전에 미리 걸러 낭비를 막는다.
        documentRepository.findByOwnerTypeAndOwnerIdAndDocTypeCodeAndContentHash(
                        "DPP", dpp.getDppId(), DOC_TYPE_CODE, textSha256)
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "이미 업로드된 파일입니다. (documentId=" + existing.getDocumentId()
                                    + ", 검토상태=" + existing.getReviewStatus() + ")");
                });

        // 2) 업로드 원본 파일 저장
        String storedFileName = UUID.randomUUID() + ".pdf";
        Path uploadDir = Path.of(properties.getUploadDir());
        Path storedPath = uploadDir.resolve(storedFileName);
        try {
            Files.createDirectories(uploadDir);
            Files.write(storedPath, file.getBytes());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "업로드 파일 저장에 실패했습니다.", e);
        }

        // 3) document 행 저장 - obligated 여부와 무관하게, 파싱+증명이 성공하면 즉시 APPROVED.
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
        document.setReviewStatus("APPROVED");
        document = documentRepository.save(document);

        // 4) [블록체인] 문서 해시 앵커링
        String documentAnchorTxId = anchorDocumentHash(document, orgId);

        // 5) zkp 서버 호출 - cbam-check(de minimis 초과 여부)
        long qtyX10 = Math.round(importQuantityT * 10);
        Map<String, Object> zkpResult;
        try {
            zkpResult = zkpClient.proveCbamCheck(DE_MINIMIS_X10, qtyX10);
        } catch (RestClientException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "ZKP 증명 서비스 호출에 실패했습니다: " + e.getMessage(), e);
        }
        boolean cryptoVerified = Boolean.TRUE.equals(zkpResult.get("verified"));
        if (!cryptoVerified) {
            // 크립토 증명 자체가 깨진 건 정상적인 "미달" 케이스가 아니라 서비스 이상이다.
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "ZKP 증명 생성에 실패했습니다 (증명 검증 실패).");
        }
        boolean obligated = Boolean.TRUE.equals(zkpResult.get("obligated"));
        Object proofData = zkpResult.get("proof");

        // 6) zkp_proof 행 저장 - 실측 수입량(private input)은 저장하지 않는다.
        // claim_type은 zkp_proof 테이블의 CHECK 제약(V1__schema.sql: ORIGIN/CERT_VALID/
        // RECYCLED_RATE/CUSTOMS_FIT/CARBON_LIMIT 5개뿐)을 지켜야 한다 - CBAM은 EU 수입
        // 통관 시 탄소국경조정 신고의무 발생 여부를 다루므로 'CUSTOMS_FIT'이 가장 근접하다.
        // (2026-08-16 배터리 도메인 작업 중 발견: 원래 여기 있던 "CBAM_OBLIGATION"은 이
        // 화이트리스트에 없는 값이라 실제 업로드 시 DB CHECK 제약 위반으로 500이 났을
        // 잠재 버그였다 - 아직 실사용 테스트에서 걸리지 않았을 뿐.)
        ZkpProof zkpProof = new ZkpProof();
        zkpProof.setDppId(dpp.getDppId());
        zkpProof.setDocumentId(document.getDocumentId());
        zkpProof.setClaimType("CUSTOMS_FIT");
        zkpProof.setCircuitName("cbam-check");
        zkpProof.setStatus("VERIFIED");
        zkpProof.setVerifiedAt(OffsetDateTime.now());
        String proofDataJson;
        String publicSignalsJson;
        try {
            proofDataJson = objectMapper.writeValueAsString(proofData);
            publicSignalsJson = objectMapper.writeValueAsString(Map.of(
                    "deMinimisT", DE_MINIMIS_X10 / 10.0,
                    "obligated", obligated
            ));
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "증명 결과 직렬화에 실패했습니다.", e);
        }
        zkpProof.setProofData(proofDataJson);
        zkpProof.setPublicSignals(publicSignalsJson);
        zkpProof = zkpProofRepository.save(zkpProof);

        // 7) [블록체인] 검증결과 앵커링
        String zkpAnchorTxId = anchorZkpVerification(document, zkpProof, publicSignalsJson, orgId);

        // 8) document_link 연결 + 완성도 재계산
        DocumentLink link = new DocumentLink();
        link.setDocumentId(document.getDocumentId());
        link.setDppId(dpp.getDppId());
        link.setLinkType("DIRECT");
        documentLinkRepository.save(link);

        // 9) CBAM_APPLICABLE 필드 자동 채움 - obligated 결과를 requirement_field
        // FIELD_VALUE로도 반영해서, 사용자가 같은 정보를 또 수기로 체크할 필요가 없게 한다.
        DppFieldValue applicable = dppFieldValueRepository.findByDppIdAndFieldCode(dpp.getDppId(), CBAM_APPLICABLE_FIELD_CODE)
                .orElseGet(() -> {
                    DppFieldValue v = new DppFieldValue();
                    v.setDppId(dpp.getDppId());
                    v.setFieldCode(CBAM_APPLICABLE_FIELD_CODE);
                    return v;
                });
        applicable.setValueText(String.valueOf(obligated));
        applicable.setSubmittedByOrg(orgId);
        applicable.setSubmittedByUser(userId);
        applicable.setUpdatedAt(OffsetDateTime.now());
        dppFieldValueRepository.save(applicable);

        // 라벨 사전 기반 일괄 채움. CBAM 보고서는 de minimis(50t) 초과 여부가 정보성
        // 플래그라 반려 케이스 자체가 없다 - 게이트 없이 항상 적용하고, 영업비밀 필드의
        // 판정도 "충족"으로 본다(반려가 없으니 미충족 케이스가 존재하지 않는다).
        applySpecFields(dpp, orgId, userId, parsed, document.getDocumentId(), Boolean.TRUE);

        dppQueryRepository.recalcCompleteness(dpp.getDppId());

        auditLogService.record(userId, "CREATE", "DOCUMENT", document.getDocumentId(),
                "CBAM_REPORT (DOC-" + document.getDocumentId() + ")", "성공", documentAnchorTxId);

        // ZKP 검증도 감사 로그에 남긴다 - EU 시장감시 감사 로그는 DPP 등록과 ZKP 검증만
        // 보여주므로(AuditLogRepository.findRecent의 target_type 필터, 2026-08-22 강 요청),
        // 여기서 남기지 않으면 "영업비밀 값을 공개하지 않고 규정 충족을 증명했다"는 사실이
        // 감독기관 화면에 전혀 나타나지 않는다.
        auditLogService.record(userId, "VERIFY", "ZKP_PROOF", zkpProof.getProofId(),
                "CBAM_REPORT ZKP (DPP-" + dpp.getDppId() + ")", "충족", zkpAnchorTxId);

        return new CbamUploadResponse(
                document.getDocumentId(),
                zkpProof.getProofId(),
                dpp.getDppId(),
                dpp.getPublicUuid(),
                obligated,
                importQuantityT,
                DE_MINIMIS_X10 / 10.0,
                documentAnchorTxId,
                zkpAnchorTxId
        );
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

    private String anchorZkpVerification(Document document, ZkpProof zkpProof, String publicSignalsJson, Long orgId) {
        BlockchainAnchor anchor = new BlockchainAnchor();
        anchor.setTargetType("EVENT");
        anchor.setTargetId(zkpProof.getProofId());
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
            BlockchainClient.ChainResult result = blockchainClient.get().recordZkpVerification(
                    document.getDocumentId().toString(),
                    zkpProof.getProofId().toString(),
                    publicSignalsJson,
                    true,
                    orgId.toString(),
                    OffsetDateTime.now().format(TIMESTAMP_FORMAT),
                    // 증명 산출물(proof_data)의 SHA-256 - 이 앵커 행의 content_hash와 같은 값이다.
                    // 원장에 판정(기준값/참거짓)만 남기면 뒷받침한 증명이 나중에 바뀌어도
                    // 확인할 수 없어서 함께 기록한다(2026-08-20 강 지적).
                    anchor.getContentHash());
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
