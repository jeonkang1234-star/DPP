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

    // 2026-08-19 강 요청: "문서 영문명이랑 한글명 매치도 시켜줘" - DB엔 진작부터 label_en
    // 컬럼이 있었는데(V1__schema.sql, V4/V13/V16/V17 시딩 데이터도 전부 채워져 있음) 엔티티에
    // 매핑이 안 돼 있어서 FE에 한 번도 내려간 적이 없었다. nullable로 둔 이유: 이론상
    // label_en이 비어있는 행이 생겨도(향후 관리자가 필드 추가) 문서 화면 자체가 깨지면
    // 안 되기 때문 - FE 쪽에서 없으면 그냥 한글명만 보여준다.
    @Column(name = "label_en", length = 200)
    private String labelEn;

    @Column(name = "field_kind", nullable = false, length = 20)
    private String fieldKind;

    @Column(name = "storage_target", nullable = false, length = 30)
    private String storageTarget;

    // storage_target='DOCUMENT'인 행에서만 값이 있다 - document_type.doc_type_code를
    // 가리킨다(예: DOC_MILL_SHEET -> 'MILL_SHEET'). 문서 업로드 화면(DocumentSlotService)이
    // 이 값으로 document/document_link 테이블을 조회한다.
    @Column(name = "linked_doc_type", length = 40)
    private String linkedDocType;

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

    // 협력사(dpp_participant) 제출 권한 분기에 쓴다 - FieldFormService가 요청자가 DPP
    // 소유 조직이 아니라 참여 협력사면 이 값이 자기 role_code와 같은 필드만 보여준다/
    // 저장을 허용한다.
    @Column(name = "responsible_role", length = 30)
    private String responsibleRole;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    // ── 규제 분류 메타데이터 (V20__requirement_field_spec_columns.sql) ──────────
    // 출처는 'DPP_데이터항목_분류.xlsx' - 909개 항목을 근거 조항 유무로 T0~T4로 판정한 표다.
    // 여기 있는 값들은 화면 동작을 바꾸지는 않고(필수 여부는 여전히 is_required가 결정한다),
    // "이 칸을 왜 받는가"를 사용자와 심사자에게 설명하는 데 쓴다.

    /** T0 법정필수 / T1 조건부필수 / T2 초안·예정 / T3 자체부가 / T4 제외권장. */
    @Column(name = "tier", length = 2)
    private String tier;

    /** 인용한 근거가 지금 구속력이 있는지 - '구속', '조건부 구속', '위임법 대기' 등. */
    @Column(name = "binding_strength", length = 30)
    private String bindingStrength;

    /** 근거 법령명 + 조·부속서. 근거를 못 쓰면 T0·T1이 될 수 없다는 게 분류표의 판정 규칙 1이다. */
    @Column(name = "legal_basis", length = 400)
    private String legalBasis;

    /** T1일 때 의무가 발동하는 조건. T0/T2~T4는 null. */
    @Column(name = "t1_condition", length = 300)
    private String t1Condition;

    /**
     * PUBLIC / RESTRICTED / TRADE_SECRET.
     * 공개 QR 페이지(PublicPassportService)가 PUBLIC 이외를 걸러내는 기준이다 - 그전까지는
     * 값이 있는 필드를 전부 공개했다(HEAD_NO·설비ID까지 QR로 노출되고 있었다).
     */
    @Column(name = "disclosure_scope", nullable = false, length = 20)
    private String disclosureScope;

    /**
     * PARSER / MANUAL / SYSTEM. 입력 폼에서 "문서에서 자동 인식되는 항목"과 "직접 입력해야
     * 하는 항목"을 가르는 기준. 지금까지 FE makerVals.js가 필드코드 26개를 손으로 나열해서
     * 이 구분을 흉내내고 있었는데, 필드가 300개를 넘으면 그 방식은 유지가 안 된다.
     */
    @Column(name = "data_source", nullable = false, length = 10)
    private String dataSource;

    /** 분류표 원본 행 참조 ('STEEL#148'). 근거를 다시 따질 때 출발점. */
    @Column(name = "spec_ref", length = 120)
    private String specRef;

    /** 분류표 MVP 열 - 보유 목데이터 문서로 실제 값이 나오는 항목인지. */
    @Column(name = "is_mvp", nullable = false)
    private boolean mvp;

    /** 분류표 '검토 의견' - 왜 이 등급인지, 어떤 인용을 고쳤는지. */
    @Column(name = "review_note", length = 600)
    private String reviewNote;

    /**
     * code_master.code_group. 선택지가 명확한 Enum 필드만 값이 있고(V22), 나머지는 null이라
     * FE가 자유 텍스트로 그린다.
     */
    @Column(name = "code_group", length = 40)
    private String codeGroup;

    @Column(name = "is_active", nullable = false)
    private boolean active;
}
