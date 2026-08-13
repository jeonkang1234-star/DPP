package com.dpp.dpp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * requirement_field 테이블 매핑 - 읽기 전용 기준정보(V4__seed_requirement_steel.sql로 시딩됨).
 * "강재 기본 정보" 입력 폼의 필드 목록/라벨/필수여부를 이 테이블에서 가져온다 - 지금까지는
 * FE mocks/data.json의 makerFieldSets가 라벨·힌트를 통째로 흉내내고 있었다.
 *
 * data_type이 STRING/NUMBER/BOOLEAN/DATE 등으로 나뉘어 있지만, 이 폼은 전부 단순 텍스트
 * 입력으로만 받는다 - dpp_field_value에는 항상 value_text로 저장한다(FieldFormService 참고).
 * MATERIAL_COMPOSITION/DOCUMENT storage_target 필드(화학조성, 각종 증빙서류)는 이 화면
 * 범위 밖이라 제외한다 - FieldFormService에서 storage_target='FIELD_VALUE' AND
 * field_kind='DATA' AND is_auto=false 인 것만 조회한다.
 */
@Entity
@Table(name = "requirement_field")
@Getter
@Setter
public class RequirementField {

    @Id
    @Column(name = "field_code", length = 60)
    private String fieldCode;

    @Column(name = "domain", nullable = false, length = 20)
    private String domain;

    @Column(name = "section", nullable = false, length = 40)
    private String section;

    @Column(name = "label_ko", nullable = false, length = 200)
    private String labelKo;

    @Column(name = "field_kind", nullable = false, length = 20)
    private String fieldKind;

    @Column(name = "storage_target", nullable = false, length = 30)
    private String storageTarget;

    @Column(name = "data_type", nullable = false, length = 20)
    private String dataType;

    @Column(name = "unit", length = 20)
    private String unit;

    @Column(name = "is_required", nullable = false)
    private boolean required;

    @Column(name = "is_auto", nullable = false)
    private boolean auto;

    @Column(name = "help_text", length = 500)
    private String helpText;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "is_active", nullable = false)
    private boolean active;
}
