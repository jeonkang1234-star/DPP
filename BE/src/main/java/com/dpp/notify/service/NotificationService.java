package com.dpp.notify.service;

import com.dpp.notify.dto.NotificationCategoryDto;
import com.dpp.notify.dto.NotificationDto;
import com.dpp.notify.entity.NotificationCategory;
import com.dpp.notify.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.Arrays;
import java.util.List;

/** REQ-NOTIFY: 알림 카테고리/목록 조회 (개인/기업 공통 - recipient_user_id 기준). */
@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    /** category CHECK 제약에 있는 8종 고정 목록 - DB 조회 없이 그냥 enum을 내려준다. */
    public List<NotificationCategoryDto> getCategories() {
        return Arrays.stream(NotificationCategory.values())
                .map(NotificationCategoryDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> getNotifications(Long userId, String categoryKey) {
        if (categoryKey == null || categoryKey.isBlank() || "all".equalsIgnoreCase(categoryKey)) {
            return notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(userId).stream()
                    .map(NotificationDto::from)
                    .toList();
        }

        NotificationCategory category;
        try {
            category = NotificationCategory.valueOf(categoryKey.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "알 수 없는 알림 카테고리입니다: " + categoryKey);
        }

        return notificationRepository.findByRecipientUserIdAndCategoryOrderByCreatedAtDesc(userId, category).stream()
                .map(NotificationDto::from)
                .toList();
    }
}
