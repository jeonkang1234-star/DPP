package com.dpp.document.service;

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
    private final ParserClient parserClient;
    private final ZkpClient zkpClient;
    private final Optional<BlockchainClient> blockchainClient;
    private final DocumentIntegrationProperties properties;
    private final ObjectMapper objectMapper;
    private final NotificationRepository notificationRepository;

    public DocumentIngestService(UserAccountRepository userAccountRepository,
                                  DppRepository dppRepository,
                                  DocumentRepository documentRepository,
                                  DocumentLinkRepository documentLinkRepository,
                                  DppQueryRepository dppQueryRepository,
                                  ZkpProofRepository zkpProofRepository,
                                  BlockchainAnchorRepository blockchainAnchorRepository,
                                  MaterialCompositionRepository materialCompositionRepository,
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
        this.parserClient = parserClient;
        this.zkpClient = zkpClient;
        this.blockchainClient = blockchainClient;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public SteelMillUploadResponse ingestSteelMillSheet(Long userId, MultipartFile file) {
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

        // 1) 파서 호출 - 텍스트 추출 + 필드 파싱 + 해시
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

    /** 마찬가지로 실패해도 응답 자체는 정상 반환한다. */
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
