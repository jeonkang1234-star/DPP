package com.dpp.document.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * document_type 테이블 매핑 (V1__schema.sql) - 문서 유형 기준정보(V3__seed_master.sql로 시딩).
 * 지금은 is_zkp_target 하나만 실제로 쓰인다 - DocumentSlotService.getForm()이 이 값으로
 * "제출 필요 문서" 목록을 검증이 필요한 데이터(ZKP 대상)와 형식만 확인하면 되는 문서로
 * 나눠서 FE에 내려준다(DocumentSlotDto.zkpTarget).
 */
@Entity
@Table(name = "document_type")
@Getter
@Setter
public class DocumentType {

    @Id
    @Column(name = "doc_type_code", length = 40)
    private String docTypeCode;

    @Column(name = "name_ko", nullable = false, length = 200)
    private String nameKo;

    @Column(name = "is_zkp_target", nullable = false)
    private boolean zkpTarget;

    @Column(name = "requires_expiry", nullable = false)
    private boolean requiresExpiry;
}
