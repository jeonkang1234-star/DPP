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
 * dpp_field_value 테이블 매핑 - "강재 기본 정보" 입력 폼이 실제로 쓰고 읽는 저장소.
 * 컬럼이 value_text/value_num/value_bool/value_date/value_json으로 타입별로 나뉘어 있지만
 * (fn_recalc_completeness가 참조하는 v_dpp_requirement_status의 is_filled 판정은 이 중
 * 아무 컬럼이나 NOT NULL이면 충족으로 본다), 이 화면은 폼이 전부 단순 텍스트 입력이라
 * value_text 하나만 쓴다 - value_num/value_date 등은 항상 NULL로 둔다. 나중에 필드별
 * 전용 입력 컨트롤(숫자/날짜 picker 등)을 만들면 그때 타입별 컬럼 분기를 추가할 것.
 */
@Entity
@Table(name = "dpp_field_value")
@Getter
@Setter
public class DppFieldValue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "value_id")
    private Long valueId;

    @Column(name = "dpp_id", nullable = false)
    private Long dppId;

    @Column(name = "field_code", nullable = false, length = 60)
    private String fieldCode;

    @Column(name = "value_text")
    private String valueText;

    /**
     * 이 값이 어느 문서에서 파싱돼 들어왔는지. 수기 입력이면 null.
     *
     * 컬럼 자체는 V1__schema.sql 때부터 있었지만 2026-08-19까지 아무 코드도 채우지 않았다 -
     * 어느 문서에서 온 값인지 모르면 그 문서가 나중에 반려됐을 때 값을 되돌릴 근거가 없고,
     * 화면에서 "이 값은 성적서에서 왔다"고 말할 수도 없었다(FE가 세션 안에서만 기억하는
     * parsedFieldSources로 흉내내고 있었고, 새로고침하면 사라졌다).
     */
    @Column(name = "source_document_id")
    private Long sourceDocumentId;

    @Column(name = "submitted_by_org")
    private Long submittedByOrg;

    @Column(name = "submitted_by_user")
    private Long submittedByUser;

    @Column(name = "submitted_at", nullable = false)
    private OffsetDateTime submittedAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();
}
