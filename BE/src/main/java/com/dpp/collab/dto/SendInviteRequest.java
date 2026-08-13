package com.dpp.collab.dto;

/** POST /me/invitations 요청. 화면에 역할 선택 UI가 없어서 role_code는 서버가 RAW_SUPPLIER로 고정한다(InvitationService 주석 참고). */
public record SendInviteRequest(
        String orgName,
        String email
) {
}
