package com.dpp.mypage.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * org_domain_grant 매핑 (V29__org_domain_grant.sql).
 *
 * 제조사가 자기 주력 도메인 외의 도메인으로도 DPP를 발급하려면 증빙서류를 내고 관리자
 * 승인을 받아야 한다. "허용 도메인"은 organization.domain(가입 시 확정된 주력 도메인)에
 * 이 표의 APPROVED 행을 더한 집합이다(DomainGrantService.allowedDomains).
 */
@Entity
@Table(name = "org_domain_grant")
@Getter
@Setter
public class OrgDomainGrant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "grant_id")
    private Long grantId;

    @Column(name = "org_id", nullable = false)
    private Long orgId;

    @Column(name = "domain", nullable = false, length = 20)
    private String domain;

    /** PENDING | APPROVED | REJECTED */
    @Column(name = "status", nullable = false, length = 20)
    private String status = "PENDING";

    @Column(name = "request_reason", length = 500)
    private String requestReason;

    @Column(name = "reject_reason", length = 500)
    private String rejectReason;

    @Column(name = "evidence_uri", length = 500)
    private String evidenceUri;

    @Column(name = "evidence_name", length = 255)
    private String evidenceName;

    @Column(name = "evidence_mime", length = 100)
    private String evidenceMime;

    @Column(name = "evidence_size")
    private Long evidenceSize;

    @Column(name = "requested_by")
    private Long requestedBy;

    @Column(name = "requested_at", nullable = false)
    private OffsetDateTime requestedAt = OffsetDateTime.now();

    @Column(name = "decided_by")
    private Long decidedBy;

    @Column(name = "decided_at")
    private OffsetDateTime decidedAt;
}
