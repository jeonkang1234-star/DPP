package com.dpp.collab.dto;

/** 초대 이력 목록/응답 1건. status는 SENT/ACCEPTED/EXPIRED/REVOKED/REJECTED 원문 그대로 - 한글 라벨/색상은 FE에서 매핑한다(scan_history와 같은 방식). roleCode도 마찬가지로 원문(RAW_SUPPLIER/TEST_LAB) - FE가 한글 라벨을 입힌다. */
public record InvitationDto(
        Long invitationId,
        String orgName,
        String email,
        String status,
        String sentAt,
        boolean canResend,
        Long dppId,
        String roleCode
) {
}
