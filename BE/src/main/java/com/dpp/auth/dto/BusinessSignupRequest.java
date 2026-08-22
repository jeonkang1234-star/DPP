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
 * businessRegNo: 제조사/협력사만 필수. 세관/시장감독기관은 사업자등록번호 개념이 맞지 않아
 * 가입 화면에서 아예 입력란을 없앴으므로(2026-08-21 강 요청 6번) 비워서 보낸다 -
 * organization.biz_reg_no는 nullable이고 유니크 인덱스도 NULL을 제외한다(V1__schema.sql).
 * orgTypeHint: 가입 화면에서 고른 계정 유형을 그대로 보낸다.
 *   "MANUFACTURER"(제조사) | "RAW_SUPPLIER"(협력사) | "CUSTOMS"(세관) | "EU_AUTHORITY"(시장감독기관).
 * 예전에는 세관/시장감독기관일 때만 값을 보내고 제조사/협력사는 null이었는데, 그러면
 * organization.org_type이 가입 직후 NULL로 남아서 NotificationCategory.visibleTo가
 * default 분기(전부 보여주기)로 빠졌다 - 갓 가입한 제조사 알림센터에 통관·Tier까지 8개
 * 탭이 전부 뜨던 버그(2026-08-21 강 요청 5번). 이제 네 유형 모두 값을 보내고 가입 시점에
 * org_type을 확정한다. 공적 기관(CUSTOMS/EU_AUTHORITY)만 사업자등록증 자동승인 로직을
 * 건너뛰고 항상 관리자 수동 심사(PENDING)로 간다
 * (BusinessSignupService.signup, OrganizationService.PUBLIC_AUTHORITY_ORG_TYPES).
 */
public record BusinessSignupRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, message = "비밀번호는 8자 이상이어야 합니다.") String password,
        @NotBlank String companyName,
        String businessRegNo,
        @NotBlank String country,
        String domain,
        String orgTypeHint,
        @NotBlank @Pattern(regexp = "[0-9-]{9,20}", message = "전화번호 형식이 맞지 않습니다.") String phone
) {
}
