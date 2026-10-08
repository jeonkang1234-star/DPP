package com.dpp.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** POST /auth/unlock/code·verify 요청. code 는 verify 때만 쓴다. */
public record UnlockRequest(@NotBlank @Email String email, String code) {
}
