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
}
