package com.dpp.auth.repository;

import com.dpp.auth.entity.EmailVerification;
import com.dpp.auth.entity.EmailVerificationPurpose;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {

    /** 재발송/검증/가입완료 시 항상 "가장 최근에 요청한 코드" 기준으로 판단한다. */
    Optional<EmailVerification> findFirstByEmailAndPurposeOrderByCreatedAtDesc(
            String email, EmailVerificationPurpose purpose);
}
