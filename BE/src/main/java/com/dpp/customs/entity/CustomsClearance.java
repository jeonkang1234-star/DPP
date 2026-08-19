package com.dpp.customs.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

/**
 * customs_clearance 테이블 매핑(V1__schema.sql + V18__customs_jurisdiction.sql).
 *
 * 같은 통관 신청(하나의 dpp + 하나의 수입국)에서 관할이 맞는 세관마다 행이 하나씩
 * 생긴다(clearanceSide로 EXPORT/IMPORT 구분) - CustomsClearanceService.createRequest 참고.
 * 2026-08-19 강 요청: "세관 마다 확인해야 할 DPP가 달라야 함" + "수출국도 봐야하고
 * 수입도 봐야하는거 아닌가?".
 *
 * export/import_country_code는 V18에서 CHAR(2)(Postgres bpchar)로 만들었는데,
 * Hibernate 6은 스키마 검증 시 columnDefinition 텍스트를 무시하고 자바 타입(String)
 * 기준 기본값(VARCHAR)으로 기대 타입을 계산해서 "found bpchar ... expecting
 * varchar" 검증 실패가 났었다(2026-08-19, 배포 후 /auth/login 502로 발견 - 백엔드가
 * 아예 기동을 못해서 nginx가 업스트림을 못 찾은 것). columnDefinition만으로는 검증
 * 단계에 반영이 안 되므로 @JdbcTypeCode로 CHAR 타입코드를 명시해서 DDL/검증 양쪽 다
 * bpchar로 맞춘다. 이미 적용된 V18 마이그레이션 자체는 체크섬 문제 때문에 건드리지
 * 않는다.
 */
@Entity
@Table(name = "customs_clearance")
@Getter
@Setter
public class CustomsClearance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "clearance_id")
    private Long clearanceId;

    @Column(name = "dpp_id", nullable = false)
    private Long dppId;

    @Column(name = "snapshot_id")
    private Long snapshotId;

    @Column(name = "customs_org_id")
    private Long customsOrgId;

    @Column(name = "hs_code", length = 12)
    private String hsCode;

    @Column(name = "decision", nullable = false, length = 20)
    private String decision = "PENDING";

    @Column(name = "reason", length = 1000)
    private String reason;

    @Column(name = "integrity_result", length = 20)
    private String integrityResult;

    @Column(name = "decided_by")
    private Long decidedBy;

    @Column(name = "decided_at")
    private OffsetDateTime decidedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "clearance_side", length = 10)
    private String clearanceSide;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "export_country_code", length = 2, columnDefinition = "CHAR(2)")
    private String exportCountryCode;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "import_country_code", length = 2, columnDefinition = "CHAR(2)")
    private String importCountryCode;

    @Column(name = "importer_name", length = 200)
    private String importerName;

    @Column(name = "importer_address", length = 300)
    private String importerAddress;

    @Column(name = "importer_eori", length = 30)
    private String importerEori;

    @Column(name = "requested_by_org_id")
    private Long requestedByOrgId;
}
