package com.dpp.auth.entity;

public enum OAuthStatePurpose {
    /** 신규 가입 또는 기존 계정 로그인 */
    LOGIN,
    /** 이미 로그인한 계정에 SNS 추가 연결 (마이페이지 "연결된 계정") */
    LINK
}
