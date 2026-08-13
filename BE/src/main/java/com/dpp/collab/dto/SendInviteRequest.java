package com.dpp.collab.dto;

/**
 * POST /me/invitations 요청. 화면에 역할 선택 UI가 없어서 role_code는 서버가 RAW_SUPPLIER로
 * 고정한다(InvitationService 주석 참고). dppId는 필수 - 이 초대가 어느 DPP에 대한 것인지
 * (V11__invitation_dpp_link.sql). 여러 협력사에 동시 발송은 FE가 이 엔드포인트를 협력사
 * 수만큼 반복 호출하는 방식으로 처리한다(백엔드는 여전히 1건씩만 받음 - API 재설계 없이
 * 다중발송 UX만 구현).
 */
public record SendInviteRequest(
        String orgName,
        String email,
        Long dppId
) {
}
