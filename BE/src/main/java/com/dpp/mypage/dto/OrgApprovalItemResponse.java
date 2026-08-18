package com.dpp.mypage.dto;

import com.dpp.mypage.entity.Organization;

import java.time.OffsetDateTime;

/**
 * 관리자 가입승인 화면(GET /admin/organizations) 목록 한 줄. FE approvalVals.js가
 * 예전 mock data.json의 signupApprovals 배열 대신 이걸 그대로 매핑해 쓴다.
 *
 * autoApproved: approvalStatus=ACTIVE이면서 approvedBy가 NULL인 경우 - 관리자가 누른 게
 * 아니라 OrganizationService.findOrCreateForSignup의 사업자등록번호 체크섬 자동심사로
 * 승인됐다는 뜻(2026-08-16).
 */
public record OrgApprovalItemResponse(
        Long orgId,
        String orgName,
        String domain,
        String countryCode,
        String bizRegNo,
        OffsetDateTime createdAt,
        String approvalStatus,
        boolean autoApproved,
        String rejectReason
) {
    public static OrgApprovalItemResponse of(Organization org) {
        boolean autoApproved = "ACTIVE".equals(org.getApprovalStatus().name()) && org.getApprovedBy() == null;
        return new OrgApprovalItemResponse(
                org.getOrgId(), org.getOrgName(), org.getDomain(), org.getCountryCode(), org.getBizRegNo(),
                org.getCreatedAt(), org.getApprovalStatus().name(), autoApproved, org.getRejectReason());
    }
}
