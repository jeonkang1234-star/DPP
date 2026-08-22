package com.dpp.mypage.dto;

import com.dpp.mypage.entity.OrgDomainGrant;

import java.time.OffsetDateTime;

/**
 * 도메인 확장 신청 한 건. 마이페이지(내 신청 목록)와 관리자 심사 화면이 같은 모양을 쓴다 -
 * 관리자 쪽에만 조직명이 더 붙는다(orgName).
 */
public record DomainGrantResponse(
        Long grantId,
        Long orgId,
        String orgName,
        String domain,
        String domainLabel,
        String status,
        String statusLabel,
        String requestReason,
        String rejectReason,
        boolean hasEvidence,
        String evidenceName,
        String evidenceMime,
        Long evidenceSize,
        OffsetDateTime requestedAt,
        OffsetDateTime decidedAt
) {

    public static String domainLabel(String domain) {
        if (domain == null) {
            return "—";
        }
        return switch (domain) {
            case "STEEL" -> "철강";
            case "BATTERY" -> "배터리";
            case "TEXTILE" -> "섬유·패션";
            default -> domain;
        };
    }

    private static String statusLabel(String status) {
        if (status == null) {
            return "—";
        }
        return switch (status) {
            case "PENDING" -> "심사 대기";
            case "APPROVED" -> "승인됨";
            case "REJECTED" -> "반려됨";
            default -> status;
        };
    }

    public static DomainGrantResponse of(OrgDomainGrant g, String orgName) {
        String uri = g.getEvidenceUri();
        return new DomainGrantResponse(
                g.getGrantId(), g.getOrgId(), orgName,
                g.getDomain(), domainLabel(g.getDomain()),
                g.getStatus(), statusLabel(g.getStatus()),
                g.getRequestReason(), g.getRejectReason(),
                uri != null && !uri.isBlank(),
                g.getEvidenceName(), g.getEvidenceMime(), g.getEvidenceSize(),
                g.getRequestedAt(), g.getDecidedAt());
    }
}
