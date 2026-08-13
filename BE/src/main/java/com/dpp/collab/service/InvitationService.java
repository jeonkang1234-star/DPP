package com.dpp.collab.service;

import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.collab.dto.InvitationDto;
import com.dpp.collab.dto.SendInviteRequest;
import com.dpp.collab.entity.Invitation;
import com.dpp.collab.repository.InvitationRepository;
import com.dpp.mypage.entity.Organization;
import com.dpp.mypage.repository.OrganizationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * "협력사 초대" 화면(FE makerVals.js에 하드코딩돼 있던 invites 6건 + sendInvite/resend
 * 목데이터 액션) 실데이터 연동. com.dpp.collab 패키지는 지금까지 package-info.java뿐인
 * 빈 stub이었다 - 이 화면이 사실상 최초 구현.
 *
 * role_code는 invitation 테이블에 NOT NULL FK인데, 이 화면에는 역할 선택 UI가 없다(회사명·
 * 이메일·메시지만 입력) - 그래서 서버가 RAW_SUPPLIER(원자재 공급사)로 고정한다. 나중에
 * 역할 선택 UI가 생기면 SendInviteRequest에 roleCode 필드를 추가하고 이 상수는 없앨 것.
 */
@Service
public class InvitationService {

    private static final String DEFAULT_ROLE_CODE = "RAW_SUPPLIER";
    private static final int EXPIRY_DAYS = 7;

    private final UserAccountRepository userAccountRepository;
    private final OrganizationRepository organizationRepository;
    private final InvitationRepository invitationRepository;
    private final InviteMailSender mailSender;

    public InvitationService(UserAccountRepository userAccountRepository,
                              OrganizationRepository organizationRepository,
                              InvitationRepository invitationRepository,
                              InviteMailSender mailSender) {
        this.userAccountRepository = userAccountRepository;
        this.organizationRepository = organizationRepository;
        this.invitationRepository = invitationRepository;
        this.mailSender = mailSender;
    }

    @Transactional(readOnly = true)
    public List<InvitationDto> list(Long userId) {
        Long orgId = resolveOrgId(userId);
        return invitationRepository.findByInviterOrgIdOrderByCreatedAtDesc(orgId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public InvitationDto send(Long userId, SendInviteRequest request) {
        Long orgId = resolveOrgId(userId);
        String orgName = request.orgName() != null ? request.orgName().trim() : "";
        String email = request.email() != null ? request.email().trim() : "";
        if (orgName.isEmpty() || email.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "협력사명과 이메일을 입력해 주세요.");
        }

        Invitation invitation = new Invitation();
        invitation.setInviterOrgId(orgId);
        invitation.setInviteeOrgName(orgName);
        invitation.setInviteeEmail(email);
        invitation.setRoleCode(DEFAULT_ROLE_CODE);
        invitation.setToken(UUID.randomUUID().toString());
        invitation.setStatus("SENT");
        invitation.setExpiresAt(OffsetDateTime.now().plusDays(EXPIRY_DAYS));
        invitation.setCreatedBy(userId);
        invitation = invitationRepository.save(invitation);

        sendMail(invitation, orgId);
        return toDto(invitation);
    }

    @Transactional
    public InvitationDto resend(Long userId, Long invitationId) {
        Long orgId = resolveOrgId(userId);
        Invitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "초대 내역을 찾을 수 없습니다."));
        if (!orgId.equals(invitation.getInviterOrgId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "해당 초대에 접근할 권한이 없습니다.");
        }
        if ("ACCEPTED".equals(invitation.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 수락된 초대는 재발송할 수 없습니다.");
        }

        invitation.setToken(UUID.randomUUID().toString());
        invitation.setStatus("SENT");
        invitation.setExpiresAt(OffsetDateTime.now().plusDays(EXPIRY_DAYS));
        invitation = invitationRepository.save(invitation);

        sendMail(invitation, orgId);
        return toDto(invitation);
    }

    private void sendMail(Invitation invitation, Long orgId) {
        String inviterOrgName = organizationRepository.findById(orgId)
                .map(Organization::getOrgName)
                .orElse("DPP Platform");
        mailSender.sendInvite(invitation.getInviteeEmail(), inviterOrgName, invitation.getToken());
    }

    private Long resolveOrgId(Long userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 사용자입니다."));
        if (user.getOrgId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "소속된 조직이 없어 협력사를 초대할 수 없습니다.");
        }
        return user.getOrgId();
    }

    private InvitationDto toDto(Invitation invitation) {
        boolean canResend = !"ACCEPTED".equals(invitation.getStatus());
        return new InvitationDto(
                invitation.getInvitationId(),
                invitation.getInviteeOrgName(),
                invitation.getInviteeEmail(),
                invitation.getStatus(),
                invitation.getCreatedAt().toLocalDate().toString(),
                canResend
        );
    }
}
