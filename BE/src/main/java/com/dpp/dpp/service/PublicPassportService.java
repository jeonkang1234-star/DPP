package com.dpp.dpp.service;

import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.document.repository.ZkpProofRepository;
import com.dpp.mypage.entity.Organization;
import com.dpp.mypage.repository.OrganizationRepository;
import com.dpp.dpp.dto.PublicPassportFieldDto;
import com.dpp.dpp.dto.PublicPassportResponse;
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

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * GET /public/dpp/{publicUuid} - 로그인 없이 QR/링크로 DPP를 조회하는 화면의 데이터 소스
 * (2026-08-18, 강 요청 - "QR코드가 제 기능을 안함", 기존엔 QR이 순수 텍스트만 인코딩해서
 * 스캔하면 구글 검색으로 빠졌다). SecurityConfig에서 /public/** 는 permitAll이라 인증
 * 없이 호출된다 - 그래서 여기는 FieldFormService처럼 조직 소유권/참여자 권한을 따지지
 * 않고, "발급된 DPP인가"만 확인한다. 발급 전(DRAFT, issuedAt == null) DPP는 초안이라
 * 공개하지 않는다.
 *
 * ■ 2026-08-19 - 공개범위 적용
 * 그 전까지 이 서비스는 값이 채워진 필드를 전부 공개했다. 인증도 티어도 안 보고 그냥 전부다.
 * 그래서 히트번호(HEAT_NO), 용광로 식별자(FURNACE_ID), 염색공장 ID(DYEING_FACILITY_ID),
 * 배터리 공장 ID(BATTERY_PLANT_ID)까지 QR만 찍으면 누구나 볼 수 있었다. field_visibility
 * 테이블이 V4 때부터 "티어1에서는 숨김"이라고 말하고 있었는데 자바 코드가 그걸 한 번도
 * 읽지 않았다.
 *
 * 이제 requirement_field.disclosure_scope를 기준으로 세 갈래로 나눈다.
 *   PUBLIC       : 값을 그대로 보여준다. (Annex XIII 1 + Annex VI Part A 계열)
 *   RESTRICTED   : 목록에 넣지 않는다. 정당한 이익 보유자·인증기관·시장감시당국 전용
 *                  (Annex XIII 2·3·4)이라 공개 페이지에는 값도 라벨도 내보내지 않는다.
 *   TRADE_SECRET : 값을 빼고 "한계값 충족(ZKP 검증됨)"만 남긴다. 성분 실측치처럼 공개하면
 *                  경쟁사에 원가 구조가 드러나는 항목인데, 규제 목적상 필요한 건 값 자체가
 *                  아니라 "한계값을 지켰는가"뿐이다. 단, 이 DPP에 VERIFIED 증명이 실제로
 *                  있을 때만 그렇게 쓴다 - 증명이 없는데 충족했다고 쓰면 그게 제일 나쁜
 *                  거짓말이라, 증명이 없으면 그냥 RESTRICTED처럼 감춘다.
 *
 * 몇 개가 왜 빠졌는지는 개수로 알린다(restrictedCount/tradeSecretCount). 항목의 존재
 * 자체를 숨기지는 않는다 - 배터리규정도 접근 권한을 계층으로 나누지, 항목 목록을 비밀로
 * 하지는 않는다.
 */
@Service
public class PublicPassportService {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ISO_LOCAL_DATE;

    private static final PublicPassportResponse NOT_ISSUED =
            new PublicPassportResponse(false, null, null, null, null, List.of(), 0, 0, "PUBLIC", "일반 공개");

    /** disclosure_scope가 비어 있는 행(구 시드)은 공개로 본다 - V20이 DEFAULT 'PUBLIC'을 준다. */
    private static final String PUBLIC = "PUBLIC";
    private static final String TRADE_SECRET = "TRADE_SECRET";
    /** 제한 항목까지 볼 수 있는 자격. Annex XIII의 "정당한 이익 보유자·시장감시당국" 계층. */
    private static final Set<String> RESTRICTED_VIEWERS = Set.of("CUSTOMS", "EU_AUTHORITY", "ADMIN");

    private final DppQueryRepository dppRepository;
    private final ProductModelRepository productModelRepository;
    private final RequirementFieldRepository requirementFieldRepository;
    private final DppFieldValueRepository fieldValueRepository;
    private final ZkpProofRepository zkpProofRepository;
    private final UserAccountRepository userAccountRepository;
    private final OrganizationRepository organizationRepository;

    public PublicPassportService(DppQueryRepository dppRepository,
                                  ProductModelRepository productModelRepository,
                                  RequirementFieldRepository requirementFieldRepository,
                                  DppFieldValueRepository fieldValueRepository,
                                  ZkpProofRepository zkpProofRepository,
                                  UserAccountRepository userAccountRepository,
                                  OrganizationRepository organizationRepository) {
        this.dppRepository = dppRepository;
        this.productModelRepository = productModelRepository;
        this.requirementFieldRepository = requirementFieldRepository;
        this.fieldValueRepository = fieldValueRepository;
        this.zkpProofRepository = zkpProofRepository;
        this.userAccountRepository = userAccountRepository;
        this.organizationRepository = organizationRepository;
    }

    /** 토큰 없이 부르던 기존 호출부 호환용 - 일반 공개 뷰. */
    @Transactional(readOnly = true)
    public PublicPassportResponse getByPublicUuid(UUID publicUuid) {
        return getByPublicUuid(publicUuid, null);
    }

    /**
     * @param viewerUserId 요청에 유효한 토큰이 실려 있으면 그 사용자 id, 아니면 null.
     *     이 값으로 자격을 정한다 - 세관·시장감시당국·운영자는 제한(RESTRICTED) 항목까지
     *     본다(2026-08-21 강 요청 "QR로 볼 때 개인·세관·EU가 보는 결과가 달라야 함").
     *     영업비밀 실측값은 어느 자격이든 못 본다 - 애초에 저장하지 않는다.
     */
    @Transactional(readOnly = true)
    public PublicPassportResponse getByPublicUuid(UUID publicUuid, Long viewerUserId) {
        Dpp dpp = dppRepository.findByPublicUuidAndDeletedAtIsNull(publicUuid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 DPP를 찾을 수 없습니다."));

        if (dpp.getIssuedAt() == null) {
            return NOT_ISSUED;
        }

        String viewerRole = resolveViewerRole(viewerUserId);
        boolean canSeeRestricted = RESTRICTED_VIEWERS.contains(viewerRole);

        ProductModel model = productModelRepository.findById(dpp.getModelId()).orElse(null);

        // FieldFormService.fieldsFor와 같은 조회(COMMON + 이 DPP의 도메인, DATA/FIELD_VALUE,
        // is_auto=false) - 협력사 role 구분 없이 전체를 본다(공개 페이지엔 "누가 담당인지"가
        // 아니라 "값이 뭔지"만 필요).
        List<RequirementField> fields = requirementFieldRepository
                .findByDomainInAndFieldKindAndStorageTargetAndAutoFalseAndActiveTrueOrderBySortOrder(
                        List.of("COMMON", dpp.getDomain()), "DATA", "FIELD_VALUE");

        Map<String, String> values = fieldValueRepository.findByDppId(dpp.getDppId()).stream()
                .collect(Collectors.toMap(DppFieldValue::getFieldCode, DppFieldValue::getValueText, (a, b) -> b));

        boolean hasVerifiedProof = !zkpProofRepository.findByDppIdAndStatus(dpp.getDppId(), "VERIFIED").isEmpty();

        List<PublicPassportFieldDto> visible = new ArrayList<>();
        int restricted = 0;
        int tradeSecret = 0;

        for (RequirementField f : fields) {
            String value = values.get(f.getFieldCode());
            // 미입력 항목은 공개 페이지에 안 보여준다 - 채워진 값만 노출한다. 숨김 개수에도
            // 넣지 않는다("값이 없는 것"과 "권한이 없어 못 보는 것"은 다른 얘기다).
            if (value == null || value.isBlank()) {
                continue;
            }
            String scope = f.getDisclosureScope() == null ? PUBLIC : f.getDisclosureScope();

            if (PUBLIC.equals(scope)) {
                visible.add(new PublicPassportFieldDto(f.getLabelKo(), f.getLabelEn(), f.getSection(),
                        f.getTier(), value, null));
            } else if (TRADE_SECRET.equals(scope)) {
                tradeSecret++;
                if (hasVerifiedProof) {
                    visible.add(new PublicPassportFieldDto(f.getLabelKo(), f.getLabelEn(), f.getSection(),
                            f.getTier(), null, "한계값 충족 (영지식증명으로 검증됨)"));
                }
            } else {
                // RESTRICTED - 세관·시장감시당국·운영자에게만 값을 준다. 그 외에는
                // 개수만 세어 "몇 개가 왜 빠졌는지"를 알린다.
                if (canSeeRestricted) {
                    visible.add(new PublicPassportFieldDto(f.getLabelKo(), f.getLabelEn(), f.getSection(),
                            f.getTier(), value, null));
                } else {
                    restricted++;
                }
            }
        }

        return new PublicPassportResponse(
                true,
                model != null ? model.getInternalSku() : null,
                resolveProductName(model, dpp, values),
                dpp.getDomain(),
                dpp.getIssuedAt().toLocalDate().format(DATE_FORMAT),
                List.copyOf(visible),
                restricted,
                tradeSecret,
                viewerRole,
                viewerLabel(viewerRole)
        );
    }

    /**
     * 공개 여권에 띄울 제품명.
     *
     * product_model.model_name은 예전엔 DPP를 처음 임시저장하는 순간에만 정해졌고,
     * 그때 제품명 칸이 비어 있으면 "미입력 철강 제품" 같은 자리표시자가 그대로 남았다.
     * 나중에 제품명을 채워도 그 값은 dpp_field_value로만 들어가서, QR로 열면 언제나
     * "미입력 ..."이 보였다(2026-08-23 강 지적). FieldFormService.syncModelName이
     * 이제 저장할 때마다 model_name을 다시 맞추지만, 그 수정 전에 발급된 DPP는 여전히
     * 자리표시자를 들고 있다. 그래서 읽는 쪽에서도 한 번 더 대체 이름을 찾는다.
     *
     * 순서는 (1) 자리표시자가 아닌 model_name, (2) 도메인별 제품명 필드 값,
     * (3) 소유 조직이 붙인 DPP 이름. 전부 없으면 마지막에 model_name을 그대로 준다
     * (자리표시자라도 화면이 완전히 비는 것보다는 낫다).
     */
    private String resolveProductName(ProductModel model, Dpp dpp, Map<String, String> values) {
        String modelName = model != null ? model.getModelName() : null;
        String fieldValue = values.get(ProductNaming.nameFieldCode(dpp.getDomain()));
        String resolved = ProductNaming.firstRealName(modelName, fieldValue, dpp.getDisplayName());
        return resolved != null ? resolved : modelName;
    }

    /**
     * 요청자의 자격. 토큰이 없거나 계정을 못 찾으면 PUBLIC.
     * NotificationService.resolveViewerRole과 같은 규칙이다 - 운영자는 계정 종류(ADMIN),
     * 나머지는 소속 조직의 org_type.
     */
    private String resolveViewerRole(Long viewerUserId) {
        if (viewerUserId == null) {
            return PUBLIC;
        }
        UserAccount user = userAccountRepository.findById(viewerUserId).orElse(null);
        if (user == null) {
            return PUBLIC;
        }
        if (user.getAccountType() != null && "ADMIN".equals(user.getAccountType().name())) {
            return "ADMIN";
        }
        if (user.getOrgId() == null) {
            return PUBLIC;
        }
        String orgType = organizationRepository.findById(user.getOrgId())
                .map(Organization::getOrgType)
                .orElse(null);
        return orgType == null ? PUBLIC : orgType;
    }

    private static String viewerLabel(String role) {
        return switch (role) {
            case "ADMIN" -> "운영자";
            case "CUSTOMS" -> "세관";
            case "EU_AUTHORITY" -> "시장감시당국";
            case "MANUFACTURER" -> "제조사";
            case "RAW_SUPPLIER", "TEST_LAB", "RECYCLER" -> "협력사";
            default -> "일반 공개";
        };
    }
}
