package com.dpp.collab.service;

import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.collab.dto.InvitationDto;
import com.dpp.collab.dto.SendInviteRequest;
import com.dpp.collab.entity.Invitation;
import com.dpp.collab.repository.InvitationRepository;
import com.dpp.dpp.entity.Dpp;
import com.dpp.dpp.entity.DppParticipant;
import com.dpp.dpp.repository.DppParticipantRepository;
import com.dpp.dpp.repository.DppQueryRepository;
import com.dpp.mypage.entity.Organization;
import com.dpp.mypage.repository.OrganizationRepository;
import com.dpp.notify.entity.Notification;
import com.dpp.notify.entity.NotificationCategory;
import com.dpp.notify.repository.NotificationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * "협력사 초대" 화면(FE makerVals.js에 하드코딩돼 있던 invites 6건 + sendInvite/resend
 * 목데이터 액션) 실데이터 연동. com.dpp.collab 패키지는 지금까지 package-info.java뿐인
 * 빈 stub이었다 - 이 화면이 사실상 최초 구현.
 *
 * role_code는 invitation 테이블에 NOT NULL FK - 2026-08-15부터 화면에 역할 선택 UI가
 * 생겨서(원자재/화학 공급사 vs 제3자 시험·인증기관, requirement_field.responsible_role이
 * V14__partner_role_split.sql로 이 둘로 나뉘면서 초대 쪽도 맞춰야 했다) 요청에 실린
 * roleCode를 화이트리스트(ALLOWED_ROLE_CODES)로 검증해서 쓴다. role 테이블엔 LOGISTICS/
 * DISTRIBUTOR/RECYCLER도 시딩되어 있지만 아직 그 역할 담당인 requirement_field가 하나도
 * 없어서(V4/V13/V14 어디에도 없음) 초대 가능 목록엔 안 넣는다 - 초대해도 채울 항목이
 * 없어서 의미가 없기 때문. roleCode가 비어 오면(구버전 FE) 이전처럼 RAW_SUPPLIER로 기본값.
 *
 * V11__invitation_dpp_link.sql 이후로 초대는 항상 특정 DPP에 대한 것 - 보낼 때마다
 * dpp_participant 행도 같이 만든다(guest_email만 채운 INVITED 상태). 이게
 * v_dpp_missing_field(V2__functions.sql)가 "미충족 필드의 책임 주체"를 실제로 채워주는
 * 유일한 소스라, 이 연결이 없으면 대시보드 미충족 필드에 담당자가 영원히 안 뜬다.
 *
 * **알림/조직 연결 - 이미 가입된 계정을 초대하는 경우(2026-08-15 수정)**: 원래
 * dpp_participant.org_id는 BusinessSignupService.linkPendingCollaborations가 "가입하는
 * 순간"에만 채워줬다 - 그런데 초대받는 사람이 이미 다른 DPP에서 활동 중인 기존 협력사
 * 계정이면(예: 테스트 계정 재사용) 다시 가입할 일이 없으니 그 로직이 영원히 안 불려서
 * org_id가 NULL로 남고, 알림도 전혀 안 갔다(협력사 로그인해도 "참여 DPP" 목록에 안
 * 뜨고, 시스템 알림도 안 오는 상태 - 강이 리포트한 버그). linkIfAlreadyRegistered()가
 * send()/resend() 양쪽에서 매번 "이 초대 이메일이 이미 가입된 계정인가"를 확인해서,
 * 맞으면 그 자리에서 바로 org_id를 채우고 초대를 ACCEPTED로 표시하고 알림을 남긴다.
 */
@Service
public class InvitationService {

    private static final String DEFAULT_ROLE_CODE = "RAW_SUPPLIER";
    private static final Set<String> ALLOWED_ROLE_CODES = Set.of("RAW_SUPPLIER", "TEST_LAB");
    private static final int EXPIRY_DAYS = 7;

    private final UserAccountRepository userAccountRepository;
    private final OrganizationRepository organizationRepository;
    private final InvitationRepository invitationRepository;
    private final DppQueryRepository dppRepository;
    private final DppParticipantRepository participantRepository;
    private final NotificationRepository notificationRepository;
    private final InviteMailSender mailSender;

    public InvitationService(UserAccountRepository userAccountRepository,
                              OrganizationRepository organizationRepository,
                              InvitationRepository invitationRepository,
                              DppQueryRepository dppRepository,
                              DppParticipantRepository participantRepository,
                              NotificationRepository notificationRepository,
                              InviteMailSender mailSender) {
        this.userAccountRepository = userAccountRepository;
        this.organizationRepository = organizationRepository;
        this.invitationRepository = invitationRepository;
        this.dppRepository = dppRepository;
        this.participantRepository = participantRepository;
        this.notificationRepository = notificationRepository;
        this.mailSender = mailSender;
    }

    @Transactional(readOnly = true)
    public List<InvitationDto> list(Long userId, Long dppId) {
        Long orgId = resolveOrgId(userId);
        List<Invitation> invitations = dppId != null
                ? invitationRepository.findByInviterOrgIdAndDppIdOrderByCreatedAtDesc(orgId, dppId)
                : invitationRepository.findByInviterOrgIdOrderByCreatedAtDesc(orgId);
        return invitations.stream().map(this::toDto).toList();
    }

    @Transactional
    public InvitationDto send(Long userId, SendInviteRequest request) {
        Long orgId = resolveOrgId(userId);
        String orgName = request.orgName() != null ? request.orgName().trim() : "";
        String email = request.email() != null ? request.email().trim() : "";
        if (orgName.isEmpty() || email.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "협력사명과 이메일을 입력해 주세요.");
        }
        if (request.dppId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "초대할 DPP를 선택해 주세요.");
        }
        Dpp dpp = dppRepository.findById(request.dppId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "DPP를 찾을 수 없습니다."));
        if (!orgId.equals(dpp.getOwnerOrgId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "해당 DPP에 접근할 권한이 없습니다.");
        }
        String roleCode = resolveRoleCode(request.roleCode());

        Invitation invitation = new Invitation();
        invitation.setInviterOrgId(orgId);
        invitation.setInviteeOrgName(orgName);
        invitation.setInviteeEmail(email);
        invitation.setDppId(dpp.getDppId());
        invitation.setRoleCode(roleCode);
        invitation.setToken(UUID.randomUUID().toString());
        invitation.setStatus("SENT");
        invitation.setExpiresAt(OffsetDateTime.now().plusDays(EXPIRY_DAYS));
        invitation.setCreatedBy(userId);
        invitation = invitationRepository.save(invitation);

        upsertParticipant(dpp.getDppId(), email, roleCode);
        linkIfAlreadyRegistered(invitation);
        sendMail(invitation, orgId);
        return toDto(invitation);
    }

    /**
     * invitation.inviteeEmail이 이미 org가 있는 계정이면 - 가입을 기다릴 필요 없이
     * 지금 바로 dpp_participant.org_id를 채우고 초대를 ACCEPTED로 넘기고 알림을 남긴다.
     * 참여 행/초대가 이미 연결돼 있으면(재발송 등으로 중복 호출) 아무것도 안 하고
     * 조용히 리턴 - 알림이 여러 번 쌓이는 걸 막는다.
     */
    private void linkIfAlreadyRegistered(Invitation invitation) {
        UserAccount existing = userAccountRepository.findByEmail(invitation.getInviteeEmail()).orElse(null);
        if (existing == null || existing.getOrgId() == null) {
            return;
        }
        boolean newlyLinked = false;

        DppParticipant participant = participantRepository
                .findByDppIdAndGuestEmailAndRoleCode(invitation.getDppId(), invitation.getInviteeEmail(), invitation.getRoleCode())
                .orElse(null);
        if (participant != null && participant.getOrgId() == null) {
            participant.setOrgId(existing.getOrgId());
            participantRepository.save(participant);
            newlyLinked = true;
        }

        if (!"ACCEPTED".equals(invitation.getStatus())) {
            invitation.setStatus("ACCEPTED");
            invitation.setAcceptedOrgId(existing.getOrgId());
            invitation.setAcceptedAt(OffsetDateTime.now());
            invitationRepository.save(invitation);
            newlyLinked = true;
        }

        if (newlyLinked) {
            String inviterOrgName = organizationRepository.findById(invitation.getInviterOrgId())
                    .map(Organization::getOrgName)
                    .orElse("협력사");
            Notification notification = new Notification();
            notification.setRecipientUserId(existing.getUserId());
            notification.setCategory(NotificationCategory.SYSTEM);
            notification.setTitle("협력사 참여 요청이 도착했습니다");
            notification.setBody(inviterOrgName + "에서 DPP 데이터 제출을 요청했습니다. '참여 DPP' 탭에서 확인해 주세요.");
            notificationRepository.save(notification);
        }
    }

    private String resolveRoleCode(String requested) {
        if (requested == null || requested.isBlank()) {
            return DEFAULT_ROLE_CODE;
        }
        String trimmed = requested.trim();
        if (!ALLOWED_ROLE_CODES.contains(trimmed)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 협력사 역할입니다: " + trimmed);
        }
        return trimmed;
    }

    // 같은 협력사에 재발송(resend)해도 참여 행이 중복 생기지 않도록 (dpp_id, guest_email,
    // role_code)로 먼저 찾아보고 없을 때만 새로 만든다.
    private void upsertParticipant(Long dppId, String guestEmail, String roleCode) {
        boolean exists = participantRepository
                .findByDppIdAndGuestEmailAndRoleCode(dppId, guestEmail, roleCode)
                .isPresent();
        if (exists) {
            return;
        }
        DppParticipant participant = new DppParticipant();
        participant.setDppId(dppId);
        participant.setGuestEmail(guestEmail);
        participant.setRoleCode(roleCode);
        participant.setSubmitStatus("INVITED");
        participantRepository.save(participant);
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

        // 재발송도 "이미 가입된 계정인가" 재확인 - 이 초대가 org_id 연결이 안 된 채로
        // 남아있던 예전 데이터라면(2026-08-15 수정 이전에 보낸 초대) 재발송 버튼 한 번으로
        // 자동 복구된다.
        linkIfAlreadyRegistered(invitation);
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
                canResend,
                invitation.getDppId(),
                invitation.getRoleCode()
        );
    }
}
