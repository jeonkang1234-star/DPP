package com.dpp.document.entity;

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
 * document 테이블 매핑 (V1__schema.sql). owner_type/owner_id는 다형(polymorphic) 참조라
 * DB FK로 강제되지 않는다 - MODEL/BATCH/DPP/ORGANIZATION 중 어느 테이블을 가리키는지는
 * owner_type이 결정한다. 이번 첫 연동(Q2_05 제강성적서)에서는 항상 owner_type=DPP.
 */
@Entity
@Table(name = "document")
@Getter
@Setter
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "document_id")
    private Long documentId;

    @Column(name = "doc_type_code", nullable = false, length = 40)
    private String docTypeCode;

    @Column(name = "owner_type", nullable = false, length = 20)
    private String ownerType;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @Column(name = "submitted_by_org")
    private Long submittedByOrg;

    @Column(name = "file_name", nullable = false, length = 300)
    private String fileName;

    @Column(name = "file_uri", nullable = false)
    private String fileUri;

    // DB 컬럼이 VARCHAR가 아니라 CHAR(64)(고정길이, bpchar) - JdbcTypeCode를 명시하지 않으면
    // Hibernate가 String을 기본 VARCHAR로 추론해서 스키마 검증(ddl-auto: validate)에서
    // "found bpchar, expecting varchar" 에러로 기동 자체가 죽는다.
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "content_hash", nullable = false, length = 64, columnDefinition = "CHAR(64)")
    private String contentHash;

    @Column(name = "mime_type", length = 100)
    private String mimeType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "virus_scan_status", nullable = false, length = 20)
    private String virusScanStatus = "SKIPPED";

    @Column(name = "review_status", nullable = false, length = 20)
    private String reviewStatus = "PENDING";

    @Column(name = "parsed_at")
    private OffsetDateTime parsedAt;

    @Column(name = "created_by")
    private Long createdBy;
}
