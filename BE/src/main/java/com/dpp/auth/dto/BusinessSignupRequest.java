package com.dpp.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 기업 회원가입 최종 제출. /auth/signup/business/email/verify 로 이메일 인증,
 * /auth/signup/business/phone/verify 로 전화번호 인증을 먼저 끝낸 상태여야 한다
 * (BusinessSignupService.signup 참고). multipart/form-data의 "data" part(JSON)로 전달되고,
 * 사업자등록증 파일은 별도 "bizRegCert" part로 같이 온다(BusinessSignupController 참고).
 *
 * businessRegNo/country/domain/orgTypeHint는 com.dpp.mypage.OrganizationService.
 * findOrCreateForSignup로 organization 테이블에 저장된다(동일 country+businessRegNo 조직이
 * 있으면 합류, 없으면 신규 생성).
 *
 * domain: 일반 기업(제조사/협력사) 계정만 필수(STEEL/TEXTILE/BATTERY). 세관/시장감독기관
 * 계정은 도메인 개념이 없으므로 비워서 보낸다(2026-08-19 강 요청 - 예전엔 FE가 'customs'/
 * 'eu' 문자열을 그대로 domain에 넣어 보내는 버그가 있었음).
 * orgTypeHint: "CUSTOMS" | "EU_AUTHORITY" - 세관/시장감독기관(공적 기관) 계정 가입 시에만
 * 값이 오고, 그 외(제조사/협력사)는 null. 값이 있으면 org_type이 가입 즉시 확정되고
 * 항상 관리자 수동 심사(PENDING)로만 간다 - 사업자등록증 자동승인 로직을 타지 않는다
 * (BusinessSignupService.signup, OrganizationService.PUBLIC_AUTHORITY_ORG_TYPES).
 */
public record BusinessSignupRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, message = "비밀번호는 8자 이상이어야 합니다.") String password,
        @NotBlank String companyName,
        @NotBlank String businessRegNo,
        @NotBlank String country,
        String domain,
        String orgTypeHint,
        @NotBlank @Pattern(regexp = "[0-9-]{9,20}", message = "휴대전화번호 형식이 올바르지 않습니다.") String phone
) {
}
