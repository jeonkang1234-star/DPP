package com.dpp.dpp.dto;

/**
 * 문서 파싱값과 직접 입력값의 비교 결과 1건(dpp_field_cross_check).
 * 화면은 status='MISMATCH' 인 것만 경고로 띄운다.
 */
public record CrossCheckDto(
        Long checkId,
        String fieldCode,
        String labelKo,
        /** 사람이 입력한 값 */
        String enteredValue,
        /** 문서에서 파싱된 값 */
        String parsedValue,
        /** MATCH / MISMATCH / RESOLVED */
        String status,
        /** 어느 문서에서 나온 값인지 - 파일명. 없으면 null */
        String documentName
) {
}
