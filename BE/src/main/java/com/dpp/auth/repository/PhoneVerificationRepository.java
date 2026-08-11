package com.dpp.auth.repository;

import com.dpp.auth.entity.PhoneVerification;
import com.dpp.auth.entity.PhoneVerificationPurpose;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PhoneVerificationRepository extends JpaRepository<PhoneVerification, Long> {

    /** 재발송/검증/가입완료 시 항상 "가장 최근에 요청한 코드" 기준으로 판단한다. */
    Optional<PhoneVerification> findFirstByPhoneAndPurposeOrderByCreatedAtDesc(
            String phone, PhoneVerificationPurpose purpose);
}
