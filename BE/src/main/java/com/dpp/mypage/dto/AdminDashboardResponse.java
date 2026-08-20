package com.dpp.mypage.dto;

import java.util.List;

/** GET /admin/dashboard - 관리자 대시보드 상단 KPI/앵커 현황(예전엔 AppView.jsx에 하드코딩된 문자열이었다, 2026-08-19 강 요청). */
public record AdminDashboardResponse(
        long totalUsers,
        long businessUsers,
        long personalUsers,
        long totalDpps,
        long steelDpps,
        long batteryDpps,
        long textileDpps,
        long pendingApprovalCount,
        Long lastAnchoredMinutesAgo,
        Long lastAnchorBlockNo,
        Double anchorSuccessRate30d,
        List<Long> anchorSparkline14d,
        long inquiryTotal30d,
        List<AdminInquiryStatDto> inquiriesByType
) {
}
