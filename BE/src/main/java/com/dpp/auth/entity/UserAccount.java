package com.dpp.auth.entity;

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

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * user_account 테이블 매핑.
 * org_id(조직)/tier 확정은 auth 모듈이 아니라 마이페이지(mypage)에서 처리하므로
 * 여기서는 orgId를 FK 연관관계로 만들지 않고 단순 컬럼으로만 둔다.
 * *** 주민등록번호 원본은 저장하지 않는다. ciValue는 본인인증 연계정보(CI) 값. ***
 */
@Entity
@Table(name = "user_account")
@Getter
@Setter
public class UserAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "public_uuid", nullable = false)
    private UUID publicUuid = UUID.randomUUID();

    @Column(name = "org_id")
    private Long orgId;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_type", nullable = false, length = 20)
    private AccountType accountType;

    @Column(name = "login_id", length = 60)
    private String loginId;

    @Column(name = "email", length = 200)
    private String email;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified = false;

    @Column(name = "password_hash", length = 200)
    private String passwordHash;

    @Column(name = "phone", length = 30)
    private String phone;

    @Column(name = "phone_verified", nullable = false)
    private boolean phoneVerified = false;

    /** 본인인증(PASS/NICE) 연계정보(CI). 주민등록번호 원본은 절대 여기 들어가지 않는다. */
    @Column(name = "ci_value", length = 200)
    private String ciValue;

    @Column(name = "display_name", length = 100)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(name = "onboarding_step", nullable = false, length = 30)
    private OnboardingStep onboardingStep = OnboardingStep.SIGNED_UP;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private AccountStatus status = AccountStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(name = "credential_type", nullable = false, length = 20)
    private CredentialType credentialType;

    @Column(name = "failed_login_count", nullable = false)
    private short failedLoginCount = 0;

    @Column(name = "locked_until")
    private OffsetDateTime lockedUntil;

    @Column(name = "last_login_at")
    private OffsetDateTime lastLoginAt;

    @Column(name = "locale", nullable = false, length = 10)
    private String locale = "ko";

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();
    // 주의: updated_at은 DB 트리거(fn_touch_updated_at)가 UPDATE 시 서버에서 덮어씀.
    // 여기서 설정하는 값은 INSERT 시점 초기값일 뿐, UPDATE 이후 실제 값과는 갱신 시점에 어긋날 수 있음.

    /**
     * 소프트 삭제 시각. 컬럼은 V1__schema.sql부터 있었지만 이 엔티티에는 매핑돼 있지
     * 않았다(2026-08-23에 추가). 그래서 Spring Data가 existsByEmailAndDeletedAtIsNull /
     * findByEmailAndDeletedAtIsNull 같은 파생 쿼리를 만들지 못하고
     * "No property 'deletedAt' found for type 'UserAccount'"로 앱이 부팅 자체에
     * 실패했다 - 컴파일은 통과하고 런타임에만 터지는 종류라 빌드로는 안 잡힌다.
     *
     * ux_user_email / ux_user_login_id / ux_user_sns 세 유니크 인덱스가 모두
     * `WHERE deleted_at IS NULL` 부분 인덱스이므로, 조회도 이 값을 봐야 스키마 의도와 맞는다.
     */
    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;
}
