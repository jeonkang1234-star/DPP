package com.dpp.auth.service;

import com.dpp.auth.dto.LoginResponse;
import com.dpp.auth.entity.AccountStatus;
import com.dpp.auth.entity.AccountType;
import com.dpp.auth.entity.CredentialType;
import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.auth.security.JwtTokenProvider;
import com.dpp.audit.service.AuditLogService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

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

    public PasswordAuthService(UserAccountRepository userAccountRepository,
                                PasswordEncoder passwordEncoder,
                                JwtTokenProvider jwtTokenProvider,
                                AuditLogService auditLogService) {
        this.userAccountRepository = userAccountRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.auditLogService = auditLogService;
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

        return LoginResponse.of(access, refresh, user.getAccountType().name(), user.getEmail(), user.getDisplayName());
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
