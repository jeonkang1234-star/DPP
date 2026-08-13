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

    @Column(name = "submitted_by_org")
    private Long submittedByOrg;

    @Column(name = "submitted_by_user")
    private Long submittedByUser;

    @Column(name = "submitted_at", nullable = false)
    private OffsetDateTime submittedAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();
}
