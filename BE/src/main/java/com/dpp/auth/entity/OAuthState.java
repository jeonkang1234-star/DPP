package com.dpp.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * oauth_state 테이블 매핑. OAuth 로그인 버튼 클릭 시점과 콜백 시점 사이를 이어주는 임시 저장소.
 * CSRF(state)/PKCE(code_verifier) 방어용. ip_address, user_agent 컬럼은
 * INET 타입 매핑이 번거로워 1차에서는 엔티티에 포함하지 않았다 (DB 컬럼 자체는 남아있음).
 */
@Entity
@Table(name = "oauth_state")
@Getter
@Setter
public class OAuthState {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "state_id")
    private Long stateId;

    @Column(name = "state", nullable = false, unique = true, length = 128)
    private String state;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 20)
    private SnsProvider provider;

    @Column(name = "nonce", length = 128)
    private String nonce;

    @Column(name = "code_verifier", length = 128)
    private String codeVerifier;

    @Column(name = "redirect_uri", length = 500)
    private String redirectUri;

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", nullable = false, length = 20)
    private OAuthStatePurpose purpose = OAuthStatePurpose.LOGIN;

    @Column(name = "link_user_id")
    private Long linkUserId;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "used_at")
    private OffsetDateTime usedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();
}
