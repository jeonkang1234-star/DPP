package com.dpp.auth.repository;

import com.dpp.auth.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {

    Optional<UserAccount> findByLoginId(String loginId);

    Optional<UserAccount> findByEmail(String email);

    Optional<UserAccount> findByCiValue(String ciValue);

    boolean existsByLoginId(String loginId);
}
