package com.dpp.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** POST /auth/refresh 요청 - 로그인 때 받은 refreshToken. */
public record RefreshTokenRequest(@NotBlank String refreshToken) {
}
