package com.dpp.auth.entity;

/**
 * 배터리 DPP 기준 공급망 Tier.
 * 개인(SNS 가입)은 가입과 동시에 TIER1로 자동 설정.
 * 기업(corporate)은 가입 시 UNASSIGNED로 생성되고,
 * 이후 마이페이지(mypage 패키지)에서 Tier/역할군 신청을 통해 값이 채워진다.
 * auth 모듈은 이 필드를 갖고만 있고, 신청/심사 로직은 다루지 않는다.
 */
public enum Tier {
    TIER1,
    TIER2,
    TIER3,
    UNASSIGNED
}
