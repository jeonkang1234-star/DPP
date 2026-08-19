package com.dpp.customs.dto;

import java.util.List;

/** GET /customs/queue/{clearanceId} - 케이스 요약 + 확인 항목 6종 + 종합 판정. */
public record CustomsCaseDetailDto(
        CustomsCaseSummaryDto summary,
        boolean overallPass,
        List<CustomsCheckDto> checks,
        String reason
) {
}
