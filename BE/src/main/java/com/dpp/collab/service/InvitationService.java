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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(InvitationService.class);

    private static final String DEFAULT_ROLE_CODE = "RAW_SUPPLIER";
    // RECYCLER는 원래 role 테이블(V3__seed_master.sql)에 있었지만 담당 필드가 하나도 없어
    // 초대 옵션에서 빠져 있었다 - 배터리 도메인의 RECYCLING_REPORT(Q4_15)가 처음으로 이
    // 역할을 실사용해서 여기 화이트리스트에 추가한다(2026-08-16, V17__seed_requirement_
    // battery.sql). LOGISTICS/DISTRIBUTOR는 여전히 담당 필드가 없어 계속 제외.
    private static final Set<String> ALLOWED_ROLE_CODES = Set.of("RAW_SUPPLIER", "TEST_LAB", "RECYCLER");
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
        String mailError = sendMail(invitation, orgId);
        return toDto(invitation, mailError == null, mailError);
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

        // 알림은 newlyLinked와 무관하게 항상 남긴다(2026-08-21 강 리포트 "초대를 보냈는데
        // 알림이 안 온다"). 예전엔 "이번 초대로 participant.org_id가 처음 연결됐거나
        // 초대 상태가 처음 ACCEPTED로 바뀐 경우"에만 알림을 만들었다. 그래서 같은 협력사를
        // 다른 DPP에 다시 초대하면 - 실무에서 제일 흔한 경우다 - 두 조건이 모두 이미
        // 만족돼 있어 알림이 하나도 안 갔다.
        notifyInvitedOrg(invitation, existing.getOrgId());
    }

    /**
     * 초대받은 조직의 계정 전원에게 알림을 남긴다.
     *
     * 한 사람(email이 일치하는 계정)에게만 보내던 것을 조직 전체로 바꾼 이유: 초대 메일은
     * 대표 주소로 가는데 실제로 자료를 올리는 담당자는 다른 계정인 경우가 많다.
     * AdminOrgApprovalService.notifyOrg / ParticipantSubmitStatusService와 같은 패턴이다
     * (notification 테이블에 recipient_org_id 컬럼이 있지만 조회 쿼리가
     * recipient_user_id만 보기 때문에, 조직 단위 알림은 이렇게 사람마다 한 행씩 만든다).
     */
    private void notifyInvitedOrg(Invitation invitation, Long inviteeOrgId) {
        String inviterOrgName = organizationRepository.findById(invitation.getInviterOrgId())
                .map(Organization::getOrgName)
                .orElse("제조사");
        String label = dppLabel(invitation.getDppId());
        List<UserAccount> members = userAccountRepository.findByOrgId(inviteeOrgId);
        for (UserAccount member : members) {
            Notification notification = new Notification();
            notification.setRecipientUserId(member.getUserId());
            notification.setCategory(NotificationCategory.SYSTEM);
            notification.setSubType("PARTNER_INVITE");
            notification.setTitle("협력사 참여 요청이 도착했습니다");
            notification.setBody(inviterOrgName + "에서 '" + label + "'의 "
                    + roleLabel(invitation.getRoleCode()) + " 제출을 요청했습니다. '참여 DPP' 탭에서 확인해 주세요.");
            notification.setLinkUrl("/partner/assigned");
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
        String mailError = sendMail(invitation, orgId);
        return toDto(invitation, mailError == null, mailError);
    }

    /** 초대 역할 코드 -> 받는 쪽이 알아볼 자료 이름. FE inviteRoleOptions와 같은 문구. */
    private static String roleLabel(String roleCode) {
        if (roleCode == null) return "요청 자료";
        return switch (roleCode) {
            case "RAW_SUPPLIER" -> "원자재·화학 공급 자료 (스크랩 매입증빙, SDS 등)";
            case "TEST_LAB" -> "시험·인증 자료 (시험성적서, LCA/EPD, 탄소보고서)";
            case "RECYCLER" -> "재활용 처리 결과 보고서";
            default -> roleCode;
        };
    }

    /**
     * 메일·알림에 쓸 DPP 이름. 사용자가 붙인 이름 > 제품명 > "DPP #id" 순.
     * 받는 쪽은 내부 dpp_id를 봐도 무슨 물건인지 모르므로 사람이 읽을 이름이 필요하다.
     */
    private String dppLabel(Long dppId) {
        if (dppId == null) return "DPP";
        return dppRepository.findById(dppId)
                .map(d -> {
                    String name = d.getDisplayName();
                    if (name != null && !name.isBlank()) return name;
                    return "DPP #" + d.getDppId();
                })
                .orElse("DPP #" + dppId);
    }

    /**
     * 초대 메일 발송. 실패해도 예외를 던지지 않고 원인을 돌려준다.
     *
     * 예전엔 예외가 그대로 올라가 요청 전체가 500이 됐다 - 그러면 초대 자체가 롤백돼서
     * "SMTP 설정만 틀렸는데 초대가 아예 안 만들어지는" 상태가 된다. 초대 기록은 남기고
     * 메일 실패는 화면에 그대로 알려주는 쪽이 낫다(2026-08-21 강 리포트).
     *
     * @return 성공이면 null, 실패면 화면에 보여줄 원인 한 줄.
     */
    private String sendMail(Invitation invitation, Long orgId) {
        String inviterOrgName = organizationRepository.findById(orgId)
                .map(Organization::getOrgName)
                .orElse("IEUM");
        InviteMailSender.Invite invite = new InviteMailSender.Invite(
                invitation.getInviteeEmail(),
                inviterOrgName,
                dppLabel(invitation.getDppId()),
                roleLabel(invitation.getRoleCode()),
                invitation.getToken(),
                EXPIRY_DAYS);
        try {
            mailSender.sendInvite(invite);
            log.info("초대 메일 발송 완료: to={} dppId={} invitationId={}",
                    invitation.getInviteeEmail(), invitation.getDppId(), invitation.getInvitationId());
            return null;
        } catch (Exception e) {
            log.warn("초대 메일 발송 실패: to={} invitationId={} 원인={}",
                    invitation.getInviteeEmail(), invitation.getInvitationId(), e.toString(), e);
            String msg = e.getMessage();
            return (msg == null || msg.isBlank()) ? e.getClass().getSimpleName()
                    : (msg.length() > 200 ? msg.substring(0, 200) : msg);
        }
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
        return toDto(invitation, null, null);
    }

    private InvitationDto toDto(Invitation invitation, Boolean mailSent, String mailError) {
        boolean canResend = !"ACCEPTED".equals(invitation.getStatus());
        return new InvitationDto(
                invitation.getInvitationId(),
                invitation.getInviteeOrgName(),
                invitation.getInviteeEmail(),
                invitation.getStatus(),
                invitation.getCreatedAt().toLocalDate().toString(),
                canResend,
                invitation.getDppId(),
                invitation.getRoleCode(),
                mailSent,
                mailError
        );
    }
}
