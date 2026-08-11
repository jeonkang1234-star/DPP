package com.dpp.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** POST /auth/login 요청. BUSINESS/ADMIN 계정 전용 - PERSONAL은 서비스 계층에서 400으로 거부한다. */
public record LoginRequest(
        @NotBlank @Email String email,
        @NotBlank String password
) {
}
