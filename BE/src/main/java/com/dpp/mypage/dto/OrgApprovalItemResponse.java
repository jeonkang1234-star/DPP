package com.dpp.mypage.dto;

import com.dpp.mypage.entity.Organization;

import java.time.OffsetDateTime;

/**
 * 관리자 가입승인 화면(GET /admin/organizations) 목록 한 줄. FE approvalVals.js가
 * 예전 mock data.json의 signupApprovals 배열 대신 이걸 그대로 매핑해 쓴다.
 *
 * autoApproved: approvalStatus=ACTIVE이면서 approvedBy가 NULL인 경우 - 관리자가 누른 게
 * 아니라 OrganizationService.findOrCreateForSignup의 사업자등록증 자동심사(첨부된 문서를
 * parser 서비스로 형식·데이터 확인해 가입 입력값과 완전히 일치할 때만 통과, 2026-08-19
 * 기준 - 예전엔 사업자등록번호 체크섬 형식 검증만으로 통과시켰으나 폐지됨)로 승인됐다는 뜻.
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
