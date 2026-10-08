package com.dpp.auth.service;

import com.dpp.auth.entity.AccountStatus;
import com.dpp.auth.entity.EmailVerification;
import com.dpp.auth.entity.EmailVerificationPurpose;
import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.EmailVerificationRepository;
import com.dpp.auth.repository.UserAccountRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.HexFormat;

/**
 * 로그인 5회 실패로 잠긴 계정을 이메일 인증으로 푼다(2026-10-08, 개발보고서 "인증과 세션" -
 * "로그인 5회 실패 시 계정을 잠그고 이메일 재인증으로 풀도록 했다").
 *
 * 흐름: 로그인 423 → 화면이 "이메일로 잠금 해제" 를 띄움 → requestCode(email) 로 6자리 코드
 * 발송 → unlock(email, code) 성공 시 status=ACTIVE, 실패 횟수 0. 코드 저장·만료·시도 제한은
 * 회원가입 이메일 인증(EmailVerificationService)과 같은 규칙과 같은 테이블(purpose 로 구분).
 */
@Service
public class AccountUnlockService {

    private static final int CODE_TTL_MINUTES = 10;
    private static final int MAX_ATTEMPTS = 5;
    private static final int RESEND_COOLDOWN_SECONDS = 60;
    private static final EmailVerificationPurpose PURPOSE = EmailVerificationPurpose.ACCOUNT_UNLOCK;

    private final UserAccountRepository userAccountRepository;
    private final EmailVerificationRepository verificationRepository;
    private final SignupMailSender mailSender;
    private final boolean mailEnabled;
    private final SecureRandom random = new SecureRandom();

    public AccountUnlockService(UserAccountRepository userAccountRepository,
                                EmailVerificationRepository verificationRepository,
                                SignupMailSender mailSender,
                                @Value("${app.mail.enabled:false}") boolean mailEnabled) {
        this.userAccountRepository = userAccountRepository;
        this.verificationRepository = verificationRepository;
        this.mailSender = mailSender;
        this.mailEnabled = mailEnabled;
    }

    /**
     * 잠금 해제 코드 발송.
     *
     * @return 메일이 꺼진 환경이면 코드(화면이 자동으로 채운다 - 회원가입 인증과 같은 규약), 켜져 있으면 null
     */
    @Transactional
    public String requestCode(String email) {
        UserAccount user = lockedUser(email);
        verificationRepository.findFirstByEmailAndPurposeOrderByCreatedAtDesc(user.getEmail(), PURPOSE)
                .ifPresent(prev -> {
                    if (prev.getCreatedAt().plusSeconds(RESEND_COOLDOWN_SECONDS).isAfter(OffsetDateTime.now())) {
                        throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                                "인증코드를 너무 자주 요청했습니다. 잠시 후 다시 시도해 주세요.");
                    }
                });

        String code = String.format("%06d", random.nextInt(1_000_000));
        EmailVerification v = new EmailVerification();
        v.setEmail(user.getEmail());
        v.setPurpose(PURPOSE);
        v.setCodeHash(sha256(code));
        v.setExpiresAt(OffsetDateTime.now().plusMinutes(CODE_TTL_MINUTES));
        verificationRepository.save(v);

        mailSender.sendVerificationCode(user.getEmail(), code);
        return mailEnabled ? null : code;
    }

    /** 코드가 맞으면 계정 잠금을 푼다. 시도 횟수 초과·만료는 새 코드를 받아야 한다. */
    @Transactional(noRollbackFor = ResponseStatusException.class)
    public void unlock(String email, String code) {
        UserAccount user = lockedUser(email);
        EmailVerification v = verificationRepository
                .findFirstByEmailAndPurposeOrderByCreatedAtDesc(user.getEmail(), PURPOSE)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "인증코드를 먼저 요청해 주세요."));
        if (v.getVerifiedAt() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 사용한 인증코드입니다. 새 코드를 요청해 주세요.");
        }
        if (v.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "인증코드가 만료되었습니다. 다시 요청해 주세요.");
        }
        if (v.getAttemptCount() >= MAX_ATTEMPTS) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "시도 횟수를 초과했습니다. 인증코드를 다시 요청해 주세요.");
        }
        if (code == null || !v.getCodeHash().equals(sha256(code.trim()))) {
            v.setAttemptCount((short) (v.getAttemptCount() + 1));
            verificationRepository.save(v);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "인증코드가 올바르지 않습니다.");
        }
        v.setVerifiedAt(OffsetDateTime.now());
        verificationRepository.save(v);

        user.setStatus(AccountStatus.ACTIVE);
        user.setFailedLoginCount((short) 0);
        user.setLockedUntil(null);
        userAccountRepository.save(user);
    }

    private UserAccount lockedUser(String email) {
        String normalized = email == null ? "" : email.trim();
        UserAccount user = userAccountRepository.findByEmailAndDeletedAtIsNull(normalized)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "잠긴 계정이 아닙니다."));
        boolean locked = user.getStatus() == AccountStatus.LOCKED
                || (user.getLockedUntil() != null && user.getLockedUntil().isAfter(OffsetDateTime.now()));
        if (!locked) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "잠긴 계정이 아닙니다.");
        }
        return user;
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
