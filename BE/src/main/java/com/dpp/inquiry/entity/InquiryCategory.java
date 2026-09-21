package com.dpp.inquiry.entity;

/**
 * inquiry.category CHECK 제약(V34__inquiry.sql)과 1:1로 맞춘다.
 *
 * 이 코드/라벨은 관리자 대시보드의 "유형별 문의" 집계
 * (AdminStatsRepository.countInquiriesByType30d → notification.sub_type,
 * AdminDashboardService.inquiryLabel)가 이미 쓰던 것과 동일하게 맞췄다 - 문의가
 * 생성될 때 InquiryService가 notification(category='INQUIRY', sub_type=이 코드)도
 * 같이 남기므로, 두 쪽 표기가 어긋나면 안 된다. AdminDashboardService.inquiryLabel은
 * (컴파일 검증이 안 되는 이 세션에서) 이미 동작하던 코드라 손대지 않고 라벨 문자열만
 * 그대로 복제했다 - 나중에 한쪽으로 합치는 게 이상적이다.
 *
 * 2026-09-19 강 요청: 문의 유형을 계정·인증 / DPP 등록 / 데이터 검증 / 기타 네 가지로만
 * 남긴다(통관·영지식증명 삭제). 기존 행 정리는 V35__inquiry_category_trim.sql.
 */
public enum InquiryCategory {
    ACCOUNT, DPP, DATA, ETC;

    public String label() {
        return switch (this) {
            case ACCOUNT -> "계정·인증";
            case DPP -> "DPP 등록";
            case DATA -> "데이터 검증";
            case ETC -> "기타";
        };
    }
}
