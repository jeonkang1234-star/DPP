package com.dpp.dpp.dto;

/**
 * 문서 업로드 화면(GET /me/documents) 한 행 - requirement_field(storage_target='DOCUMENT')
 * 항목 하나에 대응. status는 document.review_status를 그대로 내려주되, 아직 업로드된
 * document_link가 하나도 없으면 "NOT_UPLOADED"로 채운다(review_status엔 없는 값 - FE 전용).
 *
 * zkpTarget은 document_type.is_zkp_target 그대로 - FE가 "제출 필요 문서" 전체 목록을
 * 이 값 기준으로 "검증이 필요한 데이터"(true)와 "형식만 확인하면 되는 문서"(false)로
 * 다시 나눠서 보여준다(2026-08-15, 입력 검증 결과 패널 3분류 작업).
 */
public record DocumentSlotDto(
        String fieldCode,
        String docTypeCode,
        String labelKo,
        boolean required,
        String status,
        Long documentId,
        String fileName,
        boolean zkpTarget
) {
}
