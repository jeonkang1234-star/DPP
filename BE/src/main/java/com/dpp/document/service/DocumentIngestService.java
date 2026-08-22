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
import com.dpp.document.dto.SteelMillUploadResponse;
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
import com.dpp.document.zkp.SteelZkpMapper;
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
 * REQ-DOCUMENT: 업로드된 제강성적서(Q2_05) 1건을 파서 -> ZKP -> (선택) 블록체인 순으로 넘겨
 * document/zkp_proof/blockchain_anchor 행을 만드는 오케스트레이션.
 *
 * 블록체인 앵커링은 blockchain.enabled=true(EC2, 실행 중인 Fabric 네트워크가 있을 때)일 때만
 * 실제로 일어난다 - BlockchainClient를 Optional로 주입받아서, 비활성화된 로컬 개발 환경에서도
 * 앱이 죽지 않고 그냥 앵커링 단계만 건너뛴다. 앵커링 자체가 실패해도(네트워크 장애 등) 문서
 * 업로드/ZKP 결과 저장은 이미 끝난 뒤라 실패로 롤백하지 않고, blockchain_anchor에
 * status=FAILED로 기록만 남긴다 - 이 부분이 데모/테스트망이라는 걸 고려한 설계.
 */
@Service
public class DocumentIngestService {

    private static final Logger log = LoggerFactory.getLogger(DocumentIngestService.class);

    private static final String REGISTRY_CODE = "Q2_05";
    private static final String DOC_TYPE_CODE = "MILL_SHEET";
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
    private final SpecFieldAutoFillService specFieldAutoFillService;
    private final ZkpClient zkpClient;
    private final Optional<BlockchainClient> blockchainClient;
    private final DocumentIntegrationProperties properties;
    private final ObjectMapper objectMapper;
    private final NotificationRepository notificationRepository;
    private final AuditLogService auditLogService;

    public DocumentIngestService(UserAccountRepository userAccountRepository,
                                  DppRepository dppRepository,
                                  DocumentRepository documentRepository,
                                  DocumentLinkRepository documentLinkRepository,
                                  DppQueryRepository dppQueryRepository,
                                  ZkpProofRepository zkpProofRepository,
                                  BlockchainAnchorRepository blockchainAnchorRepository,
                                  MaterialCompositionRepository materialCompositionRepository,
                                  DppFieldValueRepository dppFieldValueRepository,
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
        this.blockchainAnchorRepository = blockchainAnchorRepository;
        this.materialCompositionRepository = materialCompositionRepository;
        this.dppFieldValueRepository = dppFieldValueRepository;
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
    public SteelMillUploadResponse ingestSteelMillSheet(Long userId, Long dppId, MultipartFile file) {
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

        // 1) 파서 호출 - 텍스트 추출 + 필드 파싱 + 해시
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
        Map<String, Object> steelMillValues = (Map<String, Object>) parsed.get("steel_mill_values");
        String textSha256 = (String) parsed.get("text_sha256");
        if (textSha256 == null) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "파서가 문서 해시를 계산하지 못했습니다.");
        }

        // 1-1) 중복 업로드 방지 - ux_document_dedup(owner_type, owner_id, doc_type_code,
        // content_hash) 유니크 제약과 동일한 키. 이 체크 없이 save()까지 갔다가 제약에 걸리면
        // DataIntegrityViolationException이 그대로 500으로 나가고, 이미 파싱은 물론 아래
        // ZKP 증명(수십 초~4분)까지 다 돌린 뒤라 낭비가 크다 - 그래서 ZKP 호출 전, 파싱 직후에
        // 미리 걸러서 명확한 409로 응답한다(2026-08-15 발견: 동일 파일 재업로드 시 500 발생).
        documentRepository.findByOwnerTypeAndOwnerIdAndDocTypeCodeAndContentHash(
                        "DPP", dpp.getDppId(), DOC_TYPE_CODE, textSha256)
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "이미 업로드된 파일입니다. (documentId=" + existing.getDocumentId()
                                    + ", 검토상태=" + existing.getReviewStatus() + ")");
                });

        // 2) 화학성분/기계적성질을 zkp 회로 입력(고정소수점 정수)으로 스케일링 - 여기서
        // 실패하면(필수 항목 누락 등) zkp 호출/DB 저장 전에 바로 끊는다.
        SteelZkpMapper.SteelZkpInput zkpInput;
        try {
            zkpInput = SteelZkpMapper.build(steelMillValues);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "제강성적서 필수 항목을 문서에서 읽지 못했습니다: " + e.getMessage(), e);
        }

        // 3) 업로드 원본 파일 저장 (컨테이너 내부 볼륨, document.file_uri가 이 경로를 가리킴)
        String storedFileName = UUID.randomUUID() + ".pdf";
        Path uploadDir = Path.of(properties.getUploadDir());
        Path storedPath = uploadDir.resolve(storedFileName);
        try {
            Files.createDirectories(uploadDir);
            Files.write(storedPath, file.getBytes());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "업로드 파일 저장에 실패했습니다.", e);
        }

        // 4) document 행 저장
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

        // 4-1) material_composition에 화학조성 저장 - "화학조성 입력 화면"으로 불렸지만
        // 실제로는 새 입력 폼이 필요한 게 아니라, 파서가 이미 뽑아주는 chemical_composition_
        // wt_percent(8개 원소)가 지금까지 ZKP 증명 입력으로만 쓰이고 어디에도 저장되지
        // 않았던 게 문제였다(2026-08-15 확인). material_composition 테이블 자체가 "문서
        // 자동 파싱 결과 매핑 대상"이라고 코멘트에 명시돼 있어서 설계 의도에 맞게 여기서
        // 채운다 - v_dpp_requirement_status의 CHEM_COMPOSITION 요건(MATERIAL_COMPOSITION/
        // CHEM_ELEMENT)이 이걸로 자동 충족된다.
        persistChemicalComposition(dpp.getDppId(), document.getDocumentId(), steelMillValues);

        // 5) [블록체인] 문서 해시 앵커링 - dpp-ledger-chaincode.recordDocumentHash
        String documentAnchorTxId = anchorDocumentHash(document, orgId);

        // 6) zkp 서버 호출 - 실제 zk-SNARK 증명 생성(수십 초 소요, RestClient 타임아웃 4분)
        Map<String, Object> zkpResult;
        try {
            zkpResult = zkpClient.proveSteelMillCheck(zkpInput.limits(), zkpInput.measured());
        } catch (RestClientException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "ZKP 증명 서비스 호출에 실패했습니다: " + e.getMessage(), e);
        }

        // SteelMillCheck는 "Boolean 출력형" 회로라(circuits.mjs 주석) 화학성분/기계적성질이
        // 규격을 벗어나도 증명 자체는 항상 정상 생성·검증된다 - cryptoVerified는 증명이
        // 유효한지(크립토 무결성, 시스템 정상 여부에 가까움)일 뿐이고, 실제 "규격 적합
        // 여부"는 verdicts(12개 항목 각각의 Bool)를 전부 확인해야 안다. 예전엔 이
        // cryptoVerified를 review_status/FE 표시에 그대로 써서, 규격 미달 성적서도 거의
        // 항상 "검증 통과"로 뜨는 잠재 버그가 있었다(2026-08-15, 강이 지적해서 발견).
        boolean cryptoVerified = Boolean.TRUE.equals(zkpResult.get("verified"));
        if (!cryptoVerified) {
            // 크립토 증명 자체가 깨진 건 정상적인 "규격 미달" 케이스가 아니라 서비스
            // 이상이다(CbamIngestService와 동일한 판단) - 회로 설계상 verdicts가 뭐든
            // 증명은 항상 생성/검증에 성공해야 정상이라, 여기서 false면 zkp 서비스 자체
            // 문제로 본다.
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "ZKP 증명 생성에 실패했습니다 (증명 검증 실패).");
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> verdicts = (Map<String, Object>) zkpResult.get("verdicts");
        boolean specPassed = verdicts != null && !verdicts.isEmpty()
                && verdicts.values().stream().allMatch(v -> Boolean.TRUE.equals(v));
        Object proofData = zkpResult.get("proof");

        // 규격 미달(REJECTED) 시 업로드 조직에게 알림센터로 바로 알림 - 예전엔 화면에
        // 있을 때만(빨간 칩) 알 수 있었고 알림센터에는 아무것도 안 왔다(2026-08-15, 강
        // 요청: "알림센터로 검증실패나 오게 해"). 통과(specPassed=true)는 원래도
        // "성공"이라 별도 알림 없이 화면 표시로 충분하다고 보고 실패 케이스만 보낸다.
        if (!specPassed) {
            notifySpecFailure(orgId, document, verdicts);
        }

        // 6-1) steel_mill_values.identity(Heat/Cast/Lot 번호, 강종, 규격, 치수, 중량)를
        // dpp_field_value에 자동 채움 - "증명에 실패했으면 데이터 파싱 안되게"(2026-08-18
        // 이전 라운드 피드백)와 같은 원칙을 여기도 적용해 specPassed일 때만 채운다. 이미
        // 값이 있는 필드(수기 입력 포함)는 DocumentSlotService.fillIfEmpty와 동일하게
        // 덮어쓰지 않는다.
        if (specPassed) {
            persistIdentityFields(dpp.getDppId(), orgId, userId, steelMillValues);
            applySpecFields(dpp, orgId, userId, parsed, document.getDocumentId(), specPassed);
        }

        // 7) zkp_proof 행 저장 - 실측값(private input)은 어디에도 저장하지 않는다.
        // status는 크립토 검증(이미 위에서 확인됨)이 아니라 규격 적합 여부를 담는다 -
        // "이 증명이 유효한 성적서임을(=규격 충족을) 확인해줬는가"라는 사용자 관점의
        // 질문에 맞춘 것.
        ZkpProof zkpProof = new ZkpProof();
        zkpProof.setDppId(dpp.getDppId());
        zkpProof.setDocumentId(document.getDocumentId());
        zkpProof.setClaimType("CERT_VALID");
        zkpProof.setCircuitName("steel-mill-check");
        zkpProof.setStatus(specPassed ? "VERIFIED" : "REJECTED");
        zkpProof.setVerifiedAt(OffsetDateTime.now());
        String proofDataJson;
        String publicSignalsJson;
        try {
            proofDataJson = objectMapper.writeValueAsString(proofData);
            publicSignalsJson = objectMapper.writeValueAsString(Map.of(
                    "limits", zkpInput.limits(),
                    "verdicts", verdicts
            ));
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "증명 결과 직렬화에 실패했습니다.", e);
        }
        zkpProof.setProofData(proofDataJson);
        zkpProof.setPublicSignals(publicSignalsJson);
        zkpProof = zkpProofRepository.save(zkpProof);

        // 8) [블록체인] ZKP 검증결과 앵커링 - dpp-ledger-chaincode.recordZkpVerification
        String zkpAnchorTxId = anchorZkpVerification(document, zkpProof, publicSignalsJson, specPassed, orgId);

        // 9) document_link 연결 + review_status 확정 + 완성도 재계산 - 이 세 줄이 지금까지
        // 빠져 있어서 Mill Sheet를 업로드/ZKP 검증까지 성공해도 v_dpp_requirement_status
        // (document_link JOIN + review_status='APPROVED' 조건, V2__functions.sql)가 절대
        // "충족"으로 안 잡히던 버그였다(2026-08-14 발견). 별도 관리자 승인 화면이 아직
        // 없어서 규격 적합 여부(specPassed)를 그대로 review_status에 반영한다 - 통과하면
        // APPROVED, 미달이면 REJECTED(재업로드해야 완성도에 반영됨).
        document.setReviewStatus(specPassed ? "APPROVED" : "REJECTED");
        documentRepository.save(document);

        DocumentLink link = new DocumentLink();
        link.setDocumentId(document.getDocumentId());
        link.setDppId(dpp.getDppId());
        link.setLinkType("DIRECT");
        documentLinkRepository.save(link);

        dppQueryRepository.recalcCompleteness(dpp.getDppId());

        auditLogService.record(userId, "CREATE", "DOCUMENT", document.getDocumentId(),
                "MILL_SHEET (DOC-" + document.getDocumentId() + ")", specPassed ? "성공" : "검증 실패", documentAnchorTxId);

        // ZKP 검증도 감사 로그에 남긴다 - EU 시장감시 감사 로그는 DPP 등록과 ZKP 검증만
        // 보여주므로(AuditLogRepository.findRecent의 target_type 필터, 2026-08-22 강 요청),
        // 여기서 남기지 않으면 "영업비밀 값을 공개하지 않고 규정 충족을 증명했다"는 사실이
        // 감독기관 화면에 전혀 나타나지 않는다.
        auditLogService.record(userId, "VERIFY", "ZKP_PROOF", zkpProof.getProofId(),
                "MILL_SHEET ZKP (DPP-" + dpp.getDppId() + ")", specPassed ? "충족" : "미충족", zkpAnchorTxId);

        return new SteelMillUploadResponse(
                document.getDocumentId(),
                zkpProof.getProofId(),
                dpp.getDppId(),
                dpp.getPublicUuid(),
                cryptoVerified,
                specPassed,
                verdicts,
                zkpInput.measured(),
                zkpInput.limits(),
                documentAnchorTxId,
                zkpAnchorTxId
        );
    }

    /** 실패해도 업로드 자체는 막지 않는다 - blockchain_anchor에 성공/실패를 기록만 하고 넘어간다. */
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

    /** 마찬가지로 실패해도 응답 자체는 정상 반환한다. */
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

    /**
     * verdicts의 키(측정 항목명, 예: C/Mn/YS/TS 등)는 응답의 measured/limits 맵과 동일한
     * 이름을 쓴다(zkp-o1js/server.mjs의 MEASURED_KEYS 기준) - 실측값 자체는 알림 본문에
     * 담지 않고 "어떤 항목이 미달인지" 이름만 나열한다(실측값은 화면의 업로드 결과 카드에서
     * 이미 확인 가능, 알림은 목록이라 짧게 유지).
     */
    private void notifySpecFailure(Long orgId, Document document, Map<String, Object> verdicts) {
        List<String> failedKeys = verdicts == null ? List.of() : verdicts.entrySet().stream()
                .filter(e -> !Boolean.TRUE.equals(e.getValue()))
                .map(Map.Entry::getKey)
                .toList();
        String body = document.getFileName() + " - 규격 미달 항목: "
                + (failedKeys.isEmpty() ? "확인 필요" : String.join(", ", failedKeys));
        for (UserAccount recipient : userAccountRepository.findByOrgId(orgId)) {
            Notification notification = new Notification();
            notification.setRecipientUserId(recipient.getUserId());
            notification.setCategory(NotificationCategory.CERT);
            notification.setTitle("제강 성적서 검증 실패");
            notification.setBody(body);
            notificationRepository.save(notification);
        }
    }

    /**
     * steel_mill_values.chemical_composition_wt_percent(원소 -> {measured, limit_text})를
     * material_composition(entry_kind='CHEM_ELEMENT') 행으로 그대로 옮긴다. 재업로드 시
     * 이전 행이 쌓이지 않도록 이 dpp의 CHEM_ELEMENT 행을 먼저 지우고 새로 채운다 - 재업로드가
     * "최신 값으로 교체"를 의미하지 "누적"을 의미하지 않기 때문(document 테이블 자체도
     * "review_status가 가장 최근 document_id 기준" 규칙을 쓰는 것과 같은 맥락).
     */
    @SuppressWarnings("unchecked")
    private void persistChemicalComposition(Long dppId, Long documentId, Map<String, Object> steelMillValues) {
        Map<String, Object> chemical = (Map<String, Object>) steelMillValues.getOrDefault(
                "chemical_composition_wt_percent", Map.of());
        if (chemical.isEmpty()) {
            return;
        }
        materialCompositionRepository.deleteAll(
                materialCompositionRepository.findByDppIdAndEntryKind(dppId, "CHEM_ELEMENT"));
        for (Map.Entry<String, Object> entry : chemical.entrySet()) {
            Object data = entry.getValue();
            if (!(data instanceof Map<?, ?> map)) {
                continue;
            }
            Object measured = map.get("measured");
            if (!(measured instanceof Number n)) {
                continue;
            }
            MaterialComposition row = new MaterialComposition();
            row.setDppId(dppId);
            row.setEntryKind("CHEM_ELEMENT");
            row.setMaterialName(entry.getKey());
            row.setContentRate(BigDecimal.valueOf(n.doubleValue()));
            row.setContentUnit("PERCENT");
            row.setSourceDocumentId(documentId);
            materialCompositionRepository.save(row);
        }
    }

    /**
     * steel_mill_values.identity(Heat No./Cast·Lot No./강종/규격/치수/중량)를 dpp_field_value에
     * 채운다 - DocumentSlotService.fillIfEmpty와 동일하게 이미 값이 있으면(수기 입력 포함)
     * 덮어쓰지 않는다. NET_WEIGHT_T는 요건 필드의 단위가 톤(T)인데 문서엔 kg로만 나와서
     * 1000으로 나눠 변환한다.
     *
     * 2026-08-18 강 리포트: "LOT-2026-0201-A가 CAST 번호에도 이렇게 파싱되는 오류" - 애초에
     * mock 문서 4종 전부 Heat No.와 "Cast/Lot No."를 별도 필드가 아니라 하나의 결합값으로만
     * 인쇄한다(cast_lot_no). 이 값은 형식상 "LOT-..."라 실제로는 Lot 번호에 더 가깝고, Cast
     * 번호는 문서에 아예 없는 정보다 - 그런데도 같은 값을 CAST_NO에도 채운 게 잘못이었다.
     * LOT_NO에만 채우고 CAST_NO는 손대지 않는다(수기 입력 대상으로 남김).
     * OPERATOR_MANUFACTURER(복합 정보, 신뢰도 있게 조합 불가), SCRAP_SOURCE·PRODUCTION_DATE
     * (문서에 명확한 대응 신호 없음), PRODUCT_FORM(자유텍스트 "BEAM"을 "형강" 같은 분류로
     * 추론해야 해서 리스크 있음)은 의도적으로 제외했다.
     */
    @SuppressWarnings("unchecked")
    private void persistIdentityFields(Long dppId, Long orgId, Long userId, Map<String, Object> steelMillValues) {
        Object raw = steelMillValues.get("identity");
        if (!(raw instanceof Map<?, ?> rawMap)) {
            return;
        }
        Map<String, Object> identity = (Map<String, Object>) rawMap;

        fillFieldIfEmpty(dppId, orgId, userId, "HEAT_NO", asTrimmedString(identity.get("heat_no")));
        fillFieldIfEmpty(dppId, orgId, userId, "LOT_NO", asTrimmedString(identity.get("cast_lot_no")));
        fillFieldIfEmpty(dppId, orgId, userId, "STEEL_GRADE", asTrimmedString(identity.get("steel_grade")));
        fillFieldIfEmpty(dppId, orgId, userId, "STEEL_STANDARD", asTrimmedString(identity.get("standard")));
        fillFieldIfEmpty(dppId, orgId, userId, "DIMENSION", asTrimmedString(identity.get("dimension_text")));

        Object weightKg = identity.get("weight_kg");
        if (weightKg instanceof Number n) {
            BigDecimal tons = BigDecimal.valueOf(n.doubleValue())
                    .divide(BigDecimal.valueOf(1000), 3, java.math.RoundingMode.HALF_UP);
            fillFieldIfEmpty(dppId, orgId, userId, "NET_WEIGHT_T", tons.stripTrailingZeros().toPlainString());
        }
    }

    private static String asTrimmedString(Object value) {
        if (value == null) {
            return null;
        }
        String s = String.valueOf(value).trim();
        return s.isEmpty() ? null : s;
    }

    /** DocumentSlotService.fillIfEmpty와 동일한 "이미 값 있으면 안 덮어씀" 정책. */
    private void fillFieldIfEmpty(Long dppId, Long orgId, Long userId, String fieldCode, String value) {
        if (value == null) {
            return;
        }
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
