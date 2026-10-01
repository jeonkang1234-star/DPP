package com.dpp.collab.dto;

/**
 * 협력사 초대 화면의 "협력사명" 드롭다운 한 줄 (GET /me/invitations/partners, 2026-10-01 강 요청).
 *
 * orgType은 organization.org_type 원문(RAW_SUPPLIER/TEST_LAB/RECYCLER)이고 FE가 초대 역할
 * (inviteRoleOptions)과 같은 값으로 걸러서 보여준다. email은 그 조직에 실제로 가입한 계정의
 * 이메일 - 초대는 등록된 계정 이메일만 받기 때문에(InvitationService.requireRegisteredPartnerEmail)
 * 조직 담당자 연락처(contact_email)가 가입 계정과 일치할 때만 그걸 쓰고, 아니면 그 조직의
 * 첫 가입 계정 이메일을 쓴다.
 */
public record PartnerDirectoryDto(
        Long orgId,
        String orgName,
        String orgType,
        String domain,
        String countryCode,
        String email
) {
}
