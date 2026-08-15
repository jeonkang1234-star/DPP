package com.dpp.document.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * material_composition 테이블 매핑 (V1__schema.sql) - 화학조성/우려물질/재생함량.
 * 테이블 코멘트 그대로 "문서 자동 파싱 결과 매핑 대상"이라, 사람이 직접 타이핑하는 화면이
 * 아니라 DocumentIngestService가 Mill Sheet 파싱 결과(chemical_composition_wt_percent)를
 * 업로드 시점에 그대로 채워 넣는 용도다(2026-08-15 - "화학조성 입력 화면"으로 불렸지만
 * 실제로는 새 입력 폼이 아니라 이미 파싱되는 값을 저장하는 단계가 빠져 있던 것).
 * entry_kind='CHEM_ELEMENT'만 지금 채운다 - MATERIAL/SOC는 아직 매핑하는 코드가 없다.
 */
@Entity
@Table(name = "material_composition")
@Getter
@Setter
public class MaterialComposition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "composition_id")
    private Long compositionId;

    @Column(name = "dpp_id", nullable = false)
    private Long dppId;

    @Column(name = "entry_kind", nullable = false, length = 20)
    private String entryKind;

    @Column(name = "material_name", nullable = false, length = 200)
    private String materialName;

    @Column(name = "content_rate", precision = 9, scale = 4)
    private BigDecimal contentRate;

    @Column(name = "content_unit", nullable = false, length = 10)
    private String contentUnit = "PERCENT";

    @Column(name = "source_document_id")
    private Long sourceDocumentId;
}
