package com.dpp.dpp.dto;

/**
 * 문서 업로드 화면(GET /me/documents) 한 행 - requirement_field(storage_target='DOCUMENT')
 * 항목 하나에 대응. status는 document.review_status를 그대로 내려주되, 아직 업로드된
 * document_link가 하나도 없으면 "NOT_UPLOADED"로 채운다(review_status엔 없는 값 - FE 전용).
 *
 * zkpTarget은 document_type.is_zkp_target 그대로 - FE가 "제출 필요 문서" 전체 목록을
 * 이 값 기준으로 "검증이 필요한 데이터"(true)와 "형식만 확인하면 되는 문서"(false)로
 * 다시 나눠서 보여준다(2026-08-15, 입력 검증 결과 패널 3분류 작업).
 *
 * responsibleRole - 2026-08-23 추가(강 리포트 "재활용 처리업체로 지정했는데 온갖 문서를
 * 다 업로드하라고 한다"). 제조사(소유 조직) 화면은 도메인의 DOCUMENT 항목을 전부 받는데,
 * 그 안에는 원자재 공급사·시험기관·재활용업체가 올려야 할 문서까지 섞여 있었다. 협력사를
 * 초대해 놓고도 제조사 화면에는 그 문서들이 여전히 "내가 올려야 할 것"으로 보였다.
 * 누가 담당인지를 같이 내려보내서, 화면이 "협력사 담당"으로 구분해 표시할 수 있게 한다.
 * 항목 자체를 숨기지는 않는다 - 제조사는 협력사 제출 진행 상황을 봐야 한다.
 */
public record DocumentSlotDto(
        String fieldCode,
        String docTypeCode,
        String labelKo,
        String labelEn,
        boolean required,
        String status,
        Long documentId,
        String fileName,
        boolean zkpTarget,
        /** requirement_field.responsible_role. null이면 제조사(소유 조직) 담당. */
        String responsibleRole
) {
}
