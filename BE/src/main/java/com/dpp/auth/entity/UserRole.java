package com.dpp.auth.entity;

/**
 * INDIVIDUAL   - 개인, SNS 가입만 허용
 * MANUFACTURER - 제조사, 회사 도메인 이메일 가입
 * CORPORATE    - 기업, ID/PW + 휴대폰인증 + 본인인증 + 보안OTP 가입
 */
public enum UserRole {
    INDIVIDUAL,
    MANUFACTURER,
    CORPORATE
}
