package com.dpp.customs.dto;

/** 통관 케이스 상세의 개별 확인 항목 한 줄(FE customsVals.js의 cChecks). */
public record CustomsCheckDto(
        String label,
        boolean pass,
        String detail
) {
}
