package com.dpp.dpp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * product_model 테이블 매핑. 대시보드 실데이터 조회(DashboardService) 전용 읽기 매핑이라
 * 필요한 컬럼만 담는다 - 여기서 생성/수정하지 않는다(제품 등록 API는 아직 없음, com.dpp.dpp
 * 패키지는 이 대시보드 조회 기능이 사실상 최초).
 */
@Entity
@Table(name = "product_model")
@Getter
@Setter
public class ProductModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "model_id")
    private Long modelId;

    @Column(name = "org_id", nullable = false)
    private Long orgId;

    @Column(name = "internal_sku", nullable = false, length = 60)
    private String internalSku;

    @Column(name = "model_name", nullable = false, length = 200)
    private String modelName;

    @Column(name = "domain", nullable = false, length = 20)
    private String domain;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;
}
