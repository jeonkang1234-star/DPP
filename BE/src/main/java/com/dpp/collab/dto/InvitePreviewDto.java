package com.dpp.collab.dto;

/**
 * GET /public/invite/{token} - 초대 메일 링크로 들어온 화면(FE screens/InviteLanding.jsx)이
 * 로그인 전에 보여줄 정보(2026-10-04).
 *
 * @param status  invitation.status(SENT/ACCEPTED/...)
 * @param expired 유효기간이 지났는지. 지나도 참여 행은 그대로라 로그인 후 이동은 막지 않는다.
 */
public record InvitePreviewDto(
        String inviterOrgName,
        String inviteeOrgName,
        String inviteeEmail,
        Long dppId,
        String dppLabel,
        String roleLabel,
        String status,
        boolean expired,
        String expiresAt
) {
}
