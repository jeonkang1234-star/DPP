package com.dpp.dpp.service;

import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.dpp.dto.FieldFormItemDto;
import com.dpp.dpp.dto.FieldFormResponse;
import com.dpp.dpp.dto.SaveFieldFormRequest;
import com.dpp.dpp.entity.Dpp;
import com.dpp.dpp.entity.DppFieldValue;
import com.dpp.dpp.entity.ProductModel;
import com.dpp.dpp.entity.RequirementField;
import com.dpp.dpp.repository.DppFieldValueRepository;
import com.dpp.dpp.repository.DppQueryRepository;
import com.dpp.dpp.repository.ProductModelRepository;
import com.dpp.dpp.repository.RequirementFieldRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
 */
@Service
public class FieldFormService {

    private static final String DOMAIN = "STEEL";

    private final UserAccountRepository userAccountRepository;
    private final ProductModelRepository productModelRepository;
    private final DppQueryRepository dppRepository;
    private final RequirementFieldRepository requirementFieldRepository;
    private final DppFieldValueRepository fieldValueRepository;

    public FieldFormService(UserAccountRepository userAccountRepository,
                             ProductModelRepository productModelRepository,
                             DppQueryRepository dppRepository,
                             RequirementFieldRepository requirementFieldRepository,
                             DppFieldValueRepository fieldValueRepository) {
        this.userAccountRepository = userAccountRepository;
        this.productModelRepository = productModelRepository;
        this.dppRepository = dppRepository;
        this.requirementFieldRepository = requirementFieldRepository;
        this.fieldValueRepository = fieldValueRepository;
    }

    @Transactional(readOnly = true)
    public FieldFormResponse getForm(Long userId, Long dppId) {
        Long orgId = resolveOrgId(userId);
        Dpp dpp = dppId != null ? loadOwnedDpp(dppId, orgId) : null;

        Map<String, String> existingValues = dpp == null
                ? Map.of()
                : fieldValueRepository.findByDppId(dpp.getDppId()).stream()
                    .collect(Collectors.toMap(DppFieldValue::getFieldCode, DppFieldValue::getValueText, (a, b) -> b));

        List<FieldFormItemDto> fields = requirementFieldRepository
                .findByDomainAndFieldKindAndStorageTargetAndAutoFalseAndActiveTrueOrderBySortOrder(
                        DOMAIN, "DATA", "FIELD_VALUE")
                .stream()
                .map(rf -> new FieldFormItemDto(
                        rf.getFieldCode(), rf.getSection(), rf.getLabelKo(), rf.getUnit(), rf.getHelpText(),
                        rf.isRequired(), existingValues.get(rf.getFieldCode())))
                .toList();

        if (dpp == null) {
            return new FieldFormResponse(null, DOMAIN, "DRAFT", 0.0, 0, 0, fields);
        }

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
        Dpp dpp = request.dppId() != null
                ? loadOwnedDpp(request.dppId(), orgId)
                : createDraftDpp(orgId, request.values());

        upsertValues(dpp.getDppId(), orgId, userId, request.values());
        recalc(dpp.getDppId());
        return getForm(userId, dpp.getDppId());
    }

    @Transactional
    public FieldFormResponse issue(Long userId, Long dppId) {
        Long orgId = resolveOrgId(userId);
        Dpp dpp = loadOwnedDpp(dppId, orgId);
        dpp.setStatus("PENDING");
        dpp.setIssuedAt(OffsetDateTime.now());
        dppRepository.save(dpp);
        recalc(dpp.getDppId());
        return getForm(userId, dpp.getDppId());
    }

    private Long resolveOrgId(Long userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 사용자입니다."));
        if (user.getOrgId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "소속된 조직이 없어 DPP를 등록할 수 없습니다.");
        }
        return user.getOrgId();
    }

    private Dpp loadOwnedDpp(Long dppId, Long orgId) {
        Dpp dpp = dppRepository.findById(dppId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "DPP를 찾을 수 없습니다."));
        if (!orgId.equals(dpp.getOwnerOrgId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "해당 DPP에 접근할 권한이 없습니다.");
        }
        return dpp;
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

    private void upsertValues(Long dppId, Long orgId, Long userId, Map<String, String> values) {
        if (values == null) {
            return;
        }
        for (Map.Entry<String, String> entry : values.entrySet()) {
            String text = entry.getValue();
            if (text == null || text.isBlank()) {
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
