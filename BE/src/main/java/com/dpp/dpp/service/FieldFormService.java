package com.dpp.dpp.service;

import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
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
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * "강재 기본 정보" 입력 화면(GET·POST /me/field-form*) - FE mocks/data.json의 makerFieldSets
 * (강종/규격/Heat번호 등에 "SPHC","H26-0817" 같은 예시값이 라벨과 나란히 하드코딩되어 있던
 * 자리표시자)을 requirement_field 기준정보 + dpp_field_value 실 저장값으로 대체한다.
 *
 * 이 화면은 requirement_field 전체(30개, COMMON+STEEL 필수 기준)가 아니라 storage_target=
 * 'FIELD_VALUE' AND field_kind='DATA' AND domain='STEEL'인 항목만 다룬다 - DOCUMENT
 * 종류(성적서 등 첨부 필요 항목)나 MATERIAL_COMPOSITION(화학조성), COMMON 도메인 식별자
 * 항목(UPI/GTIN/HS_CODE 등)은 이 화면 범위 밖이다. 그래서 이 화면만 다 채워도 DPP
 * 완성도가 100%가 되는 일은 없다 - 나머지는 문서 업로드(com.dpp.document)나 다른 화면의
 * 몫이고, 지금은 그 화면들이 아직 없다. 완성도는 fn_recalc_completeness가 매기는 진짜
 * 값을 그대로 보여준다 - 이 화면만으로 100%를 흉내내지 않는다.
 *
 * 협력사(dpp_participant) 접근: DPP 소유 조직(OWNER)은 이 도메인의 모든 FIELD_VALUE 항목을
 * 보고 쓸 수 있고, 초대받아 가입한 참여 협력사(PARTICIPANT)는 자기 role_code가 담당인
 * 항목만 보고 쓸 수 있다(예: RAW_SUPPLIER는 재생 스크랩 함유율·스크랩 출처 2개뿐). 새 DPP
 * 생성(dppId 없이 저장)은 OWNER만 할 수 있다 - 참여 협력사는 항상 이미 존재하는 dppId로만
 * 접근한다.
 */
@Service
public class FieldFormService {

    private static final String DOMAIN = "STEEL";

    private final UserAccountRepository userAccountRepository;
    private final ProductModelRepository productModelRepository;
    private final DppQueryRepository dppRepository;
    private final RequirementFieldRepository requirementFieldRepository;
    private final DppFieldValueRepository fieldValueRepository;
    private final DppParticipantRepository participantRepository;

    public FieldFormService(UserAccountRepository userAccountRepository,
                             ProductModelRepository productModelRepository,
                             DppQueryRepository dppRepository,
                             RequirementFieldRepository requirementFieldRepository,
                             DppFieldValueRepository fieldValueRepository,
                             DppParticipantRepository participantRepository) {
        this.userAccountRepository = userAccountRepository;
        this.productModelRepository = productModelRepository;
        this.dppRepository = dppRepository;
        this.requirementFieldRepository = requirementFieldRepository;
        this.fieldValueRepository = fieldValueRepository;
        this.participantRepository = participantRepository;
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
        Object[] fresh = dppRepository.findStatusAndCompleteness(dpp.getDppId());
        String status = (String) fresh[0];
        double completeness = ((Number) fresh[1]).doubleValue();
        int filled = ((Number) fresh[2]).intValue();
        int required = ((Number) fresh[3]).intValue();

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
            updateParticipantStatus(dpp.getDppId(), orgId, access.participantRoleCode());
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
        return getForm(userId, dpp.getDppId());
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
                ? requirementFieldRepository.findByDomainAndFieldKindAndStorageTargetAndAutoFalseAndActiveTrueOrderBySortOrder(
                        DOMAIN, "DATA", "FIELD_VALUE")
                : requirementFieldRepository.findByDomainAndFieldKindAndStorageTargetAndResponsibleRoleAndAutoFalseAndActiveTrueOrderBySortOrder(
                        DOMAIN, "DATA", "FIELD_VALUE", participantRoleCode);
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

    // 참여 협력사가 저장할 때마다 dpp_participant.submit_status를 갱신한다 - 자기 담당
    // 필드가 전부 채워졌으면 SUBMITTED(+completed_at), 일부만 채워졌으면 IN_PROGRESS.
    // 이게 있어야 대시보드/초대 이력에서 "이 협력사가 제출을 끝냈는지"를 알 수 있다.
    private void updateParticipantStatus(Long dppId, Long orgId, String roleCode) {
        DppParticipant participant = participantRepository.findByDppIdAndOrgId(dppId, orgId).orElse(null);
        if (participant == null) {
            return;
        }
        List<String> myFieldCodes = fieldsFor(roleCode).stream().map(RequirementField::getFieldCode).toList();
        Map<String, String> existingValues = fieldValueRepository.findByDppId(dppId).stream()
                .collect(Collectors.toMap(DppFieldValue::getFieldCode, DppFieldValue::getValueText, (a, b) -> b));
        boolean allFilled = !myFieldCodes.isEmpty()
                && myFieldCodes.stream().allMatch(fc -> {
                    String v = existingValues.get(fc);
                    return v != null && !v.isBlank();
                });
        if (allFilled) {
            participant.setSubmitStatus("SUBMITTED");
            participant.setCompletedAt(OffsetDateTime.now());
        } else {
            participant.setSubmitStatus("IN_PROGRESS");
        }
        participantRepository.save(participant);
    }

    private void recalc(Long dppId) {
        dppRepository.recalcCompleteness(dppId);
    }
}
