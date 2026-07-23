package com.dpp.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 회원 엔티티.
 * *** 주민등록번호 원본은 절대 저장하지 않는다. *** 본인인증(PASS/NICE) 결과인 ciHash만 저장한다.
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Tier tier = Tier.UNASSIGNED;

    @Column(length = 50)
    private String username;

    @Column(length = 255)
    private String email;

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Column(name = "company_name", length = 255)
    private String companyName;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    /** 본인인증(PASS/NICE) CI 해시. 주민번호 원본 저장 금지. */
    @Column(name = "ci_hash", length = 255)
    private String ciHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "sns_provider", length = 20)
    private SnsProvider snsProvider;

    @Column(name = "sns_id", length = 255)
    private String snsId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder
    public User(UserRole role, Tier tier, String username, String email, String passwordHash,
                String companyName, String phoneNumber, String ciHash,
                SnsProvider snsProvider, String snsId) {
        this.role = role;
        this.tier = (tier != null) ? tier : Tier.UNASSIGNED;
        this.username = username;
        this.email = email;
        this.passwordHash = passwordHash;
        this.companyName = companyName;
        this.phoneNumber = phoneNumber;
        this.ciHash = ciHash;
        this.snsProvider = snsProvider;
        this.snsId = snsId;
        this.createdAt = LocalDateTime.now();
    }
}
