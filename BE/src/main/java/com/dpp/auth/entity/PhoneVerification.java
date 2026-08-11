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

/**
 * phone_verification 테이블 매핑. EmailVerification과 완전히 같은 구조.
 * 코드 원문은 저장하지 않고 SHA-256 해시만 저장한다 (PhoneVerificationService 참고).
 */
@Entity
@Table(name = "phone_verification")
@Getter
@Setter
public class PhoneVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "verification_id")
    private Long verificationId;

    @Column(name = "phone", nullable = false, length = 30)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", nullable = false, length = 30)
    private PhoneVerificationPurpose purpose = PhoneVerificationPurpose.BUSINESS_SIGNUP;

    @Column(name = "code_hash", nullable = false, length = 64)
    private String codeHash;

    @Column(name = "attempt_count", nullable = false)
    private short attemptCount = 0;

    @Column(name = "verified_at")
    private OffsetDateTime verifiedAt;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();
}
