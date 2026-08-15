package com.dpp.dpp.service;

import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.blockchain.client.BlockchainClient;
import com.dpp.blockchain.entity.BlockchainAnchor;
import com.dpp.blockchain.repository.BlockchainAnchorRepository;
import com.dpp.dpp.dto.FieldFormItemDto;
import com.dpp.dpp.dto.FieldFormResponse;
import com.dpp.dpp.dto.SaveFieldFormRequest;
import com.dpp.dpp.entity.Dpp;
import com.dpp.dpp.entity.DppFieldValue;
import com.dpp.dpp.entity.DppParticipant;
import com.dpp.dpp.entity.ProductModel;
import com.dpp.dpp.entity.RequirementField;
import com.dpp.dpp.repository.DppFieldValueRepository;
import com.dpp.dpp.repository.DppParticipantRepository;
import com.dpp.dpp.repository.DppQueryRepository;
import com.dpp.dpp.repository.ProductModelRepository;
import com.dpp.dpp.repository.RequirementFieldRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * "강재 기본 정보" 입력 화면(GET·POST /me/field-form*) - FE mocks/data.json의 makerFieldSets
 * (강종/규격/Heat번호 등에 "SPHC","H26-0817" 같은 예시값이 라벨과 나란히 하드코딩되어 있던
 * 자리표시자)을 requirement_field 기준정보 + dpp_field_value 실 저장값으로 대체한다.
 *
 * 이 화면은 requirement_field 전체(30개, COMMON+STEEL 필수 기준)가 아니라 storage_target=
 * 'FIELD_VALUE' AND field_kind='DATA'이고 domain이 COMMON 또는 STEEL인 항목만 다룬다
 * (2026-08-14부터 COMMON도 포함 - fn_recalc_completeness/v_dpp_missing_field는 처음부터
 * "rf.domain IN ('COMMON', d.domain)"으로 완성도를 매겨왔는데, 이 화면은 한동안 STEEL만
 * 보여줘서 식별자/경제운영자/탄소/순환 정보 COMMON 필드를 입력할 방법이 아예 없었다).
 * DOCUMENT 종류(성적서 등 첨부 필요 항목)나 MATERIAL_COMPOSITION(화학조성, CHEM_COMPOSITION/
 * SOC_LIST)은 여전히 이 화면 범위 밖이다 - 다중 원소 입력 등 별도 UI가 필요해서 아직
 * 손대지 않았다. 그래서 이 화면만 다 채워도 DPP 완성도가 100%가 되는 일은 없다 - 나머지는
 * 문서 업로드(com.dpp.document)나 다른 화면의 몫이고, 지금은 그 화면들이 아직 없다.
 * 완성도는 fn_recalc_completeness가 매기는 진짜 값을 그대로 보여준다 - 이 화면만으로
 * 100%를 흉내내지 않는다.
 *
 * 협력사(dpp_participant) 접근: DPP 소유 조직(OWNER)은 이 도메인의 모든 FIELD_VALUE 항목을
 * 보고 쓸 수 있고, 초대받아 가입한 참여 협력사(PARTICIPANT)는 자기 role_code가 담당인
 * 항목만 보고 쓸 수 있다(예: RAW_SUPPLIER는 재생 스크랩 함유율·스크랩 출처 2개뿐). 새 DPP
 * 생성(dppId 없이 저장)은 OWNER만 할 수 있다 - 참여 협력사는 항상 이미 존재하는 dppId로만
 * 접근한다.
 */
@Service
public class FieldFormService {

    private static final Logger log = LoggerFactory.getLogger(FieldFormService.class);
    private static final DateTimeFormatter TIMESTAMP_FORMAT = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    private static final String DOMAIN = "STEEL";
    // "강재 기본 정보" 화면이 다루는 requirement_field.domain 범위. 원래 STEEL만 조회했는데
    // fn_recalc_completeness/v_dpp_missing_field(V2__functions.sql)는 처음부터
    // "rf.domain IN ('COMMON', d.domain)"으로 완성도를 매겨왔다 - 즉 COMMON 필드가 항상
    // 분모에 포함돼 있었는데 입력할 화면만 없었다(2026-08-14 확인 후 여기서 따라잡음).
    private static final List<String> FIELD_DOMAINS = List.of("COMMON", DOMAIN);

    private final UserAccountRepository userAccountRepository;
    private final ProductModelRepository productModelRepository;
    private final DppQueryRepository dppRepository;
    private final RequirementFieldRepository requirementFieldRepository;
    private final DppFieldValueRepository fieldValueRepository;
    private final DppParticipantRepository participantRepository;
    private final ParticipantSubmitStatusService participantSubmitStatusService;
    private final BlockchainAnchorRepository blockchainAnchorRepository;
    private final Optional<BlockchainClient> blockchainClient;

    public FieldFormService(UserAccountRepository userAccountRepository,
                             ProductModelRepository productModelRepository,
                             DppQueryRepository dppRepository,
                             RequirementFieldRepository requirementFieldRepository,
                             DppFieldValueRepository fieldValueRepository,
                             DppParticipantRepository participantRepository,
                             ParticipantSubmitStatusService participantSubmitStatusService,
                             BlockchainAnchorRepository blockchainAnchorRepository,
                             Optional<BlockchainClient> blockchainClient) {
        this.userAccountRepository = userAccountRepository;
        this.productModelRepository = productModelRepository;
        this.dppRepository = dppRepository;
        this.requirementFieldRepository = requirementFieldRepository;
        this.fieldValueRepository = fieldValueRepository;
        this.participantRepository = participantRepository;
        this.participantSubmitStatusService = participantSubmitStatusService;
        this.blockchainAnchorRepository = blockchainAnchorRepository;
        this.blockchainClient = blockchainClient;
    }

    @Transactional(readOnly = true)
    public FieldFormResponse getForm(Long userId, Long dppId) {
        Long orgId = resolveOrgId(userId);

        if (dppId == null) {
            // 새 DPP 초안 - 아직 dpp 행이 없으니 참여 협력사 개념 자체가 성립하지 않는다.
            // OWNER가 처음 폼을 여는 경우만 여기로 들어온다. 값은 아직 하나도 없으니 전부 null.
            List<FieldFormItemDto> allFields = fieldsFor(null).stream()
                    .map(f -> new FieldFormItemDto(f.getFieldCode(), f.getSection(), f.getLabelKo(), f.getUnit(),
                            f.getHelpText(), f.isRequired(), null))
                    .toList();
            return new FieldFormResponse(null, DOMAIN, "DRAFT", 0.0, 0, 0, allFields);
        }

        Dpp dpp = dppRepository.findById(dppId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "DPP를 찾을 수 없습니다."));
        Access access = resolveAccess(orgId, dpp);

        Map<String, String> existingValues = fieldValueRepository.findByDppId(dpp.getDppId()).stream()
                .collect(Collectors.toMap(DppFieldValue::getFieldCode, DppFieldValue::getValueText, (a, b) -> b));

        List<FieldFormItemDto> fields = fieldsFor(access.participantRoleCode()).stream()
                .map(f -> new FieldFormItemDto(f.getFieldCode(), f.getSection(), f.getLabelKo(), f.getUnit(), f.getHelpText(),
                        f.isRequired(), existingValues.get(f.getFieldCode())))
                .toList();

        // dpp 엔티티가 아니라 별도 스칼라 프로젝션으로 다시 읽는다 - saveDraft/issue가 같은
        // 트랜잭션 안에서 recalcCompleteness(네이티브 UPDATE) 직후 이 메서드를 호출하는데,
        // 이미 로드된 엔티티를 그대로 읽으면 1차 캐시 때문에 recalc 이전 값이 보인다
        // (DppQueryRepository.findStatusAndCompleteness 주석 참고).
        List<Object[]> freshRows = dppRepository.findStatusAndCompleteness(dpp.getDppId());
        Object[] fresh = freshRows.isEmpty() ? new Object[]{dpp.getStatus(), 0, 0, 0} : freshRows.get(0);
        String status = (String) fresh[0];

        // 참여 협력사에게는 DPP 전체 완성도를 보여주지 않는다 - "본인이 올려야 하는 사항의
        // 제출 완료 여부"만 볼 수 있어야 한다는 요구사항(2026-08-15)이라, completeness/
        // filled/required 세 숫자를 DPP 전체 기준이 아니라 이 참여자의 담당 필드(fields)
        // 기준으로 다시 계산해서 내려준다. status(DRAFT/PENDING/ISSUED)만 예외로 그대로
        // 보여준다 - 이미 발급된 DPP에 뒤늦게 입력해도 소용없다는 걸 알아야 하는 최소한의
        // 운영 정보라 "DPP 상세"로 보지 않았다. OWNER는 기존대로 DPP 전체 값을 본다.
        double completeness;
        int filled;
        int required;
        if (access.owner()) {
            completeness = ((Number) fresh[1]).doubleValue();
            filled = ((Number) fresh[2]).intValue();
            required = ((Number) fresh[3]).intValue();
        } else {
            int myRequired = (int) fields.stream().filter(FieldFormItemDto::required).count();
            int myFilled = (int) fields.stream()
                    .filter(FieldFormItemDto::required)
                    .filter(f -> f.value() != null && !f.value().isBlank())
                    .count();
            required = myRequired;
            filled = myFilled;
            completeness = myRequired > 0 ? (myFilled * 100.0 / myRequired) : 0.0;
        }

        return new FieldFormResponse(dpp.getDppId(), DOMAIN, status, completeness, filled, required, fields);
    }

    @Transactional
    public FieldFormResponse saveDraft(Long userId, SaveFieldFormRequest request) {
        Long orgId = resolveOrgId(userId);
        Dpp dpp;
        Access access;
        if (request.dppId() != null) {
            dpp = dppRepository.findById(request.dppId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "DPP를 찾을 수 없습니다."));
            access = resolveAccess(orgId, dpp);
        } else {
            dpp = createDraftDpp(orgId, request.values());
            access = Access.forOwner();
        }

        upsertValues(dpp.getDppId(), orgId, userId, request.values(), access.participantRoleCode());
        recalc(dpp.getDppId());
        if (!access.owner()) {
            participantSubmitStatusService.refresh(dpp, orgId, access.participantRoleCode());
        }
        return getForm(userId, dpp.getDppId());
    }

    @Transactional
    public FieldFormResponse issue(Long userId, Long dppId) {
        Long orgId = resolveOrgId(userId);
        Dpp dpp = dppRepository.findById(dppId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "DPP를 찾을 수 없습니다."));
        // 발급은 DPP 소유 조직만 할 수 있다 - 참여 협력사는 자기 담당 필드만 채워 넘길 뿐,
        // 최종 발급 여부는 소유 조직이 결정한다.
        if (!orgId.equals(dpp.getOwnerOrgId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "해당 DPP를 발급할 권한이 없습니다.");
        }
        dpp.setStatus("PENDING");
        dpp.setIssuedAt(OffsetDateTime.now());
        dppRepository.save(dpp);
        recalc(dpp.getDppId());
        anchorDppSnapshot(dpp, userId, orgId);
        return getForm(userId, dpp.getDppId());
    }

    /**
     * 문서 업로드 시점 앵커링(DocumentIngestService, target_type='DOCUMENT'/'EVENT')과
     * 이 발급 시점 앵커링(target_type='DPP_SNAPSHOT')은 서로 대체 관계가 아니라 각자 다른
     * 질문에 답한다 - 전자는 "이 개별 문서/증명이 그 시점에 존재·검증됐는가"(문서 단위
     * 출처 증명, DPP가 완성되기 전부터 여러 시점에 걸쳐 하나씩 쌓인다), 후자는 "발급된
     * DPP 전체(문서화 안 된 dpp_field_value 포함)가 그 순간 정확히 이 내용이었는가"(발급물
     * 단위 무결성 증명, 발급 이후 값이 몰래 바뀌어도 개별 문서 해시만으로는 못 잡아낸다).
     * 세관·소비자가 QR로 보는 건 "발급된 DPP"이므로 후자가 빠지면 발급 이후 변조를
     * 검증할 방법이 없었다(2026-08-15, 강 지적). fn_create_dpp_snapshot(V2__functions.sql)이
     * 이미 만들어져 있었지만 어디서도 호출되지 않아서 이번에 처음 연결한다.
     *
     * 실패해도 발급 자체를 막지 않는다 - 앵커링은 부가 증빙이지 발급의 필요조건이 아니다.
     */
    private void anchorDppSnapshot(Dpp dpp, Long userId, Long orgId) {
        Long snapshotId;
        try {
            snapshotId = dppRepository.createSnapshot(dpp.getDppId(), "ISSUE", userId);
        } catch (Exception e) {
            log.warn("dppId={} 발급 스냅샷 생성 실패 - 발급 자체는 계속 진행: {}", dpp.getDppId(), e.getMessage(), e);
            return;
        }
        if (snapshotId == null || blockchainClient.isEmpty()) {
            return;
        }
        String contentHash = dppRepository.findSnapshotContentHash(snapshotId);
        if (contentHash == null) {
            return;
        }
        Optional<BlockchainAnchor> anchorOpt =
                blockchainAnchorRepository.findFirstByTargetTypeAndTargetIdOrderByAnchorIdDesc("DPP_SNAPSHOT", snapshotId);
        if (anchorOpt.isEmpty()) {
            return;
        }
        BlockchainAnchor anchor = anchorOpt.get();
        try {
            BlockchainClient.ChainResult result = blockchainClient.get().recordDocumentHash(
                    "snapshot:" + snapshotId,
                    "DPP_SNAPSHOT",
                    contentHash,
                    orgId.toString(),
                    OffsetDateTime.now().format(TIMESTAMP_FORMAT));
            anchor.setTxId(result.txId());
            anchor.setStatus("CONFIRMED");
            anchor.setAnchoredAt(OffsetDateTime.now());
            blockchainAnchorRepository.save(anchor);
        } catch (Exception e) {
            log.warn("snapshotId={} 블록체인 앵커링 실패: {}", snapshotId, e.getMessage(), e);
            anchor.setStatus("FAILED");
            anchor.setErrorMessage(truncate(e.getMessage(), 500));
            blockchainAnchorRepository.save(anchor);
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return null;
        }
        return s.length() > max ? s.substring(0, max) : s;
    }

    /**
     * OWNER면 participantRoleCode가 null(=담당 구분 없이 전체 접근), 참여 협력사면 자기
     * role_code가 담긴다. 정적 팩토리 메서드 이름을 owner()가 아니라 forOwner()로 지은
     * 이유: 레코드 컴포넌트 이름이 owner라서 컴파일러가 그 이름으로 인스턴스 접근자
     * boolean owner()를 자동 생성하는데, 정적 메서드까지 같은 이름 owner()로 두면
     * 시그니처가 겹쳐서 컴파일이 깨진다(2026-08-13 실제로 이걸로 로컬 빌드가 깨졌었음 -
     * "bad operand type Access for unary operator '!'", "accessor method must be public").
     */
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

    private List<RequirementField> fieldsFor(String participantRoleCode) {
        return participantRoleCode == null
                ? requirementFieldRepository.findByDomainInAndFieldKindAndStorageTargetAndAutoFalseAndActiveTrueOrderBySortOrder(
                        FIELD_DOMAINS, "DATA", "FIELD_VALUE")
                : requirementFieldRepository.findByDomainInAndFieldKindAndStorageTargetAndResponsibleRoleAndAutoFalseAndActiveTrueOrderBySortOrder(
                        FIELD_DOMAINS, "DATA", "FIELD_VALUE", participantRoleCode);
    }

    private Long resolveOrgId(Long userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 사용자입니다."));
        if (user.getOrgId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "소속된 조직이 없어 DPP를 등록할 수 없습니다.");
        }
        return user.getOrgId();
    }

    // 새 DPP 발급 화면은 기존 제품(product_model)을 고르는 UI가 아직 없어서, 첫 임시저장
    // 시점에 product_model 1건 + dpp 1건을 함께 만든다. model_name은 이 화면이 수집하는
    // 값 중 제품명에 가장 가까운 STEEL_GRADE(강종)로 채우고, 없으면 자리표시자를 쓴다 -
    // 나중에 "제품 선택/등록" 화면이 생기면 이 자동 생성 로직은 걷어낼 것.
    private Dpp createDraftDpp(Long orgId, Map<String, String> values) {
        String grade = values != null ? values.get("STEEL_GRADE") : null;

        ProductModel model = new ProductModel();
        model.setOrgId(orgId);
        model.setInternalSku(DOMAIN + "-" + orgId + "-" + System.currentTimeMillis());
        model.setModelName((grade == null || grade.isBlank()) ? "미입력 철강 제품" : grade);
        model.setDomain(DOMAIN);
        model.setStatus("DRAFT");
        model = productModelRepository.save(model);

        Dpp dpp = new Dpp();
        // dpp.public_uuid는 NOT NULL(DB 디폴트 없음, V1__schema.sql) - 소비자용 조회
        // URL/QR에 실제로 쓰이는 값이라 발급 시점이 아니라 생성 시점에 미리 받아둔다.
        // 이 줄이 빠져 있어서 첫 임시저장(DPP 신규 생성)마다 insert 자체가 500으로
        // 죽는 버그였다(2026-08-15 발견).
        dpp.setPublicUuid(UUID.randomUUID());
        dpp.setModelId(model.getModelId());
        dpp.setOwnerOrgId(orgId);
        dpp.setDomain(DOMAIN);
        dpp.setStatus("DRAFT");
        return dppRepository.save(dpp);
    }

    private void upsertValues(Long dppId, Long orgId, Long userId, Map<String, String> values, String participantRoleCode) {
        if (values == null) {
            return;
        }
        // 참여 협력사는 자기 role_code가 담당인 필드만 저장할 수 있다 - FE는 애초에 그
        // 필드만 보여주지만, 서버에서도 한 번 더 막는다(요청을 조작해서 남의 필드를
        // 끼워 보내는 경우 방지).
        Set<String> allowedFieldCodes = participantRoleCode == null
                ? null
                : fieldsFor(participantRoleCode).stream().map(RequirementField::getFieldCode).collect(Collectors.toSet());

        for (Map.Entry<String, String> entry : values.entrySet()) {
            String text = entry.getValue();
            if (text == null || text.isBlank()) {
                continue;
            }
            if (allowedFieldCodes != null && !allowedFieldCodes.contains(entry.getKey())) {
                continue;
            }
            DppFieldValue value = fieldValueRepository.findByDppIdAndFieldCode(dppId, entry.getKey())
                    .orElseGet(() -> {
                        DppFieldValue v = new DppFieldValue();
                        v.setDppId(dppId);
                        v.setFieldCode(entry.getKey());
                        return v;
                    });
            value.setValueText(text);
            value.setSubmittedByOrg(orgId);
            value.setSubmittedByUser(userId);
            value.setUpdatedAt(OffsetDateTime.now());
            fieldValueRepository.save(value);
        }
    }

    private void recalc(Long dppId) {
        dppRepository.recalcCompleteness(dppId);
    }
}
