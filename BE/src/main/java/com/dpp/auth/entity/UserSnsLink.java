package com.dpp.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

/** user_sns_link 테이블 매핑. 계정 하나에 카카오/네이버/구글을 각각 연결 가능. */
@Entity
@Table(name = "user_sns_link")
@Getter
@Setter
public class UserSnsLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "link_id")
    private Long linkId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount userAccount;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 20)
    private SnsProvider provider;

    /** OIDC sub 클레임. 제공자가 발급한 불변 회원번호. 이메일로 식별하면 안 됨. */
    @Column(name = "subject", nullable = false, length = 200)
    private String subject;

    @Column(name = "provider_email", length = 200)
    private String providerEmail;

    @Column(name = "provider_nickname", length = 100)
    private String providerNickname;

    @Column(name = "profile_image_url")
    private String profileImageUrl;

    @Column(name = "is_primary", nullable = false)
    private boolean primary = false;

    @Column(name = "scopes", length = 300)
    private String scopes;

    @Column(name = "linked_at", nullable = false)
    private OffsetDateTime linkedAt = OffsetDateTime.now();

    @Column(name = "last_login_at")
    private OffsetDateTime lastLoginAt;

    @Column(name = "unlinked_at")
    private OffsetDateTime unlinkedAt;
}
