package com.dpp.dpp.dto;

import java.util.UUID;

/** GET /me/dashboard 응답 안의 DPP 1건. completeness는 fn_recalc_completeness 직후 값(최신). */
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
        int requiredCount
) {
}
