package com.dpp.auth.repository;

import com.dpp.auth.entity.OAuthState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OAuthStateRepository extends JpaRepository<OAuthState, Long> {

    Optional<OAuthState> findByStateAndUsedAtIsNull(String state);
}
