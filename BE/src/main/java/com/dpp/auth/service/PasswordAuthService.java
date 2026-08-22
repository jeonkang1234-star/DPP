package com.dpp.auth.service;

import com.dpp.auth.dto.LoginResponse;
import com.dpp.auth.entity.AccountStatus;
import com.dpp.auth.entity.AccountType;
import com.dpp.auth.entity.CredentialType;
import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.auth.security.JwtTokenProvider;
import com.dpp.audit.service.AuditLogService;
import com.dpp.mypage.entity.OrgApprovalStatus;
import com.dpp.mypage.entity.Organization;
import com.dpp.mypage.repository.OrganizationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * 이메일 + 비밀번호 로그인. BUSINESS/ADMIN 계정 전용.
 * PERSONAL 계정은 SnsAuthService를 통해서만 가입/로그인한다 (V5 마이그레이션 주석,
 * SnsAuthService 클래스 주석 참고) - 여기서는 PERSONAL로 들어오면 막는다.
 */
@Service
public class PasswordAuthService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCK_MINUTES = 15;

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuditLogService auditLogService;
    private final OrganizationRepository organizationRepository;

    /**
     * 관리자 승인 전까지 로그인 자체를 막는 조직 유형(2026-08-21 강 요청 9번).
     * 세관·시장감독기관은 공권력을 행사하는 계정이라 실제 기관 확인 없이 열어주면 안 된다.
     * 가입 -> 온보딩까지는 그대로 진행시키고(입력 내용은 DB에 남는다), 온보딩을 끝내는
     * 순간 FE가 로그아웃시킨다(obVals.js finish). 그 뒤로는 여기서 403으로 막힌다.
     *
     * 제조사/협력사는 대상이 아니다 - 사업자등록증 자동승인을 통과하지 못하면 PENDING으로
     * 남지만, 그 사이에도 자기 DPP 작성은 계속할 수 있어야 한다(기존 동작 유지).
     */
    private static final Set<String> APPROVAL_GATED_ORG_TYPES = Set.of("CUSTOMS", "EU_AUTHORITY");

    public PasswordAuthService(UserAccountRepository userAccountRepository,
                                PasswordEncoder passwordEncoder,
                                JwtTokenProvider jwtTokenProvider,
                                AuditLogService auditLogService,
                                OrganizationRepository organizationRepository) {
        this.userAccountRepository = userAccountRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.auditLogService = auditLogService;
        this.organizationRepository = organizationRepository;
    }

    @Transactional
    public LoginResponse login(String email, String rawPassword) {
        UserAccount user = userAccountRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다."));

        if (user.getAccountType() == AccountType.PERSONAL) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "개인 회원은 SNS 로그인을 이용해 주세요.");
        }
        if (user.getCredentialType() == CredentialType.SNS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "SNS로 가입된 계정입니다. SNS 로그인을 이용해 주세요.");
        }
        if (user.getStatus() != AccountStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, statusMessage(user.getStatus()));
        }
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(OffsetDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.LOCKED,
                    "로그인 실패 횟수 초과로 잠긴 계정입니다. " + user.getLockedUntil() + " 이후 다시 시도해 주세요.");
        }
        if (user.getPasswordHash() == null || !passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            registerFailedAttempt(user);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다.");
        }

        Organization org = requireApprovedOrganization(user);

        user.setFailedLoginCount((short) 0);
        user.setLockedUntil(null);
        user.setLastLoginAt(OffsetDateTime.now());
        userAccountRepository.save(user);

        Map<String, Object> claims = new HashMap<>();
        claims.put("accountType", user.getAccountType().name());
        if (user.getOrgId() != null) {
            claims.put("orgId", user.getOrgId());
        }

        String access = jwtTokenProvider.createAccessToken(user.getUserId().toString(), claims);
        String refresh = jwtTokenProvider.createRefreshToken(user.getUserId().toString());

        auditLogService.record(user.getUserId(), "LOGIN", "USER_ACCOUNT", user.getUserId(),
                user.getEmail(), "성공", null);

        return LoginResponse.of(access, refresh, user.getAccountType().name(), user.getEmail(), user.getDisplayName(),
                org == null ? null : org.getOrgType(), org == null ? null : org.getDomain());
    }

    /**
     * 세관/시장감독기관 계정은 organization.approval_status가 ACTIVE가 되기 전까지 로그인을
     * 막는다. 통과하면 소속 조직을 그대로 돌려준다 - 응답의 appRole(화면 역할)을 만들 때
     * org_type/domain이 필요해서, 조회를 두 번 하지 않으려고 여기서 같이 넘긴다. 비밀번호 검증을 통과한 뒤에 확인하는 이유는, 승인 상태를 미가입/오답 응답과
     * 구분해 흘리지 않기 위해서다(계정 존재 여부 노출 방지).
     */
    private Organization requireApprovedOrganization(UserAccount user) {
        if (user.getOrgId() == null) {
            return null;
        }
        Organization org = organizationRepository.findById(user.getOrgId()).orElse(null);
        if (org == null || org.getOrgType() == null
                || !APPROVAL_GATED_ORG_TYPES.contains(org.getOrgType())) {
            return org;
        }
        OrgApprovalStatus status = org.getApprovalStatus();
        if (status == OrgApprovalStatus.ACTIVE) {
            return org;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, switch (status) {
            case REJECTED -> "기관 등록 신청이 반려되었습니다. 관리자에게 문의해 주세요.";
            case SUSPENDED -> "정지된 기관 계정입니다. 관리자에게 문의해 주세요.";
            default -> "관리자 승인 대기 중인 기관 계정입니다. 승인 후 로그인할 수 있습니다.";
        });
    }

    /** 실패 5회 누적 시 15분 잠금. 잠금 중 재시도해도 카운트가 더 늘지 않게 여기서만 증가시킨다. */
    private void registerFailedAttempt(UserAccount user) {
        short next = (short) (user.getFailedLoginCount() + 1);
        user.setFailedLoginCount(next);
        if (next >= MAX_FAILED_ATTEMPTS) {
            user.setLockedUntil(OffsetDateTime.now().plusMinutes(LOCK_MINUTES));
        }
        userAccountRepository.save(user);
    }

    private String statusMessage(AccountStatus status) {
        return switch (status) {
            case LOCKED -> "잠긴 계정입니다. 관리자에게 문의해 주세요.";
            case SUSPENDED -> "정지된 계정입니다. 관리자에게 문의해 주세요.";
            case WITHDRAWN -> "탈퇴한 계정입니다.";
            case ACTIVE -> "";
        };
    }
}
