package com.dpp.notify.entity;

/** V1__schema.sql의 notification.category CHECK 제약과 1:1로 맞춘다. */
public enum NotificationCategory {
    CERT,
    TIER,
    SYSTEM,
    ZKP,
    CUSTOMS,
    ACCOUNT,
    SECURITY,
    INQUIRY;

    public String label() {
        return switch (this) {
            case CERT -> "인증서";
            case TIER -> "Tier 신청";
            case SYSTEM -> "시스템";
            case ZKP -> "ZKP";
            case CUSTOMS -> "통관";
            case ACCOUNT -> "계정";
            case SECURITY -> "보안";
            case INQUIRY -> "문의";
        };
    }

    /** 알림 목록의 점(dot) 색상. FE가 하드코딩해 쓰던 notificationColors를 서버로 옮긴 것. */
    public String colorHex() {
        return switch (this) {
            case CERT -> "#E3A008";
            case TIER -> "#12A150";
            case SYSTEM -> "#8494AC";
            case ZKP -> "#0045A9";
            case CUSTOMS -> "#6B4FBB";
            case ACCOUNT -> "#44546F";
            case SECURITY -> "#C22B2B";
            case INQUIRY -> "#0E9AA7";
        };
    }
}
