package com.dpp.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 기업 회원가입 최종 제출. /auth/signup/business/email/verify 로 이메일 인증,
 * /auth/signup/business/phone/verify 로 전화번호 인증을 먼저 끝낸 상태여야 한다
 * (BusinessSignupService.signup 참고).
 *
 * businessRegNo/country/domain은 com.dpp.mypage.OrganizationService.findOrCreateForSignup로
 * organization 테이블에 저장된다(동일 country+businessRegNo 조직이 있으면 합류, 없으면 신규
 * 생성). org_type/주소/담당자 정보는 가입 시점엔 비워두고 PUT /me/organization에서 채운다.
 */
public record BusinessSignupRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, message = "비밀번호는 8자 이상이어야 합니다.") String password,
        @NotBlank String companyName,
        @NotBlank String businessRegNo,
        @NotBlank String country,
        @NotBlank String domain,
        @NotBlank @Pattern(regexp = "[0-9-]{9,20}", message = "휴대전화번호 형식이 올바르지 않습니다.") String phone
) {
}
