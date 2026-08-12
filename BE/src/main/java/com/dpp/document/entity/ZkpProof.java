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
 * zkp_proof 테이블 매핑 (V1__schema.sql). zkp-o1js 서버가 돌려준 증명(zk-SNARK proof)과
 * 판정 결과(참/거짓)를 저장한다 - 실측값(private input) 자체는 여기에도 안 들어간다.
 */
@Entity
@Table(name = "zkp_proof")
@Getter
@Setter
public class ZkpProof {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "proof_id")
    private Long proofId;

    @Column(name = "dpp_id", nullable = false)
    private Long dppId;

    @Column(name = "target_type", nullable = false, length = 20)
    private String targetType = "DOCUMENT";

    @Column(name = "document_id")
    private Long documentId;

    @Column(name = "claim_type", nullable = false, length = 30)
    private String claimType;

    @Column(name = "circuit_name", length = 100)
    private String circuitName;

    /** o1js proof.toJSON()을 그대로 문자열로 저장 - 재검증(verify) 시 다시 파싱해서 쓸 수 있다. */
    @Column(name = "proof_data")
    private String proofData;

    /** 회로 공개 입력(한계치)과 공개 출력(항목별 참/거짓)만 - 실측값은 없음. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "public_signals", columnDefinition = "jsonb")
    private String publicSignals;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "verified_at")
    private OffsetDateTime verifiedAt;
}
