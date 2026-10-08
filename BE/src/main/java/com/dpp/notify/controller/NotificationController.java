package com.dpp.notify.controller;

import com.dpp.notify.dto.NotificationCategoryDto;
import com.dpp.notify.dto.NotificationDto;
import com.dpp.notify.service.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

/** REQ-NOTIFY: openapi.yaml Notifications 태그. */
@RestController
@RequestMapping("/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/categories")
    public ResponseEntity<List<NotificationCategoryDto>> categories(Authentication authentication) {
        // 2026-08-20: 계정마다 볼 수 있는 카테고리가 달라져서 인증 정보가 필요해졌다.
        return ResponseEntity.ok(notificationService.getCategories(parseUserId(authentication)));
    }

    @GetMapping
    public ResponseEntity<List<NotificationDto>> list(Authentication authentication,
                                                        @RequestParam(required = false) String category) {
        return ResponseEntity.ok(notificationService.getNotifications(parseUserId(authentication), category));
    }

    /**
     * 알림센터를 열 때 호출한다 - 안 읽은 알림을 전부 읽음 처리하고 남은 미읽음 수(0)를
     * 돌려준다. 헤더의 "새 알림" 빨간 점이 이 값으로 켜지고 꺼진다(2026-08-22 강 요청).
     */
    @PostMapping("/read-all")
    public ResponseEntity<Map<String, Integer>> readAll(Authentication authentication) {
        int marked = notificationService.markAllRead(parseUserId(authentication));
        return ResponseEntity.ok(Map.of("marked", marked, "unread", 0));
    }

    /** 알림 하나 지우기(알림센터 카드 우측 상단 X, 2026-10-08). */
    @DeleteMapping("/{notificationId}")
    public ResponseEntity<Void> delete(Authentication authentication, @PathVariable Long notificationId) {
        notificationService.delete(parseUserId(authentication), notificationId);
        return ResponseEntity.noContent().build();
    }

    /** 알림 모두 지우기 - category를 주면 그 탭만(알림센터 '모두 지우기', 2026-10-08). */
    @DeleteMapping
    public ResponseEntity<Map<String, Integer>> deleteAll(Authentication authentication,
                                                           @RequestParam(required = false) String category) {
        int deleted = notificationService.deleteAll(parseUserId(authentication), category);
        return ResponseEntity.ok(Map.of("deleted", deleted));
    }

    private Long parseUserId(Authentication authentication) {
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 정보입니다.");
        }
    }
}
