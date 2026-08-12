package com.dpp.notify.dto;

import com.dpp.notify.entity.NotificationCategory;

/** GET /notifications/categories 응답 한 행. "전체" 탭은 FE가 자체적으로 앞에 붙인다. */
public record NotificationCategoryDto(String key, String label) {
    public static NotificationCategoryDto from(NotificationCategory category) {
        return new NotificationCategoryDto(category.name().toLowerCase(), category.label());
    }
}
