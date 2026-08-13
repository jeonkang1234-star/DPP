package com.dpp.dpp.dto;

import java.util.List;

/**
 * GET /me/field-form 응답. dppId가 null이면 아직 저장된 적 없는 새 폼(첫 임시저장 때
 * 새 product_model/dpp가 생성된다) - 이 경우 fields의 value는 전부 null이다.
 */
public record FieldFormResponse(
        Long dppId,
        String domain,
        String status,
        double completeness,
        int filledCount,
        int requiredCount,
        List<FieldFormItemDto> fields
) {
}
