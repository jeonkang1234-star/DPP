-- =====================================================================
-- 배터리 조건부 검증 + 생애주기 단계 귀속 + 문서/입력값 교차검증 (2026-09-19 강 요청)
--
-- 지금까지의 전제는 "requirement_field.is_required=TRUE 인 항목을 전부 채우면 발급"
-- 하나뿐이었다. 배터리는 그게 성립하지 않는다:
--
--  (1) EU 배터리규정 2023/1542 제77조의 배터리 여권 의무는 배터리 유형별로 갈린다.
--      EV / LMT / 산업용(2kWh 초과)만 대상이고, SLI / 휴대용 / 산업용 2kWh 이하는
--      대상이 아니다. 대상이 아닌 배터리에까지 BMS 동적데이터·성능내구성·공급망
--      실사 항목을 요구하면 영원히 발급이 안 된다.
--  (2) 재활용 처리 결과처럼 "발급 시점에는 존재할 수 없는" 문서가 필수로 잡혀 있다.
--      이건 발급을 막을 항목이 아니라 수명종료 단계에 받는 항목이다.
--  (3) 문서에서 파싱한 값과 사람이 친 값이 다를 때, 지금은 파서 값을 조용히 버린다
--      (DocumentSlotService.fillIfEmpty). 다르다는 사실 자체가 검증 결과여야 한다.
--
-- 이 마이그레이션은 그 세 가지를 담을 자리만 만든다. 실제 배터리 필드 140개에
-- 조건·단계를 배정하는 건 V37에서 한다.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. requirement_field - 조건부 적용 + 생애주기 귀속
-- ---------------------------------------------------------------------
ALTER TABLE requirement_field
    -- NULL = 언제나 적용. 그 외에는 아래 두 형태 중 하나를 쓴다:
    --   {"battery_passport": true}              배터리 여권 대상일 때만
    --   {"battery_passport": false}             비대상일 때만
    --   {"field":"<코드>","in":["A","B"]}        다른 필드가 그 값일 때만
    -- tier/t1_condition(V20)은 "왜 조건부인가"를 사람이 읽는 서술이고, 이 컬럼은
    -- 같은 내용을 기계가 판정할 수 있게 적은 것이다 - 둘 다 남긴다.
    ADD COLUMN applies_when    JSONB,
    -- 이 항목이 어느 생애주기 단계에서 채워지는가(lifecycle_stage_def.stage_no).
    -- NULL 은 "제조 단계"로 본다 - 기존 철강/섬유 항목을 건드리지 않기 위한 기본값.
    ADD COLUMN lifecycle_stage SMALLINT CHECK (lifecycle_stage BETWEEN 1 AND 12);

COMMENT ON COLUMN requirement_field.applies_when IS 'NULL=항상 필수. JSONB 조건 충족 시에만 필수(fn_field_applies)';
COMMENT ON COLUMN requirement_field.lifecycle_stage IS '이 항목이 채워지는 생애주기 단계(lifecycle_stage_def.stage_no). NULL=제조 단계';

-- 발급 게이트가 되는 단계의 경계. 1~8(원자재~유통)까지가 "발급 전에 다 있어야 하는"
-- 범위이고, 9~12(사용/유지보수/회수/재활용)는 발급 이후에 쌓인다. 숫자를 코드 여러
-- 곳에 흩어놓지 않으려고 함수 하나로 둔다.
CREATE OR REPLACE FUNCTION fn_issue_gate_max_stage() RETURNS SMALLINT AS $$
    SELECT 8::SMALLINT;
$$ LANGUAGE sql IMMUTABLE;


-- ---------------------------------------------------------------------
-- 2. 배터리 여권 대상 판정
--
-- 반환값:
--   TRUE  = 여권 의무 대상 (EV / LMT / 산업용 2kWh 초과)
--   FALSE = 비대상       (SLI / 휴대용 / 산업용 2kWh 이하)
--   NULL  = 아직 판정 불가 (분류 미입력, 또는 배터리 도메인이 아님)
--
-- 산업용은 분류 코드만으로 갈리지 않고 정격용량을 같이 봐야 한다. 그래서 코드값을
-- INDUSTRIAL 하나로 두고 RATED_CAPACITY_KWH 로 2kWh 경계를 판정한다 - 코드를
-- INDUSTRIAL_OVER_2KWH / INDUSTRIAL_UNDER_2KWH 둘로 쪼개면 사용자가 용량을 고쳐도
-- 분류가 따라오지 않아 두 값이 어긋날 수 있다.
--
-- 산업용인데 용량이 아직 비어 있으면 NULL(판정 보류)을 돌려준다 - 그 상태에서 임의로
-- FALSE 를 주면 필수 항목이 조용히 사라진다.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_battery_passport_required(p_dpp_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    v_domain   VARCHAR(20);
    v_category TEXT;
    v_kwh      NUMERIC;
BEGIN
    SELECT domain INTO v_domain FROM dpp WHERE dpp_id = p_dpp_id;
    IF v_domain IS DISTINCT FROM 'BATTERY' THEN
        RETURN NULL;
    END IF;

    SELECT upper(trim(v.value_text)) INTO v_category
      FROM dpp_field_value v
     WHERE v.dpp_id = p_dpp_id AND v.field_code = 'BATTERY_CATEGORY';

    IF v_category IS NULL OR v_category = '' THEN
        RETURN NULL;
    END IF;

    IF v_category IN ('EV', 'LMT') THEN
        RETURN TRUE;
    END IF;

    IF v_category IN ('SLI', 'PORTABLE') THEN
        RETURN FALSE;
    END IF;

    IF v_category = 'INDUSTRIAL' THEN
        SELECT COALESCE(v.value_num, NULLIF(regexp_replace(COALESCE(v.value_text, ''), '[^0-9.]', '', 'g'), '')::NUMERIC)
          INTO v_kwh
          FROM dpp_field_value v
         WHERE v.dpp_id = p_dpp_id AND v.field_code = 'RATED_CAPACITY_KWH';
        IF v_kwh IS NULL THEN
            RETURN NULL;
        END IF;
        RETURN v_kwh > 2;
    END IF;

    -- 모르는 분류 코드는 보수적으로 대상 취급한다 - 빠뜨리는 쪽보다 더 요구하는 쪽이 안전하다.
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION fn_battery_passport_required(BIGINT) IS 'EU 2023/1542 제77조 배터리 여권 대상 여부. NULL=판정 보류';


-- ---------------------------------------------------------------------
-- 3. applies_when 평가
--
-- p_passport 는 호출부가 이미 계산해 둔 fn_battery_passport_required 결과를 넘긴다
-- (뷰에서 DPP 한 건당 한 번만 계산하기 위해서 - 필드마다 다시 부르면 140배가 된다).
-- 판정 보류(NULL)일 때는 조건을 만족한 것으로 본다 = 전부 보여준다.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_field_applies(p_dpp_id BIGINT, p_applies_when JSONB, p_passport BOOLEAN)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_applies_when IS NULL THEN
        RETURN TRUE;
    END IF;

    IF jsonb_exists(p_applies_when, 'battery_passport') THEN
        IF p_passport IS NULL THEN
            RETURN TRUE;
        END IF;
        RETURN (p_applies_when ->> 'battery_passport')::BOOLEAN = p_passport;
    END IF;

    IF jsonb_exists(p_applies_when, 'field') THEN
        RETURN EXISTS (
            SELECT 1
              FROM dpp_field_value v
             WHERE v.dpp_id = p_dpp_id
               AND v.field_code = p_applies_when ->> 'field'
               AND upper(trim(COALESCE(v.value_text, ''))) IN (
                     SELECT upper(trim(x)) FROM jsonb_array_elements_text(p_applies_when -> 'in') AS x
                   )
        );
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;


-- ---------------------------------------------------------------------
-- 4. v_dpp_requirement_status 재정의
--
-- 기존 컬럼은 순서·이름 그대로 두고 뒤에만 덧붙인다(CREATE OR REPLACE VIEW 제약).
-- 새로 붙는 것:
--   is_applicable      - 이 DPP 에서 이 항목이 적용되는가(조건 충족)
--   effective_required - 실제로 채워야 하는가 = is_required AND is_applicable
--   stage_no           - 귀속 단계(NULL 은 제조 단계 4로 본다)
--   is_issue_gate      - 발급 전에 있어야 하는 항목인가(stage_no <= 8)
--   passport_required  - 이 DPP 의 여권 대상 판정 결과(디버깅/화면 표시용)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_dpp_requirement_status AS
SELECT
    d.dpp_id,
    rf.field_code,
    rf.section,
    rf.label_ko,
    rf.field_kind,
    rf.storage_target,
    rf.is_required,
    rf.responsible_role,
    rf.linked_doc_type,
    rf.sort_order,
    CASE
        WHEN rf.storage_target = 'FIELD_VALUE' THEN EXISTS (
            SELECT 1 FROM dpp_field_value v
             WHERE v.dpp_id = d.dpp_id
               AND v.field_code = rf.field_code
               AND (v.value_text IS NOT NULL OR v.value_num  IS NOT NULL
                 OR v.value_bool IS NOT NULL OR v.value_date IS NOT NULL
                 OR v.value_json IS NOT NULL)
        )
        WHEN rf.storage_target = 'MATERIAL_COMPOSITION' THEN EXISTS (
            SELECT 1 FROM material_composition m
             WHERE m.dpp_id = d.dpp_id
               AND m.entry_kind = COALESCE(rf.material_entry_kind, 'MATERIAL')
        )
        WHEN rf.storage_target = 'DOCUMENT' THEN EXISTS (
            SELECT 1
              FROM document_link dl
              JOIN document doc ON doc.document_id = dl.document_id
             WHERE dl.dpp_id = d.dpp_id
               AND doc.doc_type_code = rf.linked_doc_type
               AND doc.review_status = 'APPROVED'
               AND doc.deleted_at IS NULL
        )
        ELSE FALSE
    END AS is_filled,
    fn_field_applies(d.dpp_id, rf.applies_when, ctx.passport)            AS is_applicable,
    (rf.is_required AND fn_field_applies(d.dpp_id, rf.applies_when, ctx.passport)) AS effective_required,
    COALESCE(rf.lifecycle_stage, 4)::SMALLINT                            AS stage_no,
    (COALESCE(rf.lifecycle_stage, 4) <= fn_issue_gate_max_stage())       AS is_issue_gate,
    ctx.passport                                                          AS passport_required
FROM dpp d
CROSS JOIN LATERAL (SELECT fn_battery_passport_required(d.dpp_id) AS passport) ctx
JOIN requirement_field rf
     ON rf.domain IN ('COMMON', d.domain)
    AND rf.is_active
    AND NOT rf.is_auto
WHERE d.deleted_at IS NULL;

COMMENT ON VIEW v_dpp_requirement_status IS 'DPP별 규정 필드 충족 현황. 화면·완성도·독촉의 단일 출처. effective_required=조건 반영 후 실제 필수';


-- ---------------------------------------------------------------------
-- 5. 미충족 필드 - 조건 미적용 항목과 발급 이후 단계 항목은 빼고 본다
--
-- "미충족"은 지금 당장 발급을 막고 있는 것만 가리켜야 한다. 재활용 처리 결과처럼
-- 아직 생길 수 없는 항목이 여기 섞여 있으면 목록이 영구 미충족으로 오염된다 -
-- 그건 v_dpp_lifecycle_status 쪽에서 단계별로 보여준다.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_dpp_missing_field AS
SELECT
    s.dpp_id,
    s.field_code,
    s.section,
    s.label_ko,
    s.field_kind,
    s.linked_doc_type,
    s.responsible_role,
    r.role_name_ko AS responsible_role_name,
    p.org_id       AS responsible_org_id,
    p.guest_email  AS responsible_email,
    s.sort_order
FROM v_dpp_requirement_status s
LEFT JOIN role r
       ON r.role_code = s.responsible_role
LEFT JOIN dpp_participant p
       ON p.dpp_id = s.dpp_id
      AND p.role_code = s.responsible_role
WHERE s.effective_required
  AND s.is_issue_gate
  AND NOT s.is_filled;


-- ---------------------------------------------------------------------
-- 6. 완성도 - 발급 게이트 범위만 분모로 센다
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_recalc_completeness(p_dpp_id BIGINT)
RETURNS NUMERIC AS $$
DECLARE
    v_required INT;
    v_filled   INT;
    v_rate     NUMERIC(5,2);
BEGIN
    SELECT count(*) FILTER (WHERE effective_required AND is_issue_gate),
           count(*) FILTER (WHERE effective_required AND is_issue_gate AND is_filled)
      INTO v_required, v_filled
      FROM v_dpp_requirement_status
     WHERE dpp_id = p_dpp_id;

    v_rate := CASE WHEN v_required = 0 THEN 0
                   ELSE round(v_filled::NUMERIC * 100 / v_required, 2) END;

    UPDATE dpp
       SET completeness   = v_rate,
           filled_count   = v_filled,
           required_count = v_required,
           updated_at     = now()
     WHERE dpp_id = p_dpp_id;

    RETURN v_rate;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------
-- 7. 생애주기 단계별 진행 상태
--
-- "그 단계의 데이터·문서가 들어오면 그 단계가 끝난 것으로 본다"(강 요청)를 그대로
-- 계산한다. 필수 항목이 하나도 없는 단계(포장/보관 등)는 required_count=0 이고,
-- 그런 단계는 화면에서 '해당 없음'으로 둔다 - 0/0을 100%로 올리면 아무 일도 안
-- 일어났는데 완료로 보인다.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_dpp_lifecycle_status AS
SELECT
    d.dpp_id,
    sd.stage_no,
    sd.stage_code,
    sd.stage_name_ko,
    sd.requires_anchor,
    (sd.stage_no <= fn_issue_gate_max_stage())                                   AS is_issue_gate,
    count(s.field_code) FILTER (WHERE s.effective_required)                      AS required_count,
    count(s.field_code) FILTER (WHERE s.effective_required AND s.is_filled)      AS filled_count
FROM dpp d
JOIN lifecycle_stage_def sd
     ON sd.domain = d.domain AND sd.is_active
LEFT JOIN v_dpp_requirement_status s
     ON s.dpp_id = d.dpp_id AND s.stage_no = sd.stage_no
WHERE d.deleted_at IS NULL
GROUP BY d.dpp_id, sd.stage_no, sd.stage_code, sd.stage_name_ko, sd.requires_anchor;

COMMENT ON VIEW v_dpp_lifecycle_status IS 'DPP별 생애주기 단계 진행률. 그 단계 귀속 필수 항목이 다 차면 그 단계가 끝난 것';


-- ---------------------------------------------------------------------
-- 8. 문서 파싱값 <-> 직접 입력값 교차검증
--
-- 지금까지 DocumentSlotService.fillIfEmpty 는 "이미 값이 있으면 건너뛴다"였다.
-- 그래서 사람이 친 값과 문서에서 뽑힌 값이 달라도 아무 데도 남지 않았다. 이 표는
-- 그 비교 결과 자체를 보관한다 - 불일치가 남아 있으면 발급을 막는다.
--
-- 한 필드에 여러 문서가 값을 줄 수 있으므로 (dpp_id, field_code, document_id) 단위로
-- 한 행을 둔다. 같은 문서를 다시 올리면 그 행을 덮어쓴다.
-- ---------------------------------------------------------------------
CREATE TABLE dpp_field_cross_check (
    check_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dpp_id         BIGINT       NOT NULL REFERENCES dpp(dpp_id),
    field_code     VARCHAR(60)  NOT NULL REFERENCES requirement_field(field_code),
    document_id    BIGINT       REFERENCES document(document_id),
    -- 사람이 폼에 친 값(비교 시점 기준)
    entered_value  VARCHAR(500),
    -- 파서가 문서에서 뽑은 값
    parsed_value   VARCHAR(500),
    status         VARCHAR(20)  NOT NULL
                   CHECK (status IN ('MATCH','MISMATCH','RESOLVED')),
    -- 불일치를 어떻게 정리했는지. KEEP_ENTERED=입력값 유지, USE_PARSED=문서값 채택
    resolution     VARCHAR(20)
                   CHECK (resolution IN ('KEEP_ENTERED','USE_PARSED')),
    resolved_by    BIGINT       REFERENCES user_account(user_id),
    resolved_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ux_cross_check UNIQUE (dpp_id, field_code, document_id)
);
CREATE INDEX ix_cross_check_open ON dpp_field_cross_check (dpp_id) WHERE status = 'MISMATCH';

COMMENT ON TABLE dpp_field_cross_check IS '문서 파싱값과 수기 입력값 비교 결과. MISMATCH가 남아 있으면 발급 차단';

CREATE TRIGGER trg_cross_check_touch BEFORE UPDATE ON dpp_field_cross_check
    FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();


-- ---------------------------------------------------------------------
-- 9. 기존 DPP 완성도 재계산 - 분모 정의가 바뀌었으므로 전부 다시 매긴다
-- ---------------------------------------------------------------------
SELECT fn_recalc_completeness(dpp_id) FROM dpp WHERE deleted_at IS NULL;
