package com.dpp.auth.entity;

/** 가입 후 온보딩 진행 단계. 조직/Tier 확정은 auth가 아니라 마이페이지(mypage) 담당. */
public enum OnboardingStep {
    SIGNED_UP,
    PROFILE_INPUT,
    DOC_SUBMITTED,
    COMPLETED
}
