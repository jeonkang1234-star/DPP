package com.dpp.mypage.dto;

import com.dpp.mypage.entity.Organization;

import java.time.OffsetDateTime;

/**
 * GET/PUT /me/organization 응답. org_id는 public_uuid가 없는 테이블이라(MeResponse의
 * publicUuid 관례와 다름) 그대로 노출한다 - SteelMillUploadResponse도 dppId를 그대로
 * 내려주는 선례가 있어 이 정도 내부 PK 노출은 이 프로젝트에서 허용 범위로 봄.
 * approvedBy/approvedAt/version/createdBy/updatedBy/deletedAt 같은 내부/관리자 전용
 * 필드는 자기 조직 조회 응답에 굳이 넣지 않는다.
 */
public record OrganizationResponse(
        Long orgId,
        String orgName,
        String orgType,
        String domain,
        String countryCode,
        String bizRegNo,
        String leiCode,
        String eoriCode,
        String uoi,
        String postalCode,
        String addressLine1,
        String addressLine2,
        String city,
        String contactName,
        String contactDept,
        String contactPhone,
        String contactEmail,
        int tierLevel,
        String profileStatus,
        String approvalStatus,
        String rejectReason,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public static OrganizationResponse of(Organization org) {
        return new OrganizationResponse(
                org.getOrgId(),
                org.getOrgName(),
                org.getOrgType(),
                org.getDomain(),
                org.getCountryCode(),
                org.getBizRegNo(),
                org.getLeiCode(),
                org.getEoriCode(),
                org.getUoi(),
                org.getPostalCode(),
                org.getAddressLine1(),
                org.getAddressLine2(),
                org.getCity(),
                org.getContactName(),
                org.getContactDept(),
                org.getContactPhone(),
                org.getContactEmail(),
                org.getTierLevel(),
                org.getProfileStatus().name(),
                org.getApprovalStatus().name(),
                org.getRejectReason(),
                org.getCreatedAt(),
                org.getUpdatedAt()
        );
    }
}
