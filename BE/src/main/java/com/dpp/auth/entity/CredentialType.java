package com.dpp.auth.entity;

/** SNS = 비밀번호 로그인 불가/비밀번호 재설정 요청도 거부해야 함 (V5 마이그레이션 주석 참고). */
public enum CredentialType {
    PASSWORD,
    SNS,
    BOTH
}
