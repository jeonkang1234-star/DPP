package com.dpp.mypage.service;

import com.dpp.audit.service.AuditLogService;
import com.dpp.auth.entity.AccountType;
import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.mypage.dto.OrgApprovalItemResponse;
import com.dpp.mypage.entity.OrgApprovalStatus;
import com.dpp.mypage.entity.Organization;
import com.dpp.mypage.repository.OrganizationRepository;
import com.dpp.notify.entity.Notification;
import com.dpp.notify.entity.NotificationCategory;
import com.dpp.notify.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * REQ-RBAC 중 가입승인만 먼저 구현 - 관리자(ADMIN 계정)가 organization.approval_status를
 * 심사하는 화면(FE approvalVals.js, /admin/approvals 탭)의 백엔드. 지금까지는 이 화면이
 * FE mock data.json의 고정 배열만 보여주는 목업이었다(2026-08-16, 강 요청으로 실데이터
 * 전환).
 *
 * 목록은 필터링 없이 전체를 내려주고(테스트 데이터 규모상 페이지네이션 불필요), FE가
 * 예전 mock과 동일하게 탭(전체/대기중/승인됨/반려됨)을 클라이언트에서 나눈다.
 */
@Service
public class AdminOrgApprovalService {

    private static final Logger log = LoggerFactory.getLogger(AdminOrgApprovalService.class);

    private final OrganizationRepository organizationRepository;
    private final UserAccountRepository userAccountRepository;
    private final NotificationRepository notificationRepository;
    private final AuditLogService auditLogService;

    public AdminOrgApprovalService(OrganizationRepository organizationRepository,
                                    UserAccountRepository userAccountRepository,
                                    NotificationRepository notificationRepository,
                                    AuditLogService auditLogService) {
        this.organizationRepository = organizationRepository;
        this.userAccountRepository = userAccountRepository;
        this.notificationRepository = notificationRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public List<OrgApprovalItemResponse> list(Long adminUserId) {
        requireAdmin(adminUserId);
        return organizationRepository.findByDeletedAtIsNullOrderByCreatedAtDesc().stream()
                .map(OrgApprovalItemResponse::of)
                .toList();
    }

    @Transactional
    public OrgApprovalItemResponse approve(Long adminUserId, Long orgId) {
        requireAdmin(adminUserId);
        Organization org = requireOrg(orgId);
        org.setApprovalStatus(OrgApprovalStatus.ACTIVE);
        org.setApprovedBy(adminUserId);
        org.setApprovedAt(OffsetDateTime.now());
        org.setRejectReason(null);
        Organization saved = organizationRepository.save(org);
        notifyOrg(orgId, "가입 승인이 완료되었습니다", org.getOrgName() + " 조직의 가입 신청이 승인되었습니다.");
        log.info("관리자 {} 가 조직 {} 가입을 승인", adminUserId, orgId);
        auditLogService.record(adminUserId, "APPROVE", "ORGANIZATION", orgId, org.getOrgName(), "성공", null);
        return OrgApprovalItemResponse.of(saved);
    }

    @Transactional
    public OrgApprovalItemResponse reject(Long adminUserId, Long orgId, String reason) {
        requireAdmin(adminUserId);
        Organization org = requireOrg(orgId);
        org.setApprovalStatus(OrgApprovalStatus.REJECTED);
        org.setApprovedBy(adminUserId);
        org.setApprovedAt(OffsetDateTime.now());
        org.setRejectReason((reason == null || reason.isBlank()) ? "관리자 심사 결과 반려" : reason.trim());
        Organization saved = organizationRepository.save(org);
        notifyOrg(orgId, "가입 신청이 반려되었습니다", org.getOrgName() + " 조직의 가입 신청이 반려되었습니다: " + saved.getRejectReason());
        log.info("관리자 {} 가 조직 {} 가입을 반려 (사유: {})", adminUserId, orgId, saved.getRejectReason());
        auditLogService.record(adminUserId, "REJECT", "ORGANIZATION", orgId, org.getOrgName(), saved.getRejectReason(), null);
        return OrgApprovalItemResponse.of(saved);
    }

    /** 이 조직 소속 계정 전원에게 알림을 남긴다 - BusinessSignupService.linkPendingCollaborations와 동일한 패턴. */
    private void notifyOrg(Long orgId, String title, String body) {
        List<UserAccount> members = userAccountRepository.findByOrgId(orgId);
        for (UserAccount member : members) {
            Notification notification = new Notification();
            notification.setRecipientUserId(member.getUserId());
            notification.setCategory(NotificationCategory.ACCOUNT);
            notification.setTitle(title);
            notification.setBody(body);
            notificationRepository.save(notification);
        }
    }

    private void requireAdmin(Long userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 사용자입니다."));
        if (user.getAccountType() != AccountType.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 접근할 수 있습니다.");
        }
    }

    private Organization requireOrg(Long orgId) {
        return organizationRepository.findById(orgId)
                .filter(o -> o.getDeletedAt() == null)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "조직을 찾을 수 없습니다."));
    }
}
