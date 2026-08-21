package com.dpp.dpp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * dpp 테이블 매핑 - 대시보드 실데이터 조회 전용(com.dpp.document.entity.Dpp와는 별개).
 * 그쪽은 "조직당 DPP 1건"만 가정한 문서 업로드용 임시 조회 엔티티라 손대지 않고,
 * 여기서는 완성도/개수 집계에 필요한 컬럼까지 포함한 별도 읽기 매핑을 새로 둔다.
 *
 * completeness/filled_count/required_count는 fn_recalc_completeness() 호출 전까지는
 * 오래된 값일 수 있다(V2__functions.sql 주석: 필드값 저장/문서승인/문서만료/소재등록
 * 시점에 재계산 - 근데 그 호출부가 아직 어디에도 없다). DashboardService가 조회 직전에
 * 매번 재계산을 트리거한다.
 *
 * @Entity(name=...)로 JPA 엔티티명을 명시하는 이유: 지정 안 하면 기본값이 단순 클래스명
 * "Dpp"인데, com.dpp.document.entity.Dpp도 클래스명이 똑같은 "Dpp"라 패키지가 달라도
 * Hibernate 메타모델에서 이름이 충돌한다(DuplicateMappingException, 2026-08-13에 실제로
 * 이걸로 기동이 죽었었다 - 리포지토리 빈 이름 충돌을 고친 직후 바로 이 두 번째 충돌이
 * 나왔다). JPA 엔티티명은 JPQL에서만 쓰이고 이 프로젝트는 네이티브 쿼리/파생 메서드만
 * 쓰기 때문에 이름을 바꿔도 다른 코드에 영향 없다.
 */
@Entity(name = "DppDashboard")
@Table(name = "dpp")
@Getter
@Setter
public class Dpp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "dpp_id")
    private Long dppId;

    @Column(name = "public_uuid", nullable = false)
    private UUID publicUuid;

    @Column(name = "model_id", nullable = false)
    private Long modelId;

    @Column(name = "owner_org_id", nullable = false)
    private Long ownerOrgId;

    @Column(name = "domain", nullable = false, length = 20)
    private String domain;

    @Column(name = "serial_number", length = 100)
    private String serialNumber;

    /** 사용자가 붙인 이름(내부 식별용). 공개 여권·EU 레지스트리에는 내보내지 않는다(V27). */
    @Column(name = "display_name", length = 120)
    private String displayName;

    @Column(name = "issued_at")
    private OffsetDateTime issuedAt;

    @Column(name = "lifecycle_stage", nullable = false)
    private short lifecycleStage = 1;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "DRAFT";

    @Column(name = "completeness", nullable = false, precision = 5, scale = 2)
    private BigDecimal completeness = BigDecimal.ZERO;

    @Column(name = "filled_count", nullable = false)
    private short filledCount = 0;

    @Column(name = "required_count", nullable = false)
    private short requiredCount = 0;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;
}
