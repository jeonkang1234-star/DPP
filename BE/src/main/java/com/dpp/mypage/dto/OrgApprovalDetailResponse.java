package com.dpp.mypage.dto;

import com.dpp.auth.entity.UserAccount;
import com.dpp.mypage.entity.Organization;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * 관리자 가입승인 화면의 「상세 정보」(GET /admin/organizations/{orgId}) 응답.
 *
 * 2026-08-22 강 요청: "수동 심사 시에 '상세 정보'를 누르면 회원가입 때 받은 정보는 다 보이게
 * 하고 얘네가 올린 문서가 그냥 바로 열려서 보이게". 예전엔 FE가 mock docPreview 모달에
 * 회사명/국가만 찍어 보여줘서 사실상 빈 화면이었다.
 *
 * hasBizRegCert가 true면 GET /admin/organizations/{orgId}/biz-cert 로 원본을 받을 수 있다
 * (inline 렌더 가능한 MIME이면 화면에 바로 띄우고, 아니면 내려받기).
 */
public record OrgApprovalDetailResponse(
        Long orgId,
        String orgName,
        String orgType,
        String orgTypeLabel,
        String domain,
        String countryCode,
        String bizRegNo,
        String addressLine,
        String websiteUrl,
        String contactName,
        String contactPhone,
        String contactEmail,
        short tierLevel,
        String profileStatus,
        String approvalStatus,
        boolean autoApproved,
        String rejectReason,
        OffsetDateTime createdAt,
        OffsetDateTime approvedAt,
        /** parser 자동검증 결과. 아직 돌지 않았으면(공적 기관 등) null. */
        Boolean verifyAutoApprovable,
        /** 자동승인 불가 사유(줄바꿈 구분). 통과했거나 검증을 안 했으면 빈 문자열/null. */
        String verifyReasons,
        OffsetDateTime verifyCheckedAt,
        boolean hasBizRegCert,
        String bizRegCertName,
        String bizRegCertMime,
        Long bizRegCertSize,
        OffsetDateTime bizRegCertUploadedAt,
        List<Member> members
) {

    /** 이 조직에 소속된 계정. 가입 화면에서 받은 이메일·전화번호가 여기 들어 있다. */
    public record Member(
            Long userId,
            String email,
            String displayName,
            String phone,
            boolean emailVerified,
            boolean phoneVerified,
            String status,
            OffsetDateTime createdAt,
            OffsetDateTime lastLoginAt
    ) {
        public static Member of(UserAccount u) {
            return new Member(
                    u.getUserId(), u.getEmail(), u.getDisplayName(), u.getPhone(),
                    u.isEmailVerified(), u.isPhoneVerified(),
                    u.getStatus() == null ? null : u.getStatus().name(),
                    u.getCreatedAt(), u.getLastLoginAt());
        }
    }

    /** 우편번호 + 주소1 + 주소2 + 시를 한 줄로. 전부 비어 있으면 null. */
    private static String addressOf(Organization org) {
        StringBuilder sb = new StringBuilder();
        for (String part : new String[]{org.getPostalCode(), org.getAddressLine1(), org.getAddressLine2(), org.getCity()}) {
            if (part != null && !part.isBlank()) {
                if (sb.length() > 0) {
                    sb.append(' ');
                }
                sb.append(part.trim());
            }
        }
        return sb.length() == 0 ? null : sb.toString();
    }

    private static String orgTypeLabel(String orgType) {
        if (orgType == null) {
            return "미지정";
        }
        return switch (orgType) {
            case "MANUFACTURER" -> "제조사";
            case "RAW_SUPPLIER" -> "협력사 · 원자재공급";
            case "TEST_LAB" -> "협력사 · 시험소";
            case "RECYCLER" -> "협력사 · 재활용";
            case "LOGISTICS" -> "협력사 · 물류";
            case "DISTRIBUTOR" -> "협력사 · 유통";
            case "CUSTOMS" -> "세관";
            case "EU_AUTHORITY" -> "시장감독기관";
            default -> orgType;
        };
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) {
            return a;
        }
        return (b != null && !b.isBlank()) ? b : null;
    }

    public static OrgApprovalDetailResponse of(Organization org, List<UserAccount> members) {
        boolean autoApproved = "ACTIVE".equals(org.getApprovalStatus().name()) && org.getApprovedBy() == null;
        String certUri = org.getBizRegCertUri();
        // 담당자 연락처/이메일은 가입 화면에서 받은 값을 쓴다(2026-08-22 강 요청).
        // 신규 가입은 BusinessSignupService가 organization에도 채워 넣지만, 그 전에 가입한
        // 조직은 비어 있으므로 소속 계정의 값으로 폴백한다.
        UserAccount first = members.isEmpty() ? null : members.get(0);
        String contactPhone = firstNonBlank(org.getContactPhone(), first == null ? null : first.getPhone());
        String contactEmail = firstNonBlank(org.getContactEmail(), first == null ? null : first.getEmail());
        return new OrgApprovalDetailResponse(
                org.getOrgId(),
                org.getOrgName(),
                org.getOrgType(),
                orgTypeLabel(org.getOrgType()),
                org.getDomain(),
                org.getCountryCode(),
                org.getBizRegNo(),
                addressOf(org),
                org.getWebsiteUrl(),
                org.getContactName(),
                contactPhone,
                contactEmail,
                org.getTierLevel(),
                org.getProfileStatus() == null ? null : org.getProfileStatus().name(),
                org.getApprovalStatus().name(),
                autoApproved,
                org.getRejectReason(),
                org.getCreatedAt(),
                org.getApprovedAt(),
                org.getVerifyAutoApprovable(),
                org.getVerifyReasons(),
                org.getVerifyCheckedAt(),
                certUri != null && !certUri.isBlank(),
                org.getBizRegCertName(),
                org.getBizRegCertMime(),
                org.getBizRegCertSize(),
                org.getBizRegCertUploadedAt(),
                members.stream().map(Member::of).toList());
    }
}
