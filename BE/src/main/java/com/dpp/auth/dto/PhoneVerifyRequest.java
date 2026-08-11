package com.dpp.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record PhoneVerifyRequest(
        @NotBlank @Pattern(regexp = "[0-9-]{9,20}", message = "휴대전화번호 형식이 올바르지 않습니다.") String phone,
        @NotBlank @Pattern(regexp = "\\d{6}", message = "인증코드는 6자리 숫자입니다.") String code
) {
}
