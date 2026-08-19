package com.dpp.dpp.service;

import com.dpp.dpp.entity.DppFieldValue;
import com.dpp.dpp.entity.RequirementField;
import com.dpp.dpp.repository.DppFieldValueRepository;
import com.dpp.dpp.repository.RequirementFieldRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 파서가 돌려준 spec_fields({field_code: value})를 dpp_field_value에 채운다.
 *
 * ■ 왜 별도 서비스인가
 * 지금까지 자동 채움은 문서 유형별로 자바 코드에 손으로 적혀 있었다 - DocumentSlotService의
 * switch 문 한 덩어리와 인제스트 서비스 6종에 흩어진 fillFieldIfEmpty 호출들. 필드가
 * 26개일 땐 유지됐지만 파서가 채울 수 있는 필드가 192개가 되면서 그 방식은 끝났다.
 * 이제 어떤 필드를 문서에서 채울지는 requirement_field.data_source='PARSER'가 결정하고,
 * 파서(spec_extractor.py)가 같은 표를 보고 값을 뽑아 field_code 그대로 돌려준다.
 * 이 서비스는 그 결과를 받아 쓰기 규칙만 적용한다.
 *
 * ■ 쓰기 규칙 세 가지
 *   1. 이미 값이 있으면 덮어쓰지 않는다. 파서가 사용자가 직접 고친 값을 조용히 뒤집으면
 *      안 된다(2026-08-15에 정해진 규칙 - 기존 fillIfEmpty와 동일).
 *   2. requirement_field에 실제로 존재하고 data_source='PARSER'이며 이 DPP의 도메인에
 *      해당하는 필드만 쓴다. 파서가 무엇을 보내든 여기서 한 번 더 거른다 - dpp_field_value
 *      .field_code에는 FK가 걸려 있어서, 없는 코드를 그대로 넣으면 업로드가 500으로 죽는다.
 *   3. source_document_id를 남긴다. 이 컬럼은 V1__schema.sql 때부터 있었지만 아무도 안
 *      채우고 있었다 - 어느 문서에서 온 값인지 모르면 나중에 문서가 반려됐을 때 그 값을
 *      되돌릴 근거가 없다.
 *
 * 실패해도 업로드 자체는 성공해야 한다 - 호출하는 쪽이 예외를 삼키는 구조를 유지한다.
 */
@Service
public class SpecFieldAutoFillService {

    private static final Logger log = LoggerFactory.getLogger(SpecFieldAutoFillService.class);

    private final RequirementFieldRepository requirementFieldRepository;
    private final DppFieldValueRepository fieldValueRepository;

    public SpecFieldAutoFillService(RequirementFieldRepository requirementFieldRepository,
                                     DppFieldValueRepository fieldValueRepository) {
        this.requirementFieldRepository = requirementFieldRepository;
        this.fieldValueRepository = fieldValueRepository;
    }

    /**
     * @param specFields 파서 응답의 spec_fields 맵. null이거나 비어 있으면 아무것도 안 한다.
     * @param sourceDocumentId 값의 출처 문서. 모르면 null.
     * @return 실제로 채운 field_code 목록(이미 값이 있어서 건너뛴 건 포함하지 않는다).
     */
    @Transactional
    public List<String> apply(Long dppId, String domain, Long orgId, Long userId,
                              Map<String, Object> specFields, Long sourceDocumentId) {
        if (dppId == null || specFields == null || specFields.isEmpty()) {
            return List.of();
        }

        // 파서가 보낸 코드 중 "이 DPP에 실제로 존재하고 파서가 채우기로 돼 있는" 것만 남긴다.
        Set<String> writable = requirementFieldRepository
                .findByFieldCodeInAndActiveTrue(specFields.keySet()).stream()
                .filter(f -> "PARSER".equals(f.getDataSource()))
                .filter(f -> "DATA".equals(f.getFieldKind()) && "FIELD_VALUE".equals(f.getStorageTarget()))
                .filter(f -> "COMMON".equals(f.getDomain()) || f.getDomain().equals(domain))
                .map(RequirementField::getFieldCode)
                .collect(Collectors.toSet());

        int skippedUnknown = specFields.size() - writable.size();
        if (skippedUnknown > 0) {
            // 조용히 버리지 않고 남긴다 - 파서 표와 DB 시드가 어긋나기 시작하면 여기 숫자가
            // 먼저 올라간다.
            log.debug("dppId={} 파서가 보낸 필드 {}개 중 {}개는 이 도메인({})의 파서 대상 필드가 아니라 무시",
                    dppId, specFields.size(), skippedUnknown, domain);
        }

        List<String> filled = new ArrayList<>();
        for (String fieldCode : writable) {
            Object raw = specFields.get(fieldCode);
            String text = raw == null ? null : String.valueOf(raw).trim();
            if (text == null || text.isEmpty()) {
                continue;
            }
            var existing = fieldValueRepository.findByDppIdAndFieldCode(dppId, fieldCode);
            if (existing.isPresent()) {
                String current = existing.get().getValueText();
                if (current != null && !current.isBlank()) {
                    continue;   // 규칙 1 - 사용자가 넣은 값을 뒤집지 않는다
                }
            }
            DppFieldValue value = existing.orElseGet(() -> {
                DppFieldValue v = new DppFieldValue();
                v.setDppId(dppId);
                v.setFieldCode(fieldCode);
                return v;
            });
            value.setValueText(text);
            value.setSubmittedByOrg(orgId);
            value.setSubmittedByUser(userId);
            value.setSourceDocumentId(sourceDocumentId);
            value.setUpdatedAt(OffsetDateTime.now());
            fieldValueRepository.save(value);
            filled.add(fieldCode);
        }
        if (!filled.isEmpty()) {
            log.info("dppId={} 문서 파싱으로 {}개 필드 자동 채움: {}", dppId, filled.size(), filled);
        }
        return filled;
    }
}
