-- =====================================================================
-- 배터리 필드 140개에 "언제 필수인가"(applies_when)와 "어느 단계에서 채워지는가"
-- (lifecycle_stage)를 배정한다. 자리는 V36 에서 만들었다.
--
-- 배정은 필드 하나하나가 아니라 섹션 단위로 한다 - 같은 섹션이면 근거 조항도
-- 발생 시점도 같기 때문이고, 140줄을 손으로 나열하면 나중에 필드가 추가될 때마다
-- 여기를 같이 고쳐야 한다는 걸 아무도 기억하지 못한다. 섹션 규칙에서 벗어나는
-- 항목만 아래쪽에서 개별로 덮어쓴다.
--
-- 근거(2026-09-19 확인): EU 2023/1542 제77조 - 배터리 여권 의무 대상은
-- EV / LMT / 산업용 2kWh 초과. SLI / 휴대용 / 산업용 2kWh 이하는 비대상.
-- 비대상 배터리도 이 플랫폼에서는 DPP 를 발급할 수 있게 두되(강 요청의
-- "Other Battery workflow"), 여권 전용 항목은 필수에서 빠진다.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. 여권 대상에서만 필수인 섹션
--
--  BMS          Annex XIII 부속 동적데이터. 여권이 있어야 담을 곳이 있다.
--  PERFORMANCE  성능·내구성 파라미터. Annex XIII 2(성능·내구성)
--  CRM          핵심 원자재 공급망. 실사 의무와 짝.
--  DUE_DILIGENCE 공급망 실사 보고.
--  CARBON       탄소발자국 선언.
--  SYSTEM       여권 데이터 스키마/서명 메타. 여권이 없으면 의미가 없다.
--  APPROVAL     최종 여권 승인 서명.
-- ---------------------------------------------------------------------
UPDATE requirement_field
   SET applies_when = '{"battery_passport": true}'::jsonb
 WHERE domain = 'BATTERY'
   AND section IN ('BMS','PERFORMANCE','CRM','DUE_DILIGENCE','CARBON','SYSTEM','APPROVAL');

-- 해체·재목적 정보(CIRCULAR 중 V21 이 심은 서술형 항목)도 여권 전용이다. 같은 섹션에
-- 있는 물질회수율 4종(V17)은 여권 여부와 무관한 재활용 효율 기준이라 제외한다.
UPDATE requirement_field
   SET applies_when = '{"battery_passport": true}'::jsonb
 WHERE domain = 'BATTERY'
   AND section = 'CIRCULAR'
   AND field_code NOT IN ('RECYCLED_COPPER_RECOVERY_RATE','RECYCLED_LITHIUM_RECOVERY_RATE',
                          'RECYCLED_COBALT_RECOVERY_RATE','OVERALL_RECYCLING_EFFICIENCY');

-- 문서 2종도 여권 전용. 재활용 처리 결과 보고서(DOC_RECYCLING_REPORT)는 모든 폐배터리가
-- 대상이므로 여기서 뺀다.
UPDATE requirement_field
   SET applies_when = '{"battery_passport": true}'::jsonb
 WHERE field_code IN ('DOC_BATTERY_CARBON_REPORT','DOC_DUE_DILIGENCE_REPORT');


-- ---------------------------------------------------------------------
-- 2. 생애주기 단계 배정 (lifecycle_stage_def: BATTERY 1~12)
--     1 원자재 조달 / 2 활물질 생산 / 3 셀 제조 / 4 팩 조립 / 5 포장
--     6 운송·물류 / 7 보관 / 8 유통·판매 / 9 사용 / 10 유지보수·재사용
--     11 회수·수명종료 / 12 재활용·폐기
--
-- 발급 게이트는 8 까지다(V36 fn_issue_gate_max_stage). 9 이상으로 배정한 항목은
-- 발급을 막지 않고, 발급 이후 해당 단계에서 채워지면 그 단계가 완료로 바뀐다 -
-- "재활용 정보처럼 발급 단계에서 받을 수 없는 문서는 이후 제출로 모으자"(강 요청).
-- ---------------------------------------------------------------------

-- 1 원자재 조달 - 어떤 광물을 어디서 얼마나 가져왔는가
UPDATE requirement_field SET lifecycle_stage = 1
 WHERE domain = 'BATTERY' AND section IN ('CRM','DUE_DILIGENCE');
UPDATE requirement_field SET lifecycle_stage = 1
 WHERE field_code IN ('RECYCLED_COBALT_RATE','RECYCLED_LITHIUM_RATE',
                      'RECYCLED_NICKEL_RATE','RECYCLED_LEAD_RATE',
                      'DOC_DUE_DILIGENCE_REPORT');

-- 3 셀 제조 - 셀 화학구성과 유해물질은 셀이 만들어질 때 확정된다
UPDATE requirement_field SET lifecycle_stage = 3
 WHERE domain = 'BATTERY' AND section IN ('COMPOSITION','HAZARD');

-- 4 팩 조립 - 식별자·사양·성능·탄소·해체정보. 발급 시점에 있어야 하는 본체
UPDATE requirement_field SET lifecycle_stage = 4
 WHERE domain = 'BATTERY' AND section IN ('IDENTIFIER','SPEC','OPERATOR','PERFORMANCE','CARBON','SYSTEM');
UPDATE requirement_field SET lifecycle_stage = 4
 WHERE domain = 'BATTERY' AND section = 'CIRCULAR'
   AND field_code NOT IN ('RECYCLED_COPPER_RECOVERY_RATE','RECYCLED_LITHIUM_RECOVERY_RATE',
                          'RECYCLED_COBALT_RECOVERY_RATE','OVERALL_RECYCLING_EFFICIENCY');
UPDATE requirement_field SET lifecycle_stage = 4
 WHERE domain = 'BATTERY' AND section = 'DOCUMENT'
   AND field_code NOT IN ('DOC_RECYCLING_REPORT','DOC_DUE_DILIGENCE_REPORT');
UPDATE requirement_field SET lifecycle_stage = 4
 WHERE field_code = 'BATTERY_CARBON_DECLARATION_REQUIRED';

-- 6 운송·물류 - 포장재 정보는 출하 시점
UPDATE requirement_field SET lifecycle_stage = 6
 WHERE domain = 'BATTERY' AND section = 'TRADE';

-- 8 유통·판매 - 최종 여권 승인 서명은 시장 출시 직전
UPDATE requirement_field SET lifecycle_stage = 8
 WHERE domain = 'BATTERY' AND section = 'APPROVAL';

-- 9 사용 - BMS 동적데이터는 발급 시점에 존재할 수 없다. 여기가 핵심 교정 지점
UPDATE requirement_field SET lifecycle_stage = 9
 WHERE domain = 'BATTERY' AND section = 'BMS';

-- 12 재활용·폐기 - 물질회수율과 재활용 처리 결과 보고서
UPDATE requirement_field SET lifecycle_stage = 12
 WHERE field_code IN ('RECYCLED_COPPER_RECOVERY_RATE','RECYCLED_LITHIUM_RECOVERY_RATE',
                      'RECYCLED_COBALT_RECOVERY_RATE','OVERALL_RECYCLING_EFFICIENCY',
                      'DOC_RECYCLING_REPORT');


-- ---------------------------------------------------------------------
-- 3. 개별 배터리 고유 식별자 - 모델 식별자와 분리 (강 요청 1번)
--
-- BATTERY_MODEL_NO 는 모델 단위 식별자다(같은 모델이면 같은 값). EU 여권은 그것과
-- 별개로 "개별 배터리 한 대"를 가리키는 식별자를 요구한다 - product_model 은 모델,
-- dpp 는 개별 제품이라는 이 스키마의 구분과도 맞는다(product_model.granularity 가
-- BATTERY 만 'ITEM' 인 이유).
--
-- 값은 서버가 DPP 생성 시 만들어 채우고(FieldFormService), 같은 값을
-- dpp.serial_number 에도 넣어 ux_dpp_serial 로 중복을 막는다. 수기 수정도 허용해야
-- 해서(공장에서 이미 부여한 일련번호가 있는 경우) is_auto 는 FALSE 로 둔다 -
-- is_auto=TRUE 로 두면 v_dpp_requirement_status 가 아예 이 항목을 빼버려서 화면에도
-- 안 뜨고 여권에도 안 실린다.
-- ---------------------------------------------------------------------
INSERT INTO requirement_field
 (field_code, domain, section, label_ko, label_en, field_kind, storage_target,
  data_type, is_required, is_auto, responsible_role, sort_order,
  tier, binding_strength, legal_basis, disclosure_scope, data_source,
  is_mvp, help_text, lifecycle_stage)
VALUES
('BATTERY_UNIQUE_ID', 'BATTERY', 'IDENTIFIER', '개별 배터리 고유 식별자', 'Battery Unique Identifier',
 'DATA', 'FIELD_VALUE', 'STRING', TRUE, FALSE, 'MANUFACTURER', 1004,
 'T0', '확정 법령', 'Regulation (EU) 2023/1542 Art.77 + Annex XIII 1(a)', 'PUBLIC', 'SYSTEM',
 -- help_text 는 비워 둔다(2026-09-19 강 요청). 라벨만으로 충분한 칸에 설명 문장을 붙이면
 -- 폼이 안내문으로 뒤덮여 정작 입력할 곳이 안 보인다 - "비워 두면 자동 생성"은 실제로
 -- 그렇게 동작하므로 굳이 읽힐 필요가 없다.
 TRUE, NULL, 4)
ON CONFLICT (field_code) DO UPDATE SET
    section         = EXCLUDED.section,
    label_ko        = EXCLUDED.label_ko,
    label_en        = EXCLUDED.label_en,
    is_required     = EXCLUDED.is_required,
    is_auto         = EXCLUDED.is_auto,
    sort_order      = EXCLUDED.sort_order,
    help_text       = NULL,
    lifecycle_stage = EXCLUDED.lifecycle_stage;

INSERT INTO field_visibility (field_code, tier_level, visibility) VALUES
('BATTERY_UNIQUE_ID', 1, 'FULL'),
('BATTERY_UNIQUE_ID', 2, 'FULL'),
('BATTERY_UNIQUE_ID', 3, 'FULL')
ON CONFLICT (field_code, tier_level) DO UPDATE SET visibility = EXCLUDED.visibility;


-- ---------------------------------------------------------------------
-- 4. 분류 코드 정리 - 산업용 2kWh 경계는 코드가 아니라 정격용량으로 판정한다
--
-- 기존 라벨이 '산업용(2kWh 초과)' 였는데, 그러면 2kWh 이하 산업용 배터리를 고를
-- 코드가 아예 없다. 라벨에서 용량 조건을 떼고, 판정은 fn_battery_passport_required
-- 가 RATED_CAPACITY_KWH 를 같이 보고 하도록 V36 에서 정리했다.
-- ---------------------------------------------------------------------
UPDATE code_master
   SET name_ko = '산업용'
 WHERE code_group = 'BATTERY_CATEGORY' AND code = 'INDUSTRIAL';

-- 분류/정격용량은 입력 폼 맨 위 전용 칸에서 먼저 고르게 바뀌었다(2026-09-19 강 요청).
-- 무엇이 달라지는지는 화면 상단의 대상/비대상 배지가 바로 보여주므로, 칸마다 규정 설명을
-- 덧붙이지 않는다. V17/V21 이 남겨둔 기존 help_text 도 같이 지운다.
UPDATE requirement_field
   SET label_ko  = '배터리 분류',
       help_text = NULL
 WHERE field_code = 'BATTERY_CATEGORY';

UPDATE requirement_field
   SET help_text = NULL
 WHERE field_code = 'RATED_CAPACITY_KWH';

-- 정격용량은 산업용 판정에 반드시 필요하므로 필수로 승격한다(V17 에서 이미 TRUE 지만
-- 명시적으로 남겨 둔다 - 이 값이 비면 fn_battery_passport_required 가 판정 보류가 된다).
UPDATE requirement_field SET is_required = TRUE WHERE field_code = 'RATED_CAPACITY_KWH';


-- ---------------------------------------------------------------------
-- 5. 분모 정의가 다시 바뀌었으므로 완성도 재계산
-- ---------------------------------------------------------------------
SELECT fn_recalc_completeness(dpp_id) FROM dpp WHERE deleted_at IS NULL;
