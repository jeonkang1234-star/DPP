package com.dpp.dpp.dto;

/** GET /me/participations 응답 1건 - 내 조직이 참여 협력사로 연결된 DPP 하나. */
public record ParticipationDto(
        Long dppId,
        String dppLabel,
        String ownerOrgName,
        String roleCode,
        String submitStatus,
        int myFieldsFilled,
        int myFieldsTotal
) {
}
