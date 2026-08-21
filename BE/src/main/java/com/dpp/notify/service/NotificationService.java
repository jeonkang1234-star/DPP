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

    /** org_type이 아직 비어 있는 기업 계정을 가리키는 내부 역할 문자열. */
    private static final String BUSINESS_UNKNOWN_ROLE = "BUSINESS_UNKNOWN";

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
        String orgType = organizationRepository.findById(user.getOrgId())
                .map(Organization::getOrgType)
                .orElse(null);
        // org_type이 비어 있는 기업 계정(2026-08-21 이전에 가입해서 마이페이지에서 유형을
        // 아직 안 고른 조직)은 예전엔 null로 내려가 visibleTo의 default 분기(전부 보여주기)를
        // 탔다 - 갓 가입한 제조사 알림센터에 통관·Tier까지 8개 탭이 전부 뜨던 원인
        // (강 요청 5번). 조직에 소속돼 있다는 것만으로 제조사/협력사 둘 중 하나이고 두
        // 역할의 노출 집합이 같으므로(CERT·SYSTEM), 최소 집합으로 보수적으로 처리한다.
        // 신규 가입은 OrganizationService.findOrCreateForSignup이 org_type을 바로 채운다.
        return orgType == null ? BUSINESS_UNKNOWN_ROLE : orgType;
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
