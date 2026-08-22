package com.dpp.auth.service;

import com.dpp.auth.dto.BusinessSignupRequest;
import com.dpp.auth.dto.LoginResponse;
import com.dpp.auth.entity.AccountStatus;
import com.dpp.auth.entity.AccountType;
import com.dpp.auth.entity.CredentialType;
import com.dpp.auth.entity.OnboardingStep;
import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.auth.security.JwtTokenProvider;
import com.dpp.collab.entity.Invitation;
import com.dpp.collab.repository.InvitationRepository;
import com.dpp.dpp.entity.DppParticipant;
import com.dpp.dpp.repository.DppParticipantRepository;
import com.dpp.mypage.entity.OrgApprovalStatus;
import com.dpp.mypage.entity.Organization;
import com.dpp.mypage.repository.OrganizationRepository;
import com.dpp.mypage.service.OrganizationService;
import com.dpp.notify.entity.Notification;
import com.dpp.notify.entity.NotificationCategory;
import com.dpp.notify.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 기업(BUSINESS) 계정 가입 확정. 이메일 인증(EmailVerificationService)과
 * 전화번호 인증(PhoneVerificationService)이 둘 다 끝난 요청만 통과시킨다.
 * 가입 즉시 로그인 토큰을 내려줘서, FE 온보딩 화면(obVals.js)으로 바로 넘어갈 수 있게 한다.
 */
@Service
public class BusinessSignupService {

    private static final Logger log = LoggerFactory.getLogger(BusinessSignupService.class);

    private final UserAccountRepository userAccountRepository;
    private final EmailVerificationService emailVerificationService;
    private final PhoneVerificationService phoneVerificationService;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final OrganizationService organizationService;
    private final DppParticipantRepository dppParticipantRepository;
    private final InvitationRepository invitationRepository;
    private final OrganizationRepository organizationRepository;
    private final NotificationRepository notificationRepository;

    public BusinessSignupService(UserAccountRepository userAccountRepository,
                                  EmailVerificationService emailVerificationService,
                                  PhoneVerificationService phoneVerificationService,
                                  PasswordEncoder passwordEncoder,
                                  JwtTokenProvider jwtTokenProvider,
                                  OrganizationService organizationService,
                                  DppParticipantRepository dppParticipantRepository,
                                  InvitationRepository invitationRepository,
                                  OrganizationRepository organizationRepository,
                                  NotificationRepository notificationRepository) {
        this.userAccountRepository = userAccountRepository;
        this.emailVerificationService = emailVerificationService;
        this.phoneVerificationService = phoneVerificationService;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.organizationService = organizationService;
        this.dppParticipantRepository = dppParticipantRepository;
        this.invitationRepository = invitationRepository;
        this.organizationRepository = organizationRepository;
        this.notificationRepository = notificationRepository;
    }

    private static final Set<String> PUBLIC_AUTHORITY_ORG_TYPES = Set.of("CUSTOMS", "EU_AUTHORITY");

    /** 가입 화면(FE suRole)에서 고를 수 있는 네 가지 계정 유형. 2026-08-21 강 요청 5번으로
     * 제조사/협력사도 orgTypeHint를 보내게 되면서(예전엔 null) 여기서 함께 검증한다. */
    private static final Set<String> SIGNUP_ORG_TYPES =
            Set.of("MANUFACTURER", "RAW_SUPPLIER", "CUSTOMS", "EU_AUTHORITY");

    @Transactional
    public LoginResponse signup(BusinessSignupRequest request, MultipartFile bizRegCert) {
        if (userAccountRepository.existsByEmail(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 가입된 이메일입니다.");
        }
        if (!emailVerificationService.isVerified(request.email())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이메일 인증을 먼저 완료해 주세요.");
        }
        if (!phoneVerificationService.isVerified(request.phone())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "전화번호 인증을 먼저 완료해 주세요.");
        }

        // orgTypeHint는 네 유형 모두 온다(2026-08-21 강 요청 5번). 그 중 CUSTOMS/EU_AUTHORITY만
        // 공적 기관으로 취급해서 domain 대신 국가만 받고, 사업자등록증 자동승인 없이 항상
        // 관리자 수동심사로 간다(2026-08-19 강 요청 3번) - 승인 전까지는 로그인도 막힌다
        // (PasswordAuthService.requireApprovedOrganization, 강 요청 9번). 그 외(제조사/협력사)는
        // domain·사업자등록번호·사업자등록증 파일이 모두 필수다(가입 시 업로드 필수화 - 4번 항목).
        String orgTypeHint = request.orgTypeHint() == null ? null : request.orgTypeHint().trim().toUpperCase();
        if (orgTypeHint != null && !orgTypeHint.isBlank() && !SIGNUP_ORG_TYPES.contains(orgTypeHint)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "orgTypeHint 값이 올바르지 않습니다 (" + SIGNUP_ORG_TYPES + " 중 하나여야 합니다).");
        }
        boolean isPublicAuthority = orgTypeHint != null && PUBLIC_AUTHORITY_ORG_TYPES.contains(orgTypeHint);
        if (isPublicAuthority) {
            // 세관/시장감독기관은 사업자등록번호 입력란 자체가 없다(2026-08-21 강 요청 6번) -
            // 그 자리에 국가를 받는다. biz_reg_no는 NULL로 남는다.
            if (request.country() == null || request.country().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "국가는 필수입니다.");
            }
            // 온보딩에서 서류를 다시 받지 않기로 해서(2026-08-22 강 요청) 이 첨부가 기관
            // 계정의 유일한 심사 근거다 - 선택이 아니라 필수.
            if (bizRegCert == null || bizRegCert.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "증빙서류를 첨부해 주세요.");
            }
        } else {
            if (request.domain() == null || request.domain().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "domain은 필수입니다.");
            }
            if (request.businessRegNo() == null || request.businessRegNo().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "사업자등록번호는 필수입니다.");
            }
            if (bizRegCert == null || bizRegCert.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "사업자등록증을 첨부해 주세요.");
            }
        }

        // com.dpp.mypage.OrganizationService가 (country, bizRegNo) 기준으로 기존 조직이 있으면
        // 합류시키고, 없으면 새로 만든다. 공적 기관이 아니면 여기서 사업자등록증 형식·데이터를
        // 검증해서 완전히 일치할 때만 즉시 ACTIVE로 승인한다(OrganizationService.verifyBizCert).
        Organization org = organizationService.findOrCreateForSignup(
                request.companyName(), request.businessRegNo(), request.country(), request.domain(),
                orgTypeHint, bizRegCert);

        UserAccount user = new UserAccount();
        user.setAccountType(AccountType.BUSINESS);
        user.setCredentialType(CredentialType.PASSWORD);
        user.setEmail(request.email());
        user.setEmailVerified(true);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setPhone(request.phone().replaceAll("[^0-9]", ""));
        user.setPhoneVerified(true);
        user.setDisplayName(request.companyName());
        user.setOnboardingStep(OnboardingStep.SIGNED_UP);
        user.setStatus(AccountStatus.ACTIVE);
        user.setLastLoginAt(OffsetDateTime.now());
        user.setOrgId(org.getOrgId());
        userAccountRepository.save(user);

        // 가입 화면에서 받은 이메일·전화번호를 조직 담당자 연락처로도 채워 둔다.
        // 예전엔 마이페이지에서 따로 입력하기 전까지 비어 있어서, 관리자 심사 화면의
        // 「담당자 연락처 / 담당자 이메일」이 항상 '—'였다(2026-08-22 강 요청).
        // 이미 값이 있으면 덮어쓰지 않는다 - 같은 조직의 두 번째 직원이 가입한다고 해서
        // 회사가 지정해 둔 대표 담당자가 바뀌면 안 된다.
        if (org.getContactEmail() == null || org.getContactEmail().isBlank()) {
            org.setContactEmail(request.email());
        }
        if (org.getContactPhone() == null || org.getContactPhone().isBlank()) {
            org.setContactPhone(user.getPhone());
        }
        organizationRepository.save(org);

        linkPendingCollaborations(request.email(), org.getOrgId(), user.getUserId());
        notifyAdminsOfPendingSignup(org);

        String access = jwtTokenProvider.createAccessToken(
                user.getUserId().toString(), Map.of("accountType", user.getAccountType().name()));
        String refresh = jwtTokenProvider.createRefreshToken(user.getUserId().toString());

        return LoginResponse.of(access, refresh, user.getAccountType().name(), user.getEmail(), user.getDisplayName(),
                org.getOrgType(), org.getDomain());
    }

    /**
     * 관리자 심사가 필요한(approval_status=PENDING) 신규 가입이 들어오면 운영자 전원에게
     * 알림을 남긴다. 2026-08-22 강 요청 "세관이나 EU에서 가입신청 넣으면 알림센터에 알림이
     * 도착하게" - 세관·시장감독기관은 항상 수동 심사라 반드시 여기 걸리고, 제조사·협력사도
     * 사업자등록증 자동승인을 통과하지 못하면 같은 알림이 간다(관리자가 심사할 일이 생긴
     * 것은 마찬가지다). 자동승인으로 이미 ACTIVE가 된 조직은 알리지 않는다.
     *
     * 같은 조직에 두 번째 직원이 가입하는 경우엔 조직이 이미 있으므로 PENDING이 아니면
     * 조용히 지나간다. 조직이 여전히 PENDING이면 알림이 한 번 더 가는데, 심사가 아직
     * 안 끝났다는 신호라 중복이라기보다 리마인더에 가깝다.
     */
    private void notifyAdminsOfPendingSignup(Organization org) {
        if (org.getApprovalStatus() != OrgApprovalStatus.PENDING) {
            return;
        }
        String typeLabel = switch (org.getOrgType() == null ? "" : org.getOrgType()) {
            case "CUSTOMS" -> "세관";
            case "EU_AUTHORITY" -> "시장감독기관";
            case "MANUFACTURER" -> "제조사";
            case "RAW_SUPPLIER", "TEST_LAB", "RECYCLER", "LOGISTICS", "DISTRIBUTOR" -> "협력사";
            default -> "기업";
        };
        List<UserAccount> admins = userAccountRepository.findByAccountType(AccountType.ADMIN);
        for (UserAccount admin : admins) {
            Notification notification = new Notification();
            notification.setRecipientUserId(admin.getUserId());
            notification.setCategory(NotificationCategory.ACCOUNT);
            notification.setSubType("ORG_SIGNUP");
            notification.setTitle("[" + typeLabel + "] 가입 심사 요청이 접수되었습니다");
            notification.setBody(org.getOrgName() + " 이(가) " + typeLabel
                    + " 계정으로 가입을 신청했습니다. 회원 관리에서 제출 서류를 확인하고 심사해 주세요.");
            // ?filter=pending - 바로가기를 누르면 「가입대기」 탭이 눌린 채로 열린다
            // (FE useAppLogic.goToLink, 2026-08-22 강 요청).
            notification.setLinkUrl("/admin/approvals?filter=pending");
            notificationRepository.save(notification);
        }
        log.info("가입 심사 요청 알림 발송: org_id={}, orgType={}, 관리자 {}명",
                org.getOrgId(), org.getOrgType(), admins.size());
    }

    /**
     * 이 이메일로 대기 중이던 협력사 초대(DppParticipant.guestEmail, Invitation.inviteeEmail)를
     * 방금 만든 조직에 연결한다. "협력사 초대 -> 정식 가입 후 로그인해서 제출" 흐름의 핵심
     * 연결부 - 이게 없으면 초대받은 사람이 가입해도 자기가 담당한 DPP를 영영 못 찾는다.
     *
     * 초대 이메일과 가입 이메일이 정확히 같아야 매칭된다(대소문자까지 - 둘 다 저장 시
     * lower-case 정규화하는 곳이 없어서 그대로 비교). 다르게 가입하면 수동 연결 수단이
     * 아직 없다 - 나중에 이슈가 되면 관리자 도구나 "초대 링크로 가입" 플로우를 추가할 것.
     *
     * 연결된 초대 건마다 새로 가입한 사용자에게 알림도 하나씩 남긴다(notification.
     * recipient_user_id) - 그 전까지는 dpp_participant/invitation을 채우기만 하고 아무도
     * 이걸 알 방법이 없었다(알림센터는 화면만 있고 쓰는 코드가 이 프로젝트에 하나도
     * 없었음, 2026-08-14).
     */
    private void linkPendingCollaborations(String email, Long orgId, Long userId) {
        List<DppParticipant> participants = dppParticipantRepository.findByGuestEmailAndOrgIdIsNull(email);
        for (DppParticipant participant : participants) {
            participant.setOrgId(orgId);
            dppParticipantRepository.save(participant);
        }

        List<Invitation> invitations = invitationRepository.findByInviteeEmailAndStatus(email, "SENT");
        for (Invitation invitation : invitations) {
            invitation.setStatus("ACCEPTED");
            invitation.setAcceptedOrgId(orgId);
            invitation.setAcceptedAt(OffsetDateTime.now());
            invitationRepository.save(invitation);

            String inviterOrgName = organizationRepository.findById(invitation.getInviterOrgId())
                    .map(Organization::getOrgName)
                    .orElse("협력사");
            Notification notification = new Notification();
            notification.setRecipientUserId(userId);
            notification.setCategory(NotificationCategory.SYSTEM);
            notification.setTitle("협력사 참여 요청이 도착했습니다");
            notification.setBody(inviterOrgName + "에서 DPP 데이터 제출을 요청했습니다. '참여 DPP' 탭에서 확인해 주세요.");
            notificationRepository.save(notification);
        }

        if (!participants.isEmpty() || !invitations.isEmpty()) {
            log.info("가입 이메일 {} 로 대기 중이던 협력사 초대 {}건, 참여 요청 {}건을 조직 {}에 연결했습니다.",
                    email, invitations.size(), participants.size(), orgId);
        }
    }
}
