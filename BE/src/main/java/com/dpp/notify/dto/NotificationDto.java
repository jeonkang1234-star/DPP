package com.dpp.notify.dto;

import com.dpp.notify.entity.Notification;

import java.time.OffsetDateTime;

/**
 * GET /notifications 응답 한 행. FE useAppLogic.js가 mockApi로 불러오던
 * notifications/notificationColors 조합을 대체한다 (openapi.yaml Notification 스키마 참고,
 * 단 실 스키마엔 건별 액션 문구 컬럼이 없어 link_url 존재 여부로 "바로가기" 유무만 내려준다).
 */
public record NotificationDto(
        String key,
        String label,
        String title,
        String body,
        OffsetDateTime createdAt,
        String actionLabel,
        String colorHex,
        boolean read
) {
    public static NotificationDto from(Notification n) {
        boolean hasLink = n.getLinkUrl() != null && !n.getLinkUrl().isBlank();
        return new NotificationDto(
                n.getCategory().name().toLowerCase(),
                n.getCategory().label(),
                n.getTitle(),
                n.getBody(),
                n.getCreatedAt(),
                hasLink ? "바로가기" : null,
                n.getCategory().colorHex(),
                n.isRead());
    }
}
