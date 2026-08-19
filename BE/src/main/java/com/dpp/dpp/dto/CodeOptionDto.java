package com.dpp.dpp.dto;

/** code_master 한 줄 - data_type='CODE'인 필드의 드롭다운 선택지. */
public record CodeOptionDto(
        String codeGroup,
        String code,
        String nameKo,
        String nameEn
) {
}
