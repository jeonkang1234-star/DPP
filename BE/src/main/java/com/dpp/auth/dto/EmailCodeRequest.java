package com.dpp.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record EmailCodeRequest(
        @NotBlank @Email String email
) {
}
