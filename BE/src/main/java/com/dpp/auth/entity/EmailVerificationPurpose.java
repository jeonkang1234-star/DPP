package com.dpp.auth.entity;

/** 지금은 기업 회원가입 하나뿐이지만, 나중에 비밀번호 재설정 등에도 재사용할 수 있게 enum으로 분리. */
public enum EmailVerificationPurpose {
    BUSINESS_SIGNUP
}
