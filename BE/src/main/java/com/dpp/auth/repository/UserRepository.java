package com.dpp.auth.repository;

import com.dpp.auth.entity.SnsProvider;
import com.dpp.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Optional<User> findByCiHash(String ciHash);

    Optional<User> findBySnsProviderAndSnsId(SnsProvider snsProvider, String snsId);

    boolean existsByUsername(String username);
}
