package com.dpp.dpp.dto;

import java.util.List;

/**
 * GET /me/dashboard 응답. FE 목데이터(makerKpi/makerQueues/products)를 대체한다.
 * DPP가 하나도 없으면(제품 등록을 아직 안 한 조직) 전부 0/빈 배열로 내려간다 - 가짜 숫자로
 * 채우지 않는다.
 */
public record DashboardResponse(
        int totalCount,
        int incompleteCount,
        double averageCompleteness,
        List<DppSummaryDto> dpps,
        List<MissingFieldDto> missingFields,
        // zkp_proof.status='REQUESTED'인 행을 만드는 코드 경로가 아직 없어서(문서 업로드
        // 흐름이 곧바로 VERIFIED/REJECTED로 감) 이 값은 지금 항상 0이다 - 가짜 숫자를
        // 채우는 대신 실제로 0이 나가는 쪽을 택했다.
        long zkpPendingCount,
        long zkpRejectedCount
) {
}
