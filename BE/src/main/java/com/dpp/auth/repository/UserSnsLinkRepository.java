package com.dpp.auth.repository;

import com.dpp.auth.entity.SnsProvider;
import com.dpp.auth.entity.UserSnsLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserSnsLinkRepository extends JpaRepository<UserSnsLink, Long> {

    Optional<UserSnsLink> findByProviderAndSubjectAndUnlinkedAtIsNull(SnsProvider provider, String subject);

    /** /me 응답의 "연결된 계정" 목록용 - 연결 해제(unlinkedAt) 안 된 것만. */
    List<UserSnsLink> findByUserAccount_UserIdAndUnlinkedAtIsNull(Long userId);
}
