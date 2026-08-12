package com.dpp.notify.repository;

import com.dpp.notify.entity.Notification;
import com.dpp.notify.entity.NotificationCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByRecipientUserIdOrderByCreatedAtDesc(Long userId);

    List<Notification> findByRecipientUserIdAndCategoryOrderByCreatedAtDesc(Long userId, NotificationCategory category);
}
