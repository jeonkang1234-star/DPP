package com.dpp.auth.dto;

/**
 * 이메일+비밀번호 로그인(/auth/login) 응답.
 * TokenResponse(SNS 로그인 응답)와 accessToken/refreshToken/tokenType은 같지만,
 * FE가 로그인 직후 화면 분기에 쓰는 accountType/email/displayName을 같이 내려주기 위해
 * 별도 DTO로 분리했다.
 *
 * TODO: steel/battery/textile/eu/customs 같은 세부 role(도메인)은 아직 org 테이블이
 * 없어서 여기서 못 내려준다 - rbac/mypage 패키지에서 organization 매핑이 생기면
 * accountType 대신(또는 옆에) 세부 role 필드를 추가할 것. 지금은 FE가 accountType만
 * 보고, 세부 도메인 선택은 별도 화면(온보딩)에서 계속 처리해야 함.
 */
public record LoginResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        String accountType,
        String email,
        String displayName
) {
    public static LoginResponse of(String accessToken, String refreshToken, String accountType,
                                    String email, String displayName) {
        return new LoginResponse(accessToken, refreshToken, "bearer", accountType, email, displayName);
    }
}
