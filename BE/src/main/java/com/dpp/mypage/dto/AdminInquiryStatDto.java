package com.dpp.mypage.dto;

/**
 * 관리자 대시보드 "유형별 문의" 한 줄. notification(category='INQUIRY')을 sub_type으로
 * 묶은 실집계다 - 예전엔 FE data.json의 고정 배열이었다(2026-08-20 강 요청).
 */
public record AdminInquiryStatDto(
        String key,
        String label,
        long count,
        int pct
) {
}
