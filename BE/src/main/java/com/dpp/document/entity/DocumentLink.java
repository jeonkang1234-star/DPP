package com.dpp.document.entity;

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
 * document_link 테이블 매핑 (V1__schema.sql) - 문서 1건과 DPP 1건을 잇는다. 지금까지 이걸
 * 쓰는 Java 코드가 없었다: DocumentIngestService(제강성적서 업로드)가 document 행만 저장하고
 * 이 테이블엔 아무것도 안 넣어서, v_dpp_requirement_status/fn_recalc_completeness(둘 다
 * document_link JOIN으로 문서 충족 여부를 판단함, V2__functions.sql 참고)가 Mill Sheet를
 * 업로드해도 절대 "충족"으로 안 잡히는 상태였다(2026-08-14 발견, DocumentIngestService도
 * 같이 고침).
 */
@Entity
@Table(name = "document_link")
@Getter
@Setter
public class DocumentLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "link_id")
    private Long linkId;

    @Column(name = "document_id", nullable = false)
    private Long documentId;

    @Column(name = "dpp_id", nullable = false)
    private Long dppId;

    @Column(name = "link_type", nullable = false, length = 20)
    private String linkType = "DIRECT";

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();
}
