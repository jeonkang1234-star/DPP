package com.dpp.customs.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * POST /customs/clearance-requests 입력 - DPP를 발급한 제조사(또는 대리 신청하는 물류사)가
 * "이 DPP를 어느 나라로 수출하는지" 선언한다. 수출국은 여기서 받지 않고
 * CustomsClearanceService가 DPP 소유 조직(organization.country_code)에서 스냅샷을 뜬다 -
 * 신청자가 임의로 바꿀 수 있으면 안 되는 값이기 때문(2026-08-19 강 요청, 수출국+수입국
 * 관할 매칭의 전제).
 */
public record CustomsClearanceRequestDto(
        @NotNull Long dppId,
        @NotBlank String importCountryCode,
        @NotBlank String importerName,
        String importerAddress,
        String importerEori,
        String declaredHsCode
) {
}
