package com.dpp.dpp.dto;

/**
 * GET /me/participations 응답 1건 - 내 조직이 참여 협력사로 연결된 DPP 하나.
 * myFieldsFilled/Total은 담당 FIELD_VALUE 항목, myDocsFilled/Total은 담당 DOCUMENT
 * 항목(예: TEST_LAB이면 시험성적서/LCA·EPD/PCF보고서 업로드 여부) - 둘 다 "본인이 올려야
 * 하는 사항"만 세고, DPP 전체 완성도는 참여 협력사에게 노출하지 않는다(2026-08-15).
 */
public record ParticipationDto(
        Long dppId,
        String dppLabel,
        String ownerOrgName,
        String roleCode,
        String submitStatus,
        int myFieldsFilled,
        int myFieldsTotal,
        int myDocsFilled,
        int myDocsTotal,
        /**
         * 참여를 수락했는지(dpp_participant.accepted_at != null). 2026-08-23 추가.
         * 수락하기 전에는 이 협력사 담당 항목을 제조사가 그대로 입력할 수 있고, 수락한
         * 순간부터 그 항목들은 이 협력사 전용이 된다(PartnerAssignmentService).
         */
        boolean accepted
) {
}
