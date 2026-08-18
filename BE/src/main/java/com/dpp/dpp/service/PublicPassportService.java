package com.dpp.dpp.service;

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
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * GET /public/dpp/{publicUuid} - 로그인 없이 QR/링크로 DPP를 조회하는 화면의 데이터 소스
 * (2026-08-18, 강 요청 - "QR코드가 제 기능을 안함", 기존엔 QR이 순수 텍스트만 인코딩해서
 * 스캔하면 구글 검색으로 빠졌다). SecurityConfig에서 /public/** 는 permitAll이라 인증
 * 없이 호출된다 - 그래서 여기는 FieldFormService처럼 조직 소유권/참여자 권한을 따지지
 * 않고, "발급된 DPP인가"만 확인한다. 발급 전(DRAFT, issuedAt == null) DPP는 초안이라
 * 공개하지 않는다.
 */
@Service
public class PublicPassportService {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ISO_LOCAL_DATE;

    private static final PublicPassportResponse NOT_ISSUED =
            new PublicPassportResponse(false, null, null, null, null, List.of());

    private final DppQueryRepository dppRepository;
    private final ProductModelRepository productModelRepository;
    private final RequirementFieldRepository requirementFieldRepository;
    private final DppFieldValueRepository fieldValueRepository;

    public PublicPassportService(DppQueryRepository dppRepository,
                                  ProductModelRepository productModelRepository,
                                  RequirementFieldRepository requirementFieldRepository,
                                  DppFieldValueRepository fieldValueRepository) {
        this.dppRepository = dppRepository;
        this.productModelRepository = productModelRepository;
        this.requirementFieldRepository = requirementFieldRepository;
        this.fieldValueRepository = fieldValueRepository;
    }

    @Transactional(readOnly = true)
    public PublicPassportResponse getByPublicUuid(UUID publicUuid) {
        Dpp dpp = dppRepository.findByPublicUuidAndDeletedAtIsNull(publicUuid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 DPP를 찾을 수 없습니다."));

        if (dpp.getIssuedAt() == null) {
            return NOT_ISSUED;
        }

        ProductModel model = productModelRepository.findById(dpp.getModelId()).orElse(null);

        // FieldFormService.fieldsFor와 같은 조회(COMMON + 이 DPP의 도메인, DATA/FIELD_VALUE,
        // is_auto=false) - 협력사 role 구분 없이 전체를 본다(공개 페이지엔 "누가 담당인지"가
        // 아니라 "값이 뭔지"만 필요).
        List<RequirementField> fields = requirementFieldRepository
                .findByDomainInAndFieldKindAndStorageTargetAndAutoFalseAndActiveTrueOrderBySortOrder(
                        List.of("COMMON", dpp.getDomain()), "DATA", "FIELD_VALUE");

        Map<String, String> values = fieldValueRepository.findByDppId(dpp.getDppId()).stream()
                .collect(Collectors.toMap(DppFieldValue::getFieldCode, DppFieldValue::getValueText, (a, b) -> b));

        // 미입력 항목은 공개 페이지에 안 보여준다 - 채워진 값만 노출한다.
        List<PublicPassportFieldDto> filledFields = fields.stream()
                .map(f -> new PublicPassportFieldDto(f.getLabelKo(), values.get(f.getFieldCode())))
                .filter(f -> f.value() != null && !f.value().isBlank())
                .toList();

        return new PublicPassportResponse(
                true,
                model != null ? model.getInternalSku() : null,
                model != null ? model.getModelName() : null,
                dpp.getDomain(),
                dpp.getIssuedAt().toLocalDate().format(DATE_FORMAT),
                filledFields
        );
    }
}
