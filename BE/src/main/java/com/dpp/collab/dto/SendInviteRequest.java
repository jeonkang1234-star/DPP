package com.dpp.collab.dto;

/**
 * POST /me/invitations 요청. roleCode는 이 협력사가 어떤 역할로 참여하는지(원자재/화학
 * 공급사 = RAW_SUPPLIER, 제3자 시험·인증기관 = TEST_LAB) - 2026-08-15부터 화면에 역할
 * 선택 UI가 생겨서 클라이언트가 명시적으로 보낸다(InvitationService가 화이트리스트로
 * 검증, null이면 이전처럼 RAW_SUPPLIER로 기본값 처리 - 구버전 FE 호환). dppId는 필수 -
 * 이 초대가 어느 DPP에 대한 것인지(V11__invitation_dpp_link.sql). 여러 협력사에 동시
 * 발송은 FE가 이 엔드포인트를 협력사 수만큼 반복 호출하는 방식으로 처리한다(백엔드는
 * 여전히 1건씩만 받음 - API 재설계 없이 다중발송 UX만 구현).
 */
public record SendInviteRequest(
        String orgName,
        String email,
        Long dppId,
        String roleCode
) {
}
