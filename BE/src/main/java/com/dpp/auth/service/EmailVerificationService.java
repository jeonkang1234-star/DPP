package com.dpp.auth.service;

import com.dpp.auth.entity.EmailVerification;
import com.dpp.auth.entity.EmailVerificationPurpose;
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
import java.util.Optional;

/**
 * 기업 회원가입용 이메일 인증코드(6자리) 발급/검증.
 * 코드 원문은 저장하지 않고 SHA-256 해시만 저장한다 (email_verification.code_hash).
 * BusinessSignupService가 가입 마지막 단계에서 isVerified()로 확인 후 계정을 만든다.
 */
@Service
public class EmailVerificationService {

    private static final int CODE_TTL_MINUTES = 5;
    private static final int MAX_ATTEMPTS = 5;
    /** 인증 완료 후 실제 가입(BusinessSignupService.signup)까지 허용하는 유효 시간. */
    private static final int VERIFIED_WINDOW_MINUTES = 30;
    /** 재발송 스팸 방지 - 직전 요청으로부터 이 시간 이내면 재요청을 막는다. */
    private static final int RESEND_COOLDOWN_SECONDS = 60;

    private final EmailVerificationRepository verificationRepository;
    private final UserAccountRepository userAccountRepository;
    private final SignupMailSender mailSender;
    private final boolean mailEnabled;
    private final SecureRandom random = new SecureRandom();

    public EmailVerificationService(EmailVerificationRepository verificationRepository,
                                     UserAccountRepository userAccountRepository,
                                     SignupMailSender mailSender,
                                     @Value("${app.mail.enabled:false}") boolean mailEnabled) {
        this.verificationRepository = verificationRepository;
        this.userAccountRepository = userAccountRepository;
        this.mailSender = mailSender;
        this.mailEnabled = mailEnabled;
    }

    /**
     * @return SMTP가 꺼져 있으면(app.mail.enabled=false) 방금 발급한 코드, 켜져 있으면 null.
     *         전화번호 인증(PhoneVerificationService.requestCode)과 같은 규약이다.
     *         메일이 실제로 나가지 않는 환경에서 "발송했습니다" 토스트만 뜨고 아무 일도
     *         일어나지 않아 혼란스러웠다(2026-08-22 강 리포트) - 코드를 같이 내려주면
     *         화면이 "메일 미설정 환경"임을 분명히 말할 수 있다. 켜져 있을 땐 절대 내려주지
     *         않으므로 코드가 새어나갈 일은 없다.
     */
    @Transactional
    public String requestCode(String email) {
        if (userAccountRepository.existsByEmailAndDeletedAtIsNull(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 가입된 이메일입니다.");
        }

        Optional<EmailVerification> last = verificationRepository
                .findFirstByEmailAndPurposeOrderByCreatedAtDesc(email, EmailVerificationPurpose.BUSINESS_SIGNUP);
        last.ifPresent(prev -> {
            OffsetDateTime cooldownUntil = prev.getCreatedAt().plusSeconds(RESEND_COOLDOWN_SECONDS);
            if (cooldownUntil.isAfter(OffsetDateTime.now())) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                        "인증코드를 너무 자주 요청했습니다. 잠시 후 다시 시도해 주세요.");
            }
        });

        String code = String.format("%06d", random.nextInt(1_000_000));

        EmailVerification verification = new EmailVerification();
        verification.setEmail(email);
        verification.setPurpose(EmailVerificationPurpose.BUSINESS_SIGNUP);
        verification.setCodeHash(sha256(code));
        verification.setExpiresAt(OffsetDateTime.now().plusMinutes(CODE_TTL_MINUTES));
        verificationRepository.save(verification);

        mailSender.sendVerificationCode(email, code);
        return mailEnabled ? null : code;
    }

    @Transactional
    public void verifyCode(String email, String code) {
        EmailVerification verification = verificationRepository
                .findFirstByEmailAndPurposeOrderByCreatedAtDesc(email, EmailVerificationPurpose.BUSINESS_SIGNUP)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "인증코드를 먼저 요청해 주세요."));

        if (verification.getVerifiedAt() != null) {
            return; // 이미 인증 완료된 요청 - 중복 호출은 그냥 통과시킨다.
        }
        if (verification.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "인증코드가 만료되었습니다. 다시 요청해 주세요.");
        }
        if (verification.getAttemptCount() >= MAX_ATTEMPTS) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "시도 횟수를 초과했습니다. 인증코드를 다시 요청해 주세요.");
        }
        if (!verification.getCodeHash().equals(sha256(code))) {
            verification.setAttemptCount((short) (verification.getAttemptCount() + 1));
            verificationRepository.save(verification);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "인증코드가 올바르지 않습니다.");
        }

        verification.setVerifiedAt(OffsetDateTime.now());
        verificationRepository.save(verification);
    }

    /** BusinessSignupService가 가입을 확정하기 전에 호출. */
    @Transactional(readOnly = true)
    public boolean isVerified(String email) {
        return verificationRepository
                .findFirstByEmailAndPurposeOrderByCreatedAtDesc(email, EmailVerificationPurpose.BUSINESS_SIGNUP)
                .filter(v -> v.getVerifiedAt() != null)
                .filter(v -> v.getVerifiedAt().plusMinutes(VERIFIED_WINDOW_MINUTES).isAfter(OffsetDateTime.now()))
                .isPresent();
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            // SHA-256은 모든 JVM에 기본 내장되어 있어 실제로는 발생하지 않는다.
            throw new IllegalStateException(e);
        }
    }
}
