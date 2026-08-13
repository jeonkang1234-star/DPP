package com.dpp.dpp.dto;

/** "강재 기본 정보" 폼의 필드 1개. value는 기존에 저장된 값(없으면 null - 목데이터처럼 예시값을 채우지 않는다). */
public record FieldFormItemDto(
        String fieldCode,
        String section,
        String labelKo,
        String unit,
        String helpText,
        boolean required,
        String value
) {
}
