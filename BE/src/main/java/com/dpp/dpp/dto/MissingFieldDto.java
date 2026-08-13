package com.dpp.dpp.dto;

/**
 * "대기작업 큐"의 실제 데이터 - v_dpp_missing_field 뷰에서 온 미충족 필수 필드 1건.
 * 마감일(D-day) 개념은 스키마에 없어서(뷰에 날짜 컬럼 자체가 없음) due는 내려주지 않는다 -
 * FE에서 급함 표시가 필요없는 중립 항목으로 렌더링한다.
 */
public record MissingFieldDto(
        Long dppId,
        String dppLabel,
        String fieldCode,
        String section,
        String labelKo,
        String responsibleRoleName
) {
}
