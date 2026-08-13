package com.dpp.mypage.entity;

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
 * scan_history 테이블 매핑. 개인 회원이 제품 여권(DPP)을 조회(스캔)한 이력.
 * dpp_id는 FK 강제가 아니라 참고용 nullable 컬럼이다 - V8 마이그레이션 주석 참고.
 */
@Entity
@Table(name = "scan_history")
@Getter
@Setter
public class ScanHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "scan_id")
    private Long scanId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "dpp_id")
    private Long dppId;

    @Column(name = "passport_code", nullable = false, length = 100)
    private String passportCode;

    @Column(name = "product_name", nullable = false, length = 200)
    private String productName;

    @Column(name = "brand_name", length = 200)
    private String brandName;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ScanStatus status = ScanStatus.VERIFIED;

    @Column(name = "scanned_at", nullable = false)
    private OffsetDateTime scannedAt = OffsetDateTime.now();

    @Column(name = "passport_updated_at")
    private OffsetDateTime passportUpdatedAt;

    @Column(name = "removed_at")
    private OffsetDateTime removedAt;
}
