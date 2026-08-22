package com.dpp.auth.service;

import com.dpp.auth.entity.PhoneVerification;
import com.dpp.auth.entity.PhoneVerificationPurpose;
import com.dpp.auth.repository.PhoneVerificationRepository;
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
 * 기업 회원가입용 전화번호 인증코드(6자리) 발급/검증. EmailVerificationService와 완전히 같은 구조 -
 * 코드 원문은 저장하지 않고 SHA-256 해시만 저장한다 (phone_verification.code_hash).
 * BusinessSignupService가 가입 마지막 단계에서 isVerified()로 확인 후 계정을 만든다.
 *
 * 이메일과 달리 user_account.phone에는 유니크 제약이 없어서 existsByPhone 같은 중복 체크는 하지 않는다.
 */
@Service
public class PhoneVerificationService {

    private static final int CODE_TTL_MINUTES = 5;
    private static final int MAX_ATTEMPTS = 5;
    private static final int VERIFIED_WINDOW_MINUTES = 30;
    private static final int RESEND_COOLDOWN_SECONDS = 60;

    private final PhoneVerificationRepository verificationRepository;
    private final SignupSmsSender smsSender;
    private final SecureRandom random = new SecureRandom();
    /** app.sms.enabled=false면 실제 문자가 안 나가므로 화면에서 코드를 확인할 수 있게 한다. */
    private final boolean smsEnabled;

    public PhoneVerificationService(PhoneVerificationRepository verificationRepository,
                                     SignupSmsSender smsSender,
                                     @Value("${app.sms.enabled:false}") boolean smsEnabled) {
        this.verificationRepository = verificationRepository;
        this.smsSender = smsSender;
        this.smsEnabled = smsEnabled;
    }

    /**
     * 인증코드를 발급한다.
     *
     * @return SMS가 꺼져 있을 때(app.sms.enabled=false)만 발급된 코드, 켜져 있으면 null.
     *     실제 문자가 나가지 않는 환경에서 서버 로그를 뒤지지 않고 화면에서 바로 인증을
     *     끝낼 수 있게 하기 위한 것이다(2026-08-21 강 리포트 "전화번호 인증이 안 된다" -
     *     실제로는 동작하고 있었지만 코드를 볼 방법이 컨테이너 로그뿐이었다).
     *     app.sms.enabled=true인 순간 이 값은 null이 되므로 운영에서 코드가 노출될 일은 없다.
     */
    @Transactional
    public String requestCode(String phoneRaw) {
        String phone = normalize(phoneRaw);

        Optional<PhoneVerification> last = verificationRepository
                .findFirstByPhoneAndPurposeOrderByCreatedAtDesc(phone, PhoneVerificationPurpose.BUSINESS_SIGNUP);
        last.ifPresent(prev -> {
            OffsetDateTime cooldownUntil = prev.getCreatedAt().plusSeconds(RESEND_COOLDOWN_SECONDS);
            if (cooldownUntil.isAfter(OffsetDateTime.now())) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                        "인증코드를 너무 자주 요청했습니다. 잠시 후 다시 시도해 주세요.");
            }
        });

        String code = String.format("%06d", random.nextInt(1_000_000));

        PhoneVerification verification = new PhoneVerification();
        verification.setPhone(phone);
        verification.setPurpose(PhoneVerificationPurpose.BUSINESS_SIGNUP);
        verification.setCodeHash(sha256(code));
        verification.setExpiresAt(OffsetDateTime.now().plusMinutes(CODE_TTL_MINUTES));
        verificationRepository.save(verification);

        smsSender.sendVerificationCode(phone, code);
        return smsEnabled ? null : code;
    }

    @Transactional
    public void verifyCode(String phoneRaw, String code) {
        String phone = normalize(phoneRaw);
        PhoneVerification verification = verificationRepository
                .findFirstByPhoneAndPurposeOrderByCreatedAtDesc(phone, PhoneVerificationPurpose.BUSINESS_SIGNUP)
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
    public boolean isVerified(String phoneRaw) {
        String phone = normalize(phoneRaw);
        return verificationRepository
                .findFirstByPhoneAndPurposeOrderByCreatedAtDesc(phone, PhoneVerificationPurpose.BUSINESS_SIGNUP)
                .filter(v -> v.getVerifiedAt() != null)
                .filter(v -> v.getVerifiedAt().plusMinutes(VERIFIED_WINDOW_MINUTES).isAfter(OffsetDateTime.now()))
                .isPresent();
    }

    /** "010-1234-5678"과 "01012345678"을 같은 번호로 다루기 위해 숫자만 남긴다. */
    private String normalize(String phone) {
        return phone == null ? "" : phone.replaceAll("[^0-9]", "");
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
