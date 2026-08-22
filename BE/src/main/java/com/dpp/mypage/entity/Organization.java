package com.dpp.mypage.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

/**
 * organization 테이블 매핑 (V1__schema.sql). user_account.org_id가 이 PK를 가리킨다
 * (하지만 UserAccount 쪽처럼 여기서도 JPA 연관관계로 엮지 않고 Long org_id 컬럼만 갖는다 -
 * 이 코드베이스의 기존 관례).
 *
 * org_type은 role.role_code를 가리키는 FK지만(가입 직후엔 NULL, 마이페이지에서 확정),
 * 여기서도 단순 String 컬럼으로만 두고 OrganizationService에서 role 테이블 존재 여부 +
 * 허용된 조직용 role 코드 집합인지 검증한다.
 */
@Entity
@Table(name = "organization")
@Getter
@Setter
public class Organization {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "org_id")
    private Long orgId;

    @Column(name = "org_name", nullable = false, length = 200)
    private String orgName;

    @Column(name = "org_type", length = 30)
    private String orgType;

    @Column(name = "domain", length = 20)
    private String domain;

    // country_code는 CHAR(2)(고정 길이, Postgres bpchar) - VARCHAR로 추론되면
    // ddl-auto: validate가 "found bpchar, expecting varchar"로 기동 실패한다
    // (document.content_hash에서 겪은 것과 동일한 문제). JdbcTypeCode(CHAR) 필수.
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "country_code", length = 2, columnDefinition = "CHAR(2)")
    private String countryCode;

    @Column(name = "biz_reg_no", length = 30)
    private String bizRegNo;

    @Column(name = "website_url", length = 300)
    private String websiteUrl;

    @Column(name = "lei_code", length = 20)
    private String leiCode;

    @Column(name = "eori_code", length = 20)
    private String eoriCode;

    @Column(name = "uoi", length = 50)
    private String uoi;

    @Column(name = "postal_code", length = 20)
    private String postalCode;

    @Column(name = "address_line1", length = 300)
    private String addressLine1;

    @Column(name = "address_line2", length = 300)
    private String addressLine2;

    @Column(name = "city", length = 100)
    private String city;

    @Column(name = "contact_name", length = 100)
    private String contactName;

    @Column(name = "contact_dept", length = 100)
    private String contactDept;

    @Column(name = "contact_phone", length = 30)
    private String contactPhone;

    @Column(name = "contact_email", length = 200)
    private String contactEmail;

    @Column(name = "tier_level", nullable = false)
    private short tierLevel = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "profile_status", nullable = false, length = 20)
    private OrgProfileStatus profileStatus = OrgProfileStatus.INCOMPLETE;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false, length = 20)
    private OrgApprovalStatus approvalStatus = OrgApprovalStatus.PENDING;

    @Column(name = "reject_reason", length = 500)
    private String rejectReason;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "approved_at")
    private OffsetDateTime approvedAt;

    // 주의: version은 DB 트리거(trg_org_version -> fn_bump_version)가 UPDATE 시 자동 증가시킨다.
    // UserAccount.updatedAt과 같은 이유로 JPA @Version으로 매핑하지 않는다 - Hibernate의 자체
    // 낙관적 락 증가 로직과 DB 트리거가 서로 충돌할 수 있다. 여기 값은 INSERT 시점 초기값일 뿐.
    @Column(name = "version", nullable = false)
    private int version = 1;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "updated_by")
    private Long updatedBy;

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    // --- 가입 심사용 첨부/판정 (V28__org_biz_reg_cert.sql, 2026-08-22 강 요청) ---
    // 가입 화면에서 받은 사업자등록증(기관은 지정 공문 등 증빙서류)을 관리자가 심사 화면에서
    // 그대로 열어볼 수 있게 원본과 자동검증 결과를 남긴다. 예전엔 parser에 한 번 보내고
    // 버려서 '상세 정보'에 보여줄 게 아무것도 없었다.

    @Column(name = "biz_reg_cert_uri", length = 500)
    private String bizRegCertUri;

    @Column(name = "biz_reg_cert_name", length = 255)
    private String bizRegCertName;

    @Column(name = "biz_reg_cert_mime", length = 100)
    private String bizRegCertMime;

    @Column(name = "biz_reg_cert_size")
    private Long bizRegCertSize;

    @Column(name = "biz_reg_cert_uploaded_at")
    private OffsetDateTime bizRegCertUploadedAt;

    @Column(name = "verify_auto_approvable")
    private Boolean verifyAutoApprovable;

    @Column(name = "verify_reasons", length = 1000)
    private String verifyReasons;

    @Column(name = "verify_checked_at")
    private OffsetDateTime verifyCheckedAt;
}
