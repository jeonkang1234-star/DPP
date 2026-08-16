package com.dpp.dpp.service;

import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.document.client.ParserClient;
import com.dpp.document.config.DocumentIntegrationProperties;
import com.dpp.document.entity.Document;
import com.dpp.document.entity.DocumentLink;
import com.dpp.document.entity.DocumentType;
import com.dpp.document.repository.DocumentLinkRepository;
import com.dpp.document.repository.DocumentRepository;
import com.dpp.document.repository.DocumentTypeRepository;
import com.dpp.dpp.dto.DocumentFormResponse;
import com.dpp.dpp.dto.DocumentSlotDto;
import com.dpp.dpp.entity.Dpp;
import com.dpp.dpp.entity.DppFieldValue;
import com.dpp.dpp.entity.DppParticipant;
import com.dpp.dpp.entity.RequirementField;
import com.dpp.dpp.repository.DppFieldValueRepository;
import com.dpp.dpp.repository.DppParticipantRepository;
import com.dpp.dpp.repository.DppQueryRepository;
import com.dpp.dpp.repository.RequirementFieldRepository;
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
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * "필수 문서" 업로드 화면(GET·POST /me/documents*) - requirement_field 중 storage_target=
 * 'DOCUMENT'인 항목(10종, DOC_MILL_SHEET 포함)을 다룬다. Mill Sheet는 com.dpp.document.
 * DocumentIngestService가 파서+ZKP까지 거쳐 별도 엔드포인트(/document/upload/steel-mill)로
 * 처리하니 이 화면에서도 목록엔 나오지만 업로드는 그쪽 엔드포인트를 써야 한다 - 여기
 * upload()는 ZKP 회로가 없는 나머지 9종(기술문서/PCF보고서/LCA·EPD/스크랩증빙/SDS/
 * EU적합성선언서/시험성적서/원산지증명서/라벨/사용설명서) 전용이다. 관리자 승인 화면이
 * 아직 없어서(REQ-ADMIN 미착수) 업로드 즉시 review_status='APPROVED'로 확정한다 - FieldFormService가
 * dpp_field_value를 저장 즉시 신뢰하는 것과 같은 수준의 신뢰 모델.
 *
 * FieldFormService와 동일한 OWNER/PARTICIPANT 접근 구분을 쓴다(private Access record 중복 -
 * 두 서비스가 서로 다른 엔티티 세트를 다뤄서 공유 헬퍼로 뽑기엔 아직 이르다고 판단).
 */
@Service
public class DocumentSlotService {

    private static final Logger log = LoggerFactory.getLogger(DocumentSlotService.class);

    /** dppId도 domain 파라미터도 없을 때만 쓰는 최후 기본값 - 기존 철강 FE 호출과의 하위 호환용. */
    private static final String DEFAULT_DOMAIN = "STEEL";

    private static List<String> fieldDomains(String domain) {
        return List.of("COMMON", domain);
    }

    /**
     * parser(FastAPI)의 registry_code(23종 문서 레지스트리)와 우리 document_type 9종의
     * 대응표. 정확히 일치하는 문서가 없는 2종(PCF_REPORT, COO)은 이름이 가장 가까운
     * 코드로 best-effort 매핑했다 - common_fields/sustainability_metrics는 registry_code와
     * 무관하게 항상 같은 방식으로 뽑히므로(parser/extractor.py의 extract_extended_fields
     * 참고) 매핑이 좀 어긋나도 우리가 실제로 읽는 값(GTIN/탄소발자국/재활용비율)엔 영향이
     * 없다 - 타입 전용 확장 필드(TYPE_SPECIFIC_EXTRACTORS)만 못 쓰는데, 이 9종엔 애초에
     * 전용 추출기가 없다(2026-08-15).
     */
    private static final Map<String, String> REGISTRY_CODE_BY_DOC_TYPE = Map.ofEntries(
            Map.entry("TECH_FILE", "Q4_05"),
            Map.entry("PCF_REPORT", "Q2_03"),
            Map.entry("LCA_EPD", "Q2_03"),
            Map.entry("SCRAP_PROOF", "Q4_13"),
            Map.entry("SOC_SDS", "Q2_01"),
            Map.entry("EU_DOC", "Q2_02"),
            Map.entry("TEST_REPORT", "Q2_04"),
            Map.entry("COO", "Q1_01"),
            Map.entry("LABEL", "Q3_07"),
            Map.entry("MANUAL", "Q4_06"),
            // 섬유(TEXTILE) 도메인 - GRS/RCS 거래증명서(Q1_03)는 ZKP 대상이 아니라(judge.py에
            // 판정 로직 없음) 이 일반 업로드 경로를 그대로 쓴다. 아래 autoFillFieldsFromParsedDocument
            // 의 switch에 전용 매핑은 없지만(grs_boxes 필드가 문자열이라 신뢰도 있게 매핑할
            // 대상이 마땅치 않음), GTIN/sustainability_metrics 공통 자동채움은 그대로 시도된다.
            Map.entry("GRS_CERTIFICATE", "Q1_03"),
            // 배터리(BATTERY) 도메인 - 공급망 실사 보고서(Q4_11)는 GRS_CERTIFICATE와 마찬가지로
            // ZKP 회로가 없어(judge.py 판정 로직 대상 아님) 이 일반 업로드 경로를 그대로 쓴다
            // (2026-08-16). BATTERY_CARBON_REPORT/RECYCLING_REPORT는 is_zkp_target=TRUE라
            // 여기 안 올라온다 - 전용 엔드포인트(/document/upload/battery-carbon, /recycling-report)로만 받는다.
            Map.entry("DUE_DILIGENCE_REPORT", "Q4_11")
    );

    private final UserAccountRepository userAccountRepository;
    private final DppQueryRepository dppRepository;
    private final DppParticipantRepository participantRepository;
    private final RequirementFieldRepository requirementFieldRepository;
    private final DocumentRepository documentRepository;
    private final DocumentLinkRepository documentLinkRepository;
    private final DocumentTypeRepository documentTypeRepository;
    private final DppFieldValueRepository dppFieldValueRepository;
    private final ParserClient parserClient;
    private final ParticipantSubmitStatusService participantSubmitStatusService;
    private final DocumentIntegrationProperties properties;

    public DocumentSlotService(UserAccountRepository userAccountRepository,
                                DppQueryRepository dppRepository,
                                DppParticipantRepository participantRepository,
                                RequirementFieldRepository requirementFieldRepository,
                                DocumentRepository documentRepository,
                                DocumentLinkRepository documentLinkRepository,
                                DocumentTypeRepository documentTypeRepository,
                                DppFieldValueRepository dppFieldValueRepository,
                                ParserClient parserClient,
                                ParticipantSubmitStatusService participantSubmitStatusService,
                                DocumentIntegrationProperties properties) {
        this.userAccountRepository = userAccountRepository;
        this.dppRepository = dppRepository;
        this.participantRepository = participantRepository;
        this.requirementFieldRepository = requirementFieldRepository;
        this.documentRepository = documentRepository;
        this.documentLinkRepository = documentLinkRepository;
        this.documentTypeRepository = documentTypeRepository;
        this.dppFieldValueRepository = dppFieldValueRepository;
        this.parserClient = parserClient;
        this.participantSubmitStatusService = participantSubmitStatusService;
        this.properties = properties;
    }

    @Transactional(readOnly = true)
    public DocumentFormResponse getForm(Long userId, Long dppId) {
        return getForm(userId, dppId, null);
    }

    @Transactional(readOnly = true)
    public DocumentFormResponse getForm(Long userId, Long dppId, String requestedDomain) {
        Long orgId = resolveOrgId(userId);

        // dppId 없이 부르는 경우 - 아직 임시저장으로 DPP가 만들어지기 전에도 "이 도메인에서
        // 뭘 제출해야 하는지" 체크리스트는 미리 보여줘야 한다(2026-08-15, "임시저장 하기
        // 전부터 보여줘야지" 사용자 피드백 - FieldFormService.getForm의 dppId==null 분기와
        // 같은 패턴). dpp 행이 없으니 참여 협력사 구분도, 업로드 상태도 없다 - 소유 조직
        // 기준으로 전부 NOT_UPLOADED로 내려준다. 실제 업로드는 여전히 dppId가 있어야
        // 가능하다(DocumentSlotService.upload, document.owner_id가 dpp_id를 가리켜야 함).
        // 어느 도메인 체크리스트인지는 요청 파라미터로만 알 수 있다 - 안 주면(기존 철강 FE
        // 호출) STEEL로 폴백.
        if (dppId == null) {
            String domain = (requestedDomain == null || requestedDomain.isBlank()) ? DEFAULT_DOMAIN : requestedDomain;
            List<RequirementField> draftFields = fieldsFor(fieldDomains(domain), null);
            Map<String, Boolean> draftZkpTargetByDocType = zkpTargetByDocType(draftFields);
            List<DocumentSlotDto> draftSlots = draftFields.stream()
                    .map(f -> new DocumentSlotDto(f.getFieldCode(), f.getLinkedDocType(), f.getLabelKo(), f.isRequired(),
                            "NOT_UPLOADED", null, null,
                            Boolean.TRUE.equals(draftZkpTargetByDocType.get(f.getLinkedDocType()))))
                    .toList();
            return new DocumentFormResponse(null, draftSlots);
        }

        Dpp dpp = dppRepository.findById(dppId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "DPP를 찾을 수 없습니다."));
        Access access = resolveAccess(orgId, dpp);
        // 이미 존재하는 DPP는 dpp.domain(DB에 저장된 실제 값)을 믿는다 - FieldFormService와
        // 동일한 이유(요청 조작으로 다른 도메인 문서함을 보는 것 방지).
        List<String> domains = fieldDomains(dpp.getDomain());

        // dpp_id로 이미 연결된 document_link -> document를 doc_type_code 기준으로 묶어서,
        // 같은 유형이 여러 번 업로드됐으면(재제출) document_id가 가장 큰(=가장 최근) 것만 쓴다.
        List<Long> linkedDocIds = documentLinkRepository.findByDppId(dppId).stream()
                .map(DocumentLink::getDocumentId)
                .toList();
        Map<String, Document> latestByDocType = documentRepository.findAllById(linkedDocIds).stream()
                .collect(Collectors.toMap(Document::getDocTypeCode, d -> d,
                        (a, b) -> a.getDocumentId() > b.getDocumentId() ? a : b));

        List<RequirementField> fields = fieldsFor(domains, access.participantRoleCode());
        Map<String, Boolean> zkpTargetByDocType = zkpTargetByDocType(fields);

        List<DocumentSlotDto> slots = fields.stream()
                .map(f -> {
                    Document doc = latestByDocType.get(f.getLinkedDocType());
                    String status = doc == null ? "NOT_UPLOADED" : doc.getReviewStatus();
                    boolean zkpTarget = Boolean.TRUE.equals(zkpTargetByDocType.get(f.getLinkedDocType()));
                    return new DocumentSlotDto(f.getFieldCode(), f.getLinkedDocType(), f.getLabelKo(), f.isRequired(),
                            status, doc == null ? null : doc.getDocumentId(), doc == null ? null : doc.getFileName(),
                            zkpTarget);
                })
                .toList();

        return new DocumentFormResponse(dppId, slots);
    }

    @Transactional
    public DocumentFormResponse upload(Long userId, Long dppId, String docTypeCode, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업로드된 파일이 없습니다.");
        }
        Long orgId = resolveOrgId(userId);
        Dpp dpp = dppRepository.findById(dppId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "DPP를 찾을 수 없습니다."));
        Access access = resolveAccess(orgId, dpp);

        Set<String> allowedDocTypes = fieldsFor(fieldDomains(dpp.getDomain()), access.participantRoleCode()).stream()
                .map(RequirementField::getLinkedDocType)
                .collect(Collectors.toSet());
        if (!allowedDocTypes.contains(docTypeCode)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "이 문서 유형을 업로드할 권한이 없습니다: " + docTypeCode);
        }
        // document_type.is_zkp_target=TRUE인 유형(MILL_SHEET, CBAM_REPORT)은 여기 목록에도
        // 나오긴 하지만(그래야 "필수 문서" 체크리스트에 뜬다), 실제 업로드는 반드시 전용
        // ZKP 엔드포인트(/document/upload/steel-mill, /document/upload/cbam)로만 받아야
        // 한다 - 이 일반 업로드 경로는 파서/ZKP를 안 거치고 그냥 저장 즉시 APPROVED시키기
        // 때문에, 막지 않으면 증명 없이도 승인된 것처럼 보이는 구멍이 생긴다(2026-08-15,
        // CBAM 연동하다가 발견 - Mill Sheet도 처음부터 이 구멍이 있었다).
        documentTypeRepository.findById(docTypeCode).ifPresent(dt -> {
            if (dt.isZkpTarget()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "이 문서 유형(" + docTypeCode + ")은 전용 업로드 화면을 통해 제출해야 합니다.");
            }
        });

        String originalName = file.getOriginalFilename();
        String ext = (originalName != null && originalName.contains("."))
                ? originalName.substring(originalName.lastIndexOf('.')) : ".pdf";
        String storedFileName = UUID.randomUUID() + ext;
        Path uploadDir = Path.of(properties.getUploadDir());
        Path storedPath = uploadDir.resolve(storedFileName);
        byte[] bytes;
        try {
            bytes = file.getBytes();
            Files.createDirectories(uploadDir);
            Files.write(storedPath, bytes);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "업로드 파일 저장에 실패했습니다.", e);
        }

        Document document = new Document();
        document.setDocTypeCode(docTypeCode);
        document.setOwnerType("DPP");
        document.setOwnerId(dppId);
        document.setSubmittedByOrg(orgId);
        document.setFileName(originalName != null ? originalName : storedFileName);
        document.setFileUri(storedPath.toString());
        document.setContentHash(sha256Hex(bytes));
        document.setMimeType(file.getContentType());
        document.setFileSize(file.getSize());
        document.setCreatedBy(userId);
        // 관리자 승인 화면이 아직 없어서 업로드 즉시 승인 처리한다 - 나중에 REQ-ADMIN 문서
        // 검수 화면이 생기면 여기를 PENDING으로 되돌리고 그 화면에서 승인/반려하게 바꿀 것.
        document.setReviewStatus("APPROVED");
        document = documentRepository.save(document);

        DocumentLink link = new DocumentLink();
        link.setDocumentId(document.getDocumentId());
        link.setDppId(dppId);
        link.setLinkType("DIRECT");
        documentLinkRepository.save(link);

        autoFillFieldsFromParsedDocument(dppId, orgId, userId, docTypeCode, file);

        // 참여 협력사가 담당 문서를 올린 경우 submit_status도 다시 계산한다 - FIELD_VALUE만
        // 보던 예전 로직으로는 문서만 올리는 역할(TEST_LAB 등)이 다 제출해도 계속
        // IN_PROGRESS로 남았다(2026-08-15, ParticipantSubmitStatusService 참고).
        if (!access.owner()) {
            participantSubmitStatusService.refresh(dpp, orgId, access.participantRoleCode());
        }

        dppRepository.recalcCompleteness(dppId);

        return getForm(userId, dppId);
    }

    /**
     * 파서가 뽑아낸 값 중 신뢰도 높은 몇 개(GTIN, 탄소발자국, 재활용성/재생함량 비율)만
     * 선별적으로 dpp_field_value에 자동 채운다 - "뽑히면 확실히 맞는 것만 뽑는다"는
     * parser/extractor.py의 원칙을 그대로 이어받아, 9종 문서 전부에 범용 확장 필드
     * (common_fields/sustainability_metrics)를 시도해보고 해당 문서 유형과 의미가 맞는
     * 필드에만 채운다. 이미 값이 있는 필드(수기 입력 포함)는 덮어쓰지 않는다 - 파서
     * 결과가 사용자가 이미 입력/수정한 값을 조용히 뒤집으면 안 되기 때문(2026-08-15).
     *
     * 파서 서비스가 죽어있거나 이 문서 유형에서 값을 못 뽑아도 업로드 자체는 그대로
     * 성공해야 한다 - 그래서 예외를 전부 삼키고 로그만 남긴다(관리자 승인 화면이 없어서
     * 업로드=승인인 이 서비스에서, 자동 채움 실패로 업로드까지 막히면 안 됨).
     */
    private void autoFillFieldsFromParsedDocument(Long dppId, Long orgId, Long userId, String docTypeCode, MultipartFile file) {
        String registryCode = REGISTRY_CODE_BY_DOC_TYPE.get(docTypeCode);
        if (registryCode == null) {
            return;
        }
        Map<String, Object> parsed;
        try {
            parsed = parserClient.parse(file, registryCode);
        } catch (RestClientException | IOException e) {
            log.warn("dppId={} docTypeCode={} 파서 자동 채움 시도 실패(업로드는 정상 진행): {}",
                    dppId, docTypeCode, e.getMessage());
            return;
        }

        fillIfEmpty(dppId, orgId, userId, "GTIN", asTrimmedString(parsed.get("gtin")));

        @SuppressWarnings("unchecked")
        Map<String, Object> sustainability = (Map<String, Object>) parsed.get("sustainability_metrics");
        if (sustainability == null) {
            return;
        }
        String carbonFootprint = asTrimmedString(sustainability.get("total_carbon_footprint_kg_co2e"));
        String recyclability = asTrimmedString(sustainability.get("recyclability_percent"));
        String recycledContent = asTrimmedString(sustainability.get("recycled_content_percent"));

        switch (docTypeCode) {
            case "PCF_REPORT" -> fillIfEmpty(dppId, orgId, userId, "PCF_VALUE", carbonFootprint);
            case "LCA_EPD" -> {
                fillIfEmpty(dppId, orgId, userId, "PCF_VALUE", carbonFootprint);
                if (recyclability != null) {
                    fillIfEmpty(dppId, orgId, userId, "RECYCLABILITY_NOTE", recyclability + "%");
                }
            }
            case "SCRAP_PROOF" -> fillIfEmpty(dppId, orgId, userId, "RECYCLED_SCRAP_RATE", recycledContent);
            default -> {
                // 나머지 6종(TECH_FILE/SOC_SDS/EU_DOC/TEST_REPORT/COO/LABEL/MANUAL)은
                // GTIN 외엔 신뢰도 있게 매핑되는 필드가 없다 - 억지로 채우지 않는다.
            }
        }
    }

    private static String asTrimmedString(Object value) {
        if (value == null) {
            return null;
        }
        String s = String.valueOf(value).trim();
        return s.isEmpty() ? null : s;
    }

    private void fillIfEmpty(Long dppId, Long orgId, Long userId, String fieldCode, String value) {
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

    private record Access(boolean owner, String participantRoleCode) {
        static Access forOwner() {
            return new Access(true, null);
        }
    }

    private Access resolveAccess(Long orgId, Dpp dpp) {
        if (orgId.equals(dpp.getOwnerOrgId())) {
            return Access.forOwner();
        }
        DppParticipant participant = participantRepository.findByDppIdAndOrgId(dpp.getDppId(), orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "해당 DPP에 접근할 권한이 없습니다."));
        return new Access(false, participant.getRoleCode());
    }

    private List<RequirementField> fieldsFor(List<String> domains, String participantRoleCode) {
        return participantRoleCode == null
                ? requirementFieldRepository.findByDomainInAndFieldKindAndStorageTargetAndAutoFalseAndActiveTrueOrderBySortOrder(
                        domains, "DOCUMENT", "DOCUMENT")
                : requirementFieldRepository.findByDomainInAndFieldKindAndStorageTargetAndResponsibleRoleAndAutoFalseAndActiveTrueOrderBySortOrder(
                        domains, "DOCUMENT", "DOCUMENT", participantRoleCode);
    }

    /**
     * document_type.is_zkp_target - "제출 필요 문서" 전체를 FE가 검증이 필요한 데이터
     * (ZKP 대상)와 형식만 확인하면 되는 문서로 나눠 보여주기 위한 값. 문서당 한 번씩
     * 쿼리하는 대신 화면에 나오는 doc_type_code들만 한 번에 배치 조회한다.
     */
    private Map<String, Boolean> zkpTargetByDocType(List<RequirementField> fields) {
        List<String> docTypeCodes = fields.stream().map(RequirementField::getLinkedDocType).distinct().toList();
        return documentTypeRepository.findAllById(docTypeCodes).stream()
                .collect(Collectors.toMap(DocumentType::getDocTypeCode, DocumentType::isZkpTarget));
    }

    private Long resolveOrgId(Long userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 사용자입니다."));
        if (user.getOrgId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "소속된 조직이 없어 문서를 등록할 수 없습니다.");
        }
        return user.getOrgId();
    }

    private static String sha256Hex(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 알고리즘을 사용할 수 없습니다.", e);
        }
    }
}
