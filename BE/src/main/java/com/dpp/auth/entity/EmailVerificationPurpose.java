package com.dpp.auth.entity;

/** 지금은 기업 회원가입 하나뿐이지만, 나중에 비밀번호 재설정 등에도 재사용할 수 있게 enum으로 분리. */
public enum EmailVerificationPurpose {
    BUSINESS_SIGNUP,
    /** 로그인 5회 실패로 잠긴 계정의 잠금 해제(2026-10-08, V42). */
    ACCOUNT_UNLOCK
}
