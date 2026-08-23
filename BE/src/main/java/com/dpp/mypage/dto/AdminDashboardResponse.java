package com.dpp.mypage.dto;

import java.util.List;

/**
 * GET /admin/dashboard - 관리자 대시보드 상단 KPI/앵커 현황(예전엔 AppView.jsx에 하드코딩된 문자열이었다, 2026-08-19 강 요청).
 *
 * 2026-08-23: 모든 수치를 long -> Long(nullable)으로 바꿨다. 집계 쿼리 하나가 실패했을 때
 * 0을 내려보내면 "가입자가 0명"이라는 거짓말이 되고, 예외를 그대로 던지면 화면 전체가
 * '—'가 되면서 원인도 안 보인다(강 리포트 2회). 이제 실패한 지표만 null -> 화면에서 '—',
 * 나머지는 정상 표시되고 서버 로그에 스택이 남는다. AdminDashboardService.safe() 참고.
 */
public record AdminDashboardResponse(
        Long totalUsers,
        Long businessUsers,
        Long personalUsers,
        Long totalDpps,
        Long steelDpps,
        Long batteryDpps,
        Long textileDpps,
        Long pendingApprovalCount,
        Long lastAnchoredMinutesAgo,
        Long lastAnchorBlockNo,
        Double anchorSuccessRate30d,
        List<Long> anchorSparkline14d,
        Long inquiryTotal30d,
        List<AdminInquiryStatDto> inquiriesByType
) {
}
