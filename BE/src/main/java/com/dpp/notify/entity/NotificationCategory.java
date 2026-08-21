package com.dpp.notify.entity;

import java.util.Set;

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

    /**
     * 이 카테고리를 보여줄 역할.
     *
     * 2026-08-20 강 요청 - 계정 종류와 상관없이 8개 탭이 전부 뜨다 보니, 운영자 화면에
     * "통관"·"Tier 신청"처럼 그 계정에서 영영 알림이 오지 않는 탭이 빈 채로 남아 있었다.
     * 세관은 통관/계정/문의만, EU 시장감시는 ZKP/계정/문의만 보면 된다.
     *
     * 여기 없는 역할(제조사·협력사 등)은 전부 보여준다 - 그쪽은 어떤 알림이 올지 아직
     * 확정되지 않아서 섣불리 좁히면 실제로 온 알림을 못 보게 된다.
     *
     * 값은 organization.org_type(세관=CUSTOMS, EU=EU_AUTHORITY) 또는 계정 종류(ADMIN)다.
     */
    /**
     * 운영자는 카테고리 자체를 쓰지 않는다 - 탭 없이 전체 목록만 본다
     * (2026-08-20 강 요청 "운영자 알림센터에 한해서만 카테고라이징 삭제").
     * 빈 집합이면 getCategories가 빈 배열을 내려주고, FE는 '전체' 탭 하나만 남긴다.
     */
    private static final Set<NotificationCategory> ADMIN_VISIBLE = Set.of();
    private static final Set<NotificationCategory> CUSTOMS_VISIBLE =
            Set.of(CUSTOMS, ACCOUNT, INQUIRY);
    private static final Set<NotificationCategory> EU_AUTHORITY_VISIBLE =
            Set.of(ZKP, ACCOUNT, INQUIRY);
    /**
     * 제조사(org_type='MANUFACTURER')는 인증서·시스템 두 가지만 본다
     * (2026-08-20 강 요청 - TIER·ZKP에 이어 통관·계정·보안·문의까지 제거).
     * 통관은 세관 쪽 절차라 제조사에게 알림이 오지 않고, 계정·보안·문의는 알림함이
     * 아니라 마이페이지/문의 화면에서 다루는 내용이라 빈 탭만 남아 있었다.
     */
    private static final Set<NotificationCategory> MANUFACTURER_VISIBLE =
            Set.of(CERT, SYSTEM);

    /** viewerRole이 null이거나 규칙이 없는 역할이면 전부 보여준다. */
    public boolean visibleTo(String viewerRole) {
        if (viewerRole == null) {
            return true;
        }
        return switch (viewerRole) {
            case "ADMIN" -> ADMIN_VISIBLE.contains(this);
            case "CUSTOMS" -> CUSTOMS_VISIBLE.contains(this);
            case "EU_AUTHORITY" -> EU_AUTHORITY_VISIBLE.contains(this);
            case "MANUFACTURER" -> MANUFACTURER_VISIBLE.contains(this);
            default -> true;
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
