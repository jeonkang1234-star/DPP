-- =====================================================================
-- 규정 필드 마스터 - 배터리(BATTERY) 도메인
-- 실행 전제: V3__seed_master.sql, V4__seed_requirement_steel.sql, V14__partner_role_split.sql,
--            V16__seed_requirement_textile.sql
--
-- 철강(V4)/섬유(V16)와 동일한 구조(운영자/사양/조성/순환/문서)를 그대로 따르되, 배터리
-- 도메인 특유의 ZKP 검증 대상 문서 2종을 새로 등록한다(zkp-o1js/circuits.mjs에 이미 회로가
-- 있었고 이번에 처음 BE와 연동):
--   - BATTERY_CARBON_REPORT(Q2_07 배터리 탄소발자국 선언) - 재생원료 Co/Li/Ni/Pb 함유율이
--     각 임계값(16/6/6/85%) 이상인지 BatteryCheck 회로로 검증한다. 실제로는 LCA/PCF와
--     같은 성격의 환경성적 문서라, V14__partner_role_split.sql이 PCF_VALUE/시험성적서/
--     LCA·EPD에 적용한 것과 같은 기준으로 responsible_role='TEST_LAB'(①제3자 인증·시험기관)
--     로 배정한다.
--   - RECYCLING_REPORT(Q4_15 재활용 처리 결과 보고서) - 물질회수율 Cu(직접)/Li·Co(리튬코발트
--     산화물 화합물 파생)가 각 기준(90/50/90%) 이상인지 RecyclingCheck 회로로 검증한다.
--     이 문서는 제조사도, 원자재 공급사도 아니라 실제 재활용 처리시설이 발급하는 문서라
--     role 테이블에 처음부터 있었지만 담당 필드가 하나도 없어 초대 옵션에서 제외돼 있던
--     RECYCLER 역할을 여기서 처음 실사용한다(BE InvitationService.ALLOWED_ROLE_CODES에
--     RECYCLER 추가 필요 - Java 쪽 커밋 참고).
-- DUE_DILIGENCE_REPORT(Q4_11 공급망 실사 보고서)는 ZKP 회로가 없다(judge.py 판정 로직
-- 대상 아님, 단순 임계값 비교로 환원 안 되는 서술형 문서) - EU 배터리규정 핵심 요건(코발트/
-- 리튬/니켈/천연흑연 공급망 실사)이라 문서 항목으로는 반드시 포함하되, 원자재 출처 문서라는
-- 성격상 RAW_SUPPLIER(②원자재·화학 공급사)로 배정한다(GRS_CERTIFICATE와 같은 취급).
-- =====================================================================

INSERT INTO document_type (doc_type_code, name_ko, name_en, domain,
                           is_zkp_target, requires_expiry, responsible_role,
                           default_owner, sort_order) VALUES
('BATTERY_CARBON_REPORT', '배터리 탄소발자국 선언',   'Battery Carbon Footprint Declaration', 'BATTERY',
    TRUE,  FALSE, 'TEST_LAB',     'BATCH', 31),
('RECYCLING_REPORT',      '재활용 처리 결과 보고서',   'Recycling Result Report',              'BATTERY',
    TRUE,  FALSE, 'RECYCLER',     'BATCH', 32),
('DUE_DILIGENCE_REPORT',  '공급망 실사 보고서',        'Supply Chain Due Diligence Report',    'BATTERY',
    FALSE, TRUE,  'RAW_SUPPLIER', 'BATCH', 33);


INSERT INTO requirement_field
 (field_code, domain, section, label_ko, label_en, field_kind, storage_target,
  data_type, unit, code_group, linked_doc_type, material_entry_kind,
  is_required, is_auto, responsible_role, validation_rule, sort_order)
VALUES

-- ── B. 운영자 / 시설 (COMMON 항목에 이어 배터리 전용 1개 추가) ─────────
('BATTERY_PLANT_ID','BATTERY','OPERATOR','배터리 제조시설 식별','Battery Plant Identifier',
 'DATA','FIELD_VALUE','STRING',NULL,NULL,NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,206),

-- ── C. 배터리 사양 ───────────────────────────────────────────────────
('BATTERY_CHEMISTRY','BATTERY','SPEC','배터리 화학구성','Battery Chemistry',
 'DATA','FIELD_VALUE','CODE',NULL,'BATTERY_CHEMISTRY',NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,301),
('BATTERY_MODEL_NO','BATTERY','SPEC','배터리 모델번호','Battery Model Number',
 'DATA','FIELD_VALUE','STRING',NULL,NULL,NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,302),
('BATTERY_CATEGORY','BATTERY','SPEC','제품범주(SLI/휴대용/산업용/EV)','Battery Category',
 'DATA','FIELD_VALUE','CODE',NULL,'BATTERY_CATEGORY',NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,303),
-- 정격용량은 업로드 시점(BatteryIngestService)에 파서 값으로 자동 채워진다(비어 있을 때만 -
-- OEKOTEX_CERT_NO와 동일한 fillIfEmpty 패턴). 수기입력도 가능해서 is_auto는 FALSE로 둔다.
('RATED_CAPACITY_KWH','BATTERY','SPEC','정격용량','Rated Capacity',
 'DATA','FIELD_VALUE','NUMBER','KWH',NULL,NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,304),
-- requirement_field.field_code는 도메인별이 아니라 테이블 전체 기준 PK다 - 철강은
-- NET_WEIGHT_T, 섬유는 NET_WEIGHT_KG를 이미 쓰고 있어서 배터리는 BATTERY_NET_WEIGHT_KG로
-- 구분한다(2026-08-16, 처음엔 NET_WEIGHT_KG를 그대로 재사용했다가 섬유와 PK 충돌로 Flyway
-- 마이그레이션이 "duplicate key value violates unique constraint requirement_field_pkey"로
-- 실패한 걸 강이 재빌드 로그에서 발견 - 수정).
('BATTERY_NET_WEIGHT_KG','BATTERY','SPEC','중량','Net Weight',
 'DATA','FIELD_VALUE','NUMBER','KG',NULL,NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,305),

-- ── D. 재생원료 함유율 (Q2_07 배터리 탄소발자국 선언 업로드 시 자동 채움) ─
('RECYCLED_COBALT_RATE','BATTERY','MATERIAL','재생원료 코발트 함유율','Recycled Cobalt Content',
 'DATA','FIELD_VALUE','NUMBER','PERCENT',NULL,NULL,NULL, TRUE, FALSE,'TEST_LAB','^([0-9]|[1-9][0-9]|100)(\.[0-9]+)?$',401),
('RECYCLED_LITHIUM_RATE','BATTERY','MATERIAL','재생원료 리튬 함유율','Recycled Lithium Content',
 'DATA','FIELD_VALUE','NUMBER','PERCENT',NULL,NULL,NULL, TRUE, FALSE,'TEST_LAB','^([0-9]|[1-9][0-9]|100)(\.[0-9]+)?$',402),
('RECYCLED_NICKEL_RATE','BATTERY','MATERIAL','재생원료 니켈 함유율','Recycled Nickel Content',
 'DATA','FIELD_VALUE','NUMBER','PERCENT',NULL,NULL,NULL, TRUE, FALSE,'TEST_LAB','^([0-9]|[1-9][0-9]|100)(\.[0-9]+)?$',403),
-- 리튬이온전지 활물질엔 통상 Pb가 없어 실측 0%(=적용 제외)가 정상 케이스다(judge.py
-- evaluate_battery_pcf 주석) - 필수로 강제하지 않는다.
('RECYCLED_LEAD_RATE','BATTERY','MATERIAL','재생원료 납 함유율(해당 시)','Recycled Lead Content',
 'DATA','FIELD_VALUE','NUMBER','PERCENT',NULL,NULL,NULL, FALSE,FALSE,'TEST_LAB','^([0-9]|[1-9][0-9]|100)(\.[0-9]+)?$',404),
-- CBAM_APPLICABLE과 동일한 패턴 - "탄소발자국 선언 의무(정격용량 2kWh 초과)"는 적합/부적합이
-- 아니라 정보성 플래그라 필수로 강제하지 않고 자동 반영만 한다.
('BATTERY_CARBON_DECLARATION_REQUIRED','BATTERY','MATERIAL','탄소발자국 선언 의무 대상 여부','Carbon Declaration Required',
 'DATA','FIELD_VALUE','BOOLEAN',NULL,NULL,NULL,NULL, FALSE,FALSE,'TEST_LAB',NULL,405),

-- ── E. 재활용 처리 (Q4_15 재활용 처리 결과 보고서 업로드 시 자동 채움) ───
('RECYCLED_COPPER_RECOVERY_RATE','BATTERY','CIRCULAR','물질회수율(구리)','Copper Recovery Rate',
 'DATA','FIELD_VALUE','NUMBER','PERCENT',NULL,NULL,NULL, TRUE, FALSE,'RECYCLER','^([0-9]|[1-9][0-9]|100)(\.[0-9]+)?$',601),
('RECYCLED_LITHIUM_RECOVERY_RATE','BATTERY','CIRCULAR','물질회수율(리튬, 파생)','Lithium Recovery Rate (Derived)',
 'DATA','FIELD_VALUE','NUMBER','PERCENT',NULL,NULL,NULL, TRUE, FALSE,'RECYCLER','^([0-9]|[1-9][0-9]|100)(\.[0-9]+)?$',602),
('RECYCLED_COBALT_RECOVERY_RATE','BATTERY','CIRCULAR','물질회수율(코발트, 파생)','Cobalt Recovery Rate (Derived)',
 'DATA','FIELD_VALUE','NUMBER','PERCENT',NULL,NULL,NULL, TRUE, FALSE,'RECYCLER','^([0-9]|[1-9][0-9]|100)(\.[0-9]+)?$',603),
-- 종합재활용효율은 ZKP 회로 대상이 아니다(judge.py: 소재별 표 투입합계 vs 입고중량 분모
-- 정합성까지 봐야 해서 단순 임계값 비교로 환원 안 됨 - zkp-o1js/README "ZKP 비대상" 참고).
-- 파서가 뽑은 값을 정보성 필드로만 자동 반영한다.
('OVERALL_RECYCLING_EFFICIENCY','BATTERY','CIRCULAR','종합재활용효율','Overall Recycling Efficiency',
 'DATA','FIELD_VALUE','NUMBER','PERCENT',NULL,NULL,NULL, TRUE, FALSE,'RECYCLER','^([0-9]|[1-9][0-9]|100)(\.[0-9]+)?$',604),

-- ── F. 필수 문서 ─────────────────────────────────────────────────────
('DOC_BATTERY_CARBON_REPORT','BATTERY','DOCUMENT','배터리 탄소발자국 선언','Battery Carbon Footprint Declaration',
 'DOCUMENT','DOCUMENT','STRING',NULL,NULL,'BATTERY_CARBON_REPORT',NULL, TRUE, FALSE,'TEST_LAB',NULL,701),
('DOC_RECYCLING_REPORT','BATTERY','DOCUMENT','재활용 처리 결과 보고서','Recycling Result Report',
 'DOCUMENT','DOCUMENT','STRING',NULL,NULL,'RECYCLING_REPORT',NULL, TRUE, FALSE,'RECYCLER',NULL,702),
('DOC_DUE_DILIGENCE_REPORT','BATTERY','DOCUMENT','공급망 실사 보고서','Supply Chain Due Diligence Report',
 'DOCUMENT','DOCUMENT','STRING',NULL,NULL,'DUE_DILIGENCE_REPORT',NULL, TRUE, FALSE,'RAW_SUPPLIER',NULL,703);


-- =====================================================================
-- Tier별 노출 매트릭스 (V4__seed_requirement_steel.sql과 동일한 3단계 원칙)
-- =====================================================================

INSERT INTO field_visibility (field_code, tier_level, visibility)
SELECT field_code, 3, 'FULL'
  FROM requirement_field
 WHERE domain = 'BATTERY';

INSERT INTO field_visibility (field_code, tier_level, visibility)
SELECT field_code, 2,
       CASE WHEN field_code IN ('BATTERY_PLANT_ID')
            THEN 'HIDDEN' ELSE 'FULL' END
  FROM requirement_field
 WHERE domain = 'BATTERY';

INSERT INTO field_visibility (field_code, tier_level, visibility)
SELECT field_code, 1,
       CASE
         WHEN field_code IN (
              'BATTERY_CHEMISTRY','BATTERY_CATEGORY','RATED_CAPACITY_KWH','BATTERY_NET_WEIGHT_KG',
              'RECYCLED_COBALT_RATE','RECYCLED_LITHIUM_RATE','RECYCLED_NICKEL_RATE',
              'OVERALL_RECYCLING_EFFICIENCY')
           THEN 'FULL'
         WHEN field_code IN ('BATTERY_MODEL_NO','BATTERY_PLANT_ID')
           THEN 'MASKED'
         ELSE 'HIDDEN'
       END
  FROM requirement_field
 WHERE domain = 'BATTERY';


-- =====================================================================
-- 검증 쿼리 : 배터리 DPP 1건의 완성도 분모가 몇인지 확인
-- =====================================================================
-- SELECT count(*) AS 완성도_분모
--   FROM requirement_field
--  WHERE domain IN ('COMMON','BATTERY')
--    AND is_required AND NOT is_auto AND is_active;
