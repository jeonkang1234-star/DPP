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
 * product_model 테이블 매핑. 원래 대시보드 조회(DashboardService) 전용 읽기 매핑으로
 * 시작했지만, FieldFormService(강재 기본 정보 입력)가 첫 임시저장 시점에 이 엔티티로
 * product_model 행을 실제로 생성한다 - "제품 선택/등록" 화면이 따로 없어서 임시로
 * 자동 생성하는 것(FieldFormService.createDraftDpp 주석 참고).
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
