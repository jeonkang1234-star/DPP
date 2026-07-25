package com.dpp.auth.repository;

import com.dpp.auth.entity.SnsProvider;
import com.dpp.auth.entity.UserSnsLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserSnsLinkRepository extends JpaRepository<UserSnsLink, Long> {

    Optional<UserSnsLink> findByProviderAndSubjectAndUnlinkedAtIsNull(SnsProvider provider, String subject);
}
