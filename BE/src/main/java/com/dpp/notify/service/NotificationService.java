package com.dpp.notify.service;

import com.dpp.notify.dto.NotificationCategoryDto;
import com.dpp.notify.dto.NotificationDto;
import com.dpp.notify.entity.NotificationCategory;
import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.mypage.entity.Organization;
import com.dpp.mypage.repository.OrganizationRepository;
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
    private final UserAccountRepository userAccountRepository;
    private final OrganizationRepository organizationRepository;

    public NotificationService(NotificationRepository notificationRepository,
                                UserAccountRepository userAccountRepository,
                                OrganizationRepository organizationRepository) {
        this.notificationRepository = notificationRepository;
        this.userAccountRepository = userAccountRepository;
        this.organizationRepository = organizationRepository;
    }

    /**
     * 이 계정이 볼 수 있는 알림 카테고리만 돌려준다.
     *
     * 전에는 8종을 무조건 다 내려줬다. 그래서 세관 계정 화면에도 "Tier 신청" 탭이,
     * 운영자 화면에도 "통관" 탭이 빈 채로 떠 있었다(2026-08-20 강 요청). 어떤 탭을
     * 보여줄지는 NotificationCategory.visibleTo가 결정한다 - 규칙을 enum 옆에 둬야
     * 카테고리를 추가할 때 노출 규칙도 같이 눈에 들어온다.
     *
     * 필터를 FE가 아니라 서버에서 하는 이유: 탭 목록은 "이 계정에 올 수 있는 알림의
     * 종류"라는 서버 쪽 사실이다. FE에 역할 목록을 또 두면 역할이 늘 때마다 두 곳이
     * 어긋난다.
     */
    @Transactional(readOnly = true)
    public List<NotificationCategoryDto> getCategories(Long userId) {
        String viewerRole = resolveViewerRole(userId);
        return Arrays.stream(NotificationCategory.values())
                .filter(c -> c.visibleTo(viewerRole))
                .map(NotificationCategoryDto::from)
                .toList();
    }

    /**
     * 노출 규칙을 고를 때 쓰는 역할 문자열.
     * 운영자는 계정 종류(ADMIN)로, 나머지는 소속 조직의 org_type으로 정한다 -
     * 운영자 계정은 org_id가 아예 없다(seed-test-admin.sql).
     */
    private String resolveViewerRole(Long userId) {
        if (userId == null) {
            return null;
        }
        UserAccount user = userAccountRepository.findById(userId).orElse(null);
        if (user == null) {
            return null;
        }
        if (user.getAccountType() != null && "ADMIN".equals(user.getAccountType().name())) {
            return "ADMIN";
        }
        if (user.getOrgId() == null) {
            return null;
        }
        return organizationRepository.findById(user.getOrgId())
                .map(Organization::getOrgType)
                .orElse(null);
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
