package com.dpp.auth.repository;

import com.dpp.auth.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {

    Optional<UserAccount> findByLoginId(String loginId);

    Optional<UserAccount> findByEmail(String email);

    Optional<UserAccount> findByCiValue(String ciValue);

    boolean existsByLoginId(String loginId);

    /** 기업 회원가입 시 이메일 중복 체크용 (BusinessSignupService). */
    boolean existsByEmail(String email);
}
