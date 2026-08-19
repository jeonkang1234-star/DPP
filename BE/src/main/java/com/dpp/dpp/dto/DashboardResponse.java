package com.dpp.dpp.dto;

import java.util.List;

/**
 * GET /me/dashboard 응답. FE 목데이터(makerKpi/makerQueues/products)를 대체한다.
 * DPP가 하나도 없으면(제품 등록을 아직 안 한 조직) 전부 0/빈 배열로 내려간다 - 가짜 숫자로
 * 채우지 않는다.
 */
public record DashboardResponse(
        int totalCount,
        // "이번 달 신규" - 2026-08-19 수정: 예전엔 실데이터(dash!=null)일 때 대응하는 집계가
        // 없어서 항상 0을 내려보냈다(FE 대시보드의 "등록 DPP 수" 카드 옆 +N 배지가 실제
        // 숫자를 반영하지 못하던 버그) - dpp.created_at이 이번 달 1일 0시 이후인 건수로 계산.
        int newThisMonthCount,
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
