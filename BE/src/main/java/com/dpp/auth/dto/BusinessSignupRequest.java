package com.dpp.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 기업 회원가입 최종 제출. /auth/signup/business/email/verify 로 이메일 인증을
 * 먼저 끝낸 상태여야 한다 (BusinessSignupService.signup 참고).
 *
 * TODO: businessRegNo/country/domain은 저장할 organization 테이블이 아직 없다
 * (rbac/mypage 패키지 미구현). 지금은 UserAccount.displayName에 companyName만
 * 넣고 나머지는 받기만 하고 버린다 - org 테이블 생기면 여기부터 이어서 구현할 것.
 */
public record BusinessSignupRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, message = "비밀번호는 8자 이상이어야 합니다.") String password,
        @NotBlank String companyName,
        @NotBlank String businessRegNo,
        @NotBlank String country,
        @NotBlank String domain
) {
}
