package com.dpp.blockchain.entity;

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
 * blockchain_anchor 테이블 매핑 (V1__schema.sql). "이 target_type/target_id를 체인에
 * 기록하려고 시도했다"는 사실 자체의 기록계 - 실제 체인코드 함수 호출(recordDocumentHash/
 * recordZkpVerification)의 성공/실패 여부와 tx_id를 남긴다.
 */
@Entity
@Table(name = "blockchain_anchor")
@Getter
@Setter
public class BlockchainAnchor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "anchor_id")
    private Long anchorId;

    /** DOCUMENT | DPP_SNAPSHOT | EVENT (recordZkpVerification 앵커는 EVENT로 기록). */
    @Column(name = "target_type", nullable = false, length = 20)
    private String targetType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    // document 테이블과 동일하게 DB 컬럼이 CHAR(64)(bpchar) - VARCHAR로 추론되지 않게 명시.
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "content_hash", nullable = false, length = 64, columnDefinition = "CHAR(64)")
    private String contentHash;

    @Column(name = "channel_name", length = 60)
    private String channelName;

    @Column(name = "chaincode", length = 60)
    private String chaincode;

    @Column(name = "tx_id", length = 120)
    private String txId;

    @Column(name = "block_no")
    private Long blockNo;

    /** PENDING | MOCK | CONFIRMED | FAILED */
    @Column(name = "status", nullable = false, length = 20)
    private String status = "PENDING";

    @Column(name = "retry_count", nullable = false)
    private Short retryCount = 0;

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "anchored_at")
    private OffsetDateTime anchoredAt;
}
