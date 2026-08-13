package com.dpp.mypage.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

/**
 * PUT /me/organization 요청. orgName/orgType 외 나머지는 전부 선택 항목 - 점진적
 * 온보딩(가입 시 회사명/사업자번호/국가/산업군만 받고, 주소·담당자·조직유형은 나중에
 * 마이페이지에서 채우는 흐름)이라 한 번에 다 채우도록 강제하지 않는다.
 * countryCode/bizRegNo/domain은 여기서 안 받는다 - 가입 시(BusinessSignupRequest)
 * 확정되고, 유니크 인덱스(country_code, biz_reg_no) 정합성 때문에 이 엔드포인트로는
 * 바꾸지 않는다.
 *
 * PUT이지만 실제로는 부분 업데이트(PATCH 의미)다 - JSON에서 아예 빠진(null) 필드는
 * 기존 값을 그대로 두고, 빈 문자열("")을 명시적으로 보내면 그 필드만 지운다
 * (OrganizationService.updateMyOrganization 참고).
 */
public record OrganizationUpdateRequest(
        @Size(max = 200) String orgName,
        String orgType,
        @Size(max = 300) String websiteUrl,
        @Size(max = 20) String leiCode,
        @Size(max = 20) String eoriCode,
        @Size(max = 50) String uoi,
        @Size(max = 20) String postalCode,
        @Size(max = 300) String addressLine1,
        @Size(max = 300) String addressLine2,
        @Size(max = 100) String city,
        @Size(max = 100) String contactName,
        @Size(max = 100) String contactDept,
        @Size(max = 30) String contactPhone,
        @Email @Size(max = 200) String contactEmail
) {
}
