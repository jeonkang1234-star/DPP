package com.dpp.dpp.dto;

import java.util.UUID;

/**
 * GET /me/dashboard 응답 안의 DPP 1건. completeness는 fn_recalc_completeness 직후 값(최신).
 * serialNumber/issuedAtDate는 "제품 조회" 탭의 Lot·발급일 컬럼용 - 둘 다 아직 값이 없을 수
 * 있다(serial_number는 선택 컬럼, issued_at은 실제 발급 전까지 NULL). 값이 없으면 null을
 * 그대로 내려보내고 FE에서 '—'로 표시한다 - 가짜 값으로 채우지 않는다.
 */
public record DppSummaryDto(
        Long dppId,
        UUID publicUuid,
        String internalSku,
        String modelName,
        String domain,
        String status,
        int lifecycleStage,
        double completeness,
        int filledCount,
        int requiredCount,
        String serialNumber,
        String issuedAtDate
) {
}
