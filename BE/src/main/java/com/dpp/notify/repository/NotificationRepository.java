package com.dpp.notify.repository;

import com.dpp.notify.entity.Notification;
import com.dpp.notify.entity.NotificationCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByRecipientUserIdOrderByCreatedAtDesc(Long userId);

    List<Notification> findByRecipientUserIdAndCategoryOrderByCreatedAtDesc(Long userId, NotificationCategory category);

    /** 알림센터를 열 때 한 번에 읽음 처리하기 위한 조회(2026-08-22 강 요청 - 새 알림이
     * 있을 때만 빨간 점을 띄우고, 읽고 나면 사라지게). */
    List<Notification> findByRecipientUserIdAndReadFalse(Long userId);
}
