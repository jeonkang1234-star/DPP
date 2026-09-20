-- =====================================================================
--  시연용 과천제철 세트 시드 - 2026-08-24 (EC2 소실분 재구축)
--
--  세 가지 시연 시나리오를 위한 최소 세트를 한 번에 만든다.
--    1) EU 집행위 계정으로 과천제철이 발급한 DPP 조회
--    2) 개인회원 로그인 후 검색해서 같은 DPP 조회
--    3) 과천제철이 도메인 확장신청 -> 운영자가 승인
--
--  *** 실행은 반드시 아래 방법으로만 (docker/ 디렉터리에서) ***
--    docker cp seed-demo-gwacheon.sql dpp-postgres:/tmp/seed-demo-gwacheon.sql
--    docker exec -i dpp-postgres psql -U dpp -d dpp -f /tmp/seed-demo-gwacheon.sql
--
--  *** 절대 PowerShell 파이프로 실행하지 말 것 ***
--    Get-Content ... | docker exec -i ...   <- cp949 재인코딩으로 한글이 깨진다
--    (seed-test-manufacturer.sql 상단 설명과 같은 이유)
--
--  여러 번 돌려도 안전하다(사업자등록번호/이메일 기준으로 이미 있으면 건너뛴다).
--
--  ■ 로그인 계정 (비밀번호 3개 모두 12345678)
--    과천제철  jeonkang1234+t333@tukorea.ac.kr   BUSINESS / MANUFACTURER
--    안양협력  jeonkang1234+t334@tukorea.ac.kr   BUSINESS / RAW_SUPPLIER
--    개인회원  jeonkang1234+t335@tukorea.ac.kr   PERSONAL
--
--  ■ 값의 출처
--    수기 입력 48개 : 2026-08-24 강이 EC2에서 입력했던 값 그대로
--    문서 파싱 19개 : docker/mock-documents/steel 의 MILL_SHEET_PASS_1 /
--                     CBAM_REPORT_승인_수입량초과 실측값
--
--  ■ 주의 - 목데이터 문서와 화면 값이 다르다
--    steel 목데이터 PDF의 발행사는 스트럭타스틸㈜(506-81-11223, 포항)이고
--    규격도 300x150x6500, 수입자도 DPP Demo GmbH다. 이 시드는 화면에 보이는
--    값을 전부 과천제철 기준으로 맞췄으므로, 시연 중 첨부 PDF를 열면 앞뒤가
--    맞지 않는다. 문서 열람 장면은 시연에서 제외할 것.
--    근본 해결은 mock_data.py의 ISSUERS['STEEL']을 과천제철로 바꿔 문서를
--    재생성하는 것(biz_reg_certs.py 상단 주석 참고).
-- =====================================================================
\set ON_ERROR_STOP on
BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- 1) 조직 2곳
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO organization (org_name, org_type, domain, country_code, biz_reg_no,
                          website_url, contact_name, contact_phone, contact_email,
                          tier_level, profile_status, approval_status, approved_at)
SELECT '과천제철 주식회사', 'MANUFACTURER', 'STEEL', 'KR', '138-86-47212',
       'https://gwacheon-steel.example.kr', '정하람', '031-555-0132',
       'jeonkang1234+t333@tukorea.ac.kr', 3, 'APPROVED', 'ACTIVE', now() - interval '30 days'
WHERE NOT EXISTS (SELECT 1 FROM organization WHERE biz_reg_no = '138-86-47212');

INSERT INTO organization (org_name, org_type, domain, country_code, biz_reg_no,
                          website_url, contact_name, contact_phone, contact_email,
                          tier_level, profile_status, approval_status, approved_at)
SELECT '안양협력 주식회사', 'RAW_SUPPLIER', 'STEEL', 'KR', '138-81-30526',
       'https://anyang-partner.example.kr', '배시우', '031-555-0282',
       'jeonkang1234+t334@tukorea.ac.kr', 2, 'APPROVED', 'ACTIVE', now() - interval '25 days'
WHERE NOT EXISTS (SELECT 1 FROM organization WHERE biz_reg_no = '138-81-30526');

-- ─────────────────────────────────────────────────────────────────────
-- 2) 로그인 계정 3개 (비밀번호 전부 12345678)
--    해시는 bcrypt $2b$10 - 기존 seed-test-*.sql과 같은 방식
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO user_account (org_id, account_type, email, email_verified, password_hash,
                          phone, phone_verified, credential_type,
                          display_name, onboarding_step, status)
SELECT (SELECT org_id FROM organization WHERE biz_reg_no = '138-86-47212'),
       'BUSINESS', 'jeonkang1234+t333@tukorea.ac.kr', TRUE,
       '$2b$10$lwY8FBf2UwTJlYQ0UsmV4OYKTTi6/tijwYh15uge08/yez8KSviAy',
       '01055500132', TRUE, 'PASSWORD', '과천제철 주식회사', 'COMPLETED', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM user_account
                   WHERE email = 'jeonkang1234+t333@tukorea.ac.kr' AND deleted_at IS NULL);

INSERT INTO user_account (org_id, account_type, email, email_verified, password_hash,
                          phone, phone_verified, credential_type,
                          display_name, onboarding_step, status)
SELECT (SELECT org_id FROM organization WHERE biz_reg_no = '138-81-30526'),
       'BUSINESS', 'jeonkang1234+t334@tukorea.ac.kr', TRUE,
       '$2b$10$lwY8FBf2UwTJlYQ0UsmV4OYKTTi6/tijwYh15uge08/yez8KSviAy',
       '01055500282', TRUE, 'PASSWORD', '안양협력 주식회사', 'COMPLETED', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM user_account
                   WHERE email = 'jeonkang1234+t334@tukorea.ac.kr' AND deleted_at IS NULL);

-- 개인회원. account_type 체크제약이 ('PERSONAL','BUSINESS','ADMIN')이라
-- CONSUMER가 아니라 PERSONAL이다. 조직에 묶지 않는다.
INSERT INTO user_account (account_type, email, email_verified, password_hash,
                          phone, phone_verified, credential_type,
                          display_name, onboarding_step, status)
SELECT 'PERSONAL', 'jeonkang1234+t335@tukorea.ac.kr', TRUE,
       '$2b$10$lwY8FBf2UwTJlYQ0UsmV4OYKTTi6/tijwYh15uge08/yez8KSviAy',
       '01055500335', TRUE, 'PASSWORD', '개인회원(시연)', 'COMPLETED', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM user_account
                   WHERE email = 'jeonkang1234+t335@tukorea.ac.kr' AND deleted_at IS NULL);

-- ─────────────────────────────────────────────────────────────────────
-- 3) 제품 모델
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO product_model (org_id, internal_sku, gtin, model_name, category_code,
                           hs_code, origin_country, domain, granularity, status)
SELECT (SELECT org_id FROM organization WHERE biz_reg_no = '138-86-47212'),
       'GCS-S355JR-H400-2026', '08801234500019', '과천제철 S355JR H형강 400×200',
       '72163300', '72163300', 'KR', 'STEEL', 'BATCH', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM product_model WHERE internal_sku = 'GCS-S355JR-H400-2026');

-- ─────────────────────────────────────────────────────────────────────
-- 4) DPP  (발급 완료 = status ACTIVE, issued_at 채움)
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO dpp (model_id, owner_org_id, serial_number, display_name, domain,
                 lifecycle_stage, status, issued_at)
SELECT pm.model_id, pm.org_id, 'GCS-2026-0201-H400', '과천제철_테스트_형강 H',
       'STEEL', 4, 'ACTIVE', now() - interval '3 days'
  FROM product_model pm
 WHERE pm.internal_sku = 'GCS-S355JR-H400-2026'
   AND NOT EXISTS (SELECT 1 FROM dpp d WHERE d.serial_number = 'GCS-2026-0201-H400');

-- ─────────────────────────────────────────────────────────────────────
-- 5) 협력사 참여 (안양협력 = 원자재 공급사, 수락 완료 상태)
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO dpp_participant (dpp_id, org_id, role_code, submit_status,
                             invited_at, accepted_at, completed_at)
SELECT d.dpp_id,
       (SELECT org_id FROM organization WHERE biz_reg_no = '138-81-30526'),
       'RAW_SUPPLIER', 'COMPLETED',
       now() - interval '10 days', now() - interval '9 days', now() - interval '5 days'
  FROM dpp d
 WHERE d.serial_number = 'GCS-2026-0201-H400'
   AND NOT EXISTS (
        SELECT 1 FROM dpp_participant p
         WHERE p.dpp_id = d.dpp_id
           AND p.org_id = (SELECT org_id FROM organization WHERE biz_reg_no = '138-81-30526')
           AND p.role_code = 'RAW_SUPPLIER');

-- ─────────────────────────────────────────────────────────────────────
-- 6) 항목 값 67개
--
--    값은 전부 TEXT로 적고, requirement_field.data_type을 보고 알맞은
--    컬럼(value_num / value_bool / value_json / value_date / value_text)에
--    나눠 넣는다. 이렇게 하면 필드마다 타입을 외워서 적을 필요가 없고,
--    스키마가 바뀌어도 이 시드는 그대로 동작한다.
--
--    src : 'M' = 과천제철이 화면에서 수기 입력한 값
--          'P' = 목데이터 문서에서 파싱된 값
--          'S' = 안양협력(협력사)이 제출한 값
-- ─────────────────────────────────────────────────────────────────────
WITH d AS (SELECT dpp_id FROM dpp WHERE serial_number = 'GCS-2026-0201-H400'),
org_m AS (SELECT org_id FROM organization WHERE biz_reg_no = '138-86-47212'),
org_s AS (SELECT org_id FROM organization WHERE biz_reg_no = '138-81-30526'),
usr_m AS (SELECT user_id FROM user_account WHERE email = 'jeonkang1234+t333@tukorea.ac.kr'),
usr_s AS (SELECT user_id FROM user_account WHERE email = 'jeonkang1234+t334@tukorea.ac.kr'),
v(code, val, src) AS (VALUES
  -- ── 식별자 ────────────────────────────────────────────────────────
  ('MODEL_NAME',                         '과천제철 S355JR H형강 400×200', 'M'),
  ('INTERNAL_SKU',                       'GCS-S355JR-H400-2026', 'M'),
  ('HS_CODE',                            '72163300', 'M'),
  ('CN_CODE_8_DIGIT',                    '72163300', 'M'),
  ('OPERATOR_MANUFACTURER',              '과천제철 주식회사', 'M'),
  ('GTIN',                               '08801234500019', 'M'),
  ('PRODUCT_FORM',                       '형강', 'M'),
  ('UOI_MANUFACTURER',                   'KR1388647212', 'M'),
  -- ── 경제운영자 ────────────────────────────────────────────────────
  ('UFI_PLANT',                          '과천제철 평택제철소', 'M'),
  ('PRODUCTION_FACILITY_ADDRESS',        '경기도 평택시 포승읍 포승공단로 128', 'M'),
  ('PRODUCTION_FACILITY_COUNTRY',        'KR', 'M'),
  ('MANUFACTURER_COUNTRY',               'KR', 'M'),
  ('MANUFACTURER_BUSINESS_REG_NUMBER',   '138-86-47212', 'M'),
  ('FACILITY_GPS_LATITUDE',              '36.9975', 'M'),
  ('FACILITY_GPS_LONGITUDE',             '126.8452', 'M'),
  ('FURNACE_ID',                         'PT-BF-02', 'M'),
  ('CBAM_OPERATOR_NAME',                 '과천제철 주식회사', 'M'),
  ('CBAM_INSTALLATION_ID',               'KR-2026-INS-04821', 'M'),
  ('OPERATOR_IMPORTER',                  '{"name":"Nordwerk GmbH","eori":"DE7412880033100","address":"Hafenstraße 22, 47119 Duisburg, DE"}', 'M'),
  ('OPERATOR_EU_REP',                    '{"name":"EuroCert Compliance B.V.","address":"Keizersgracht 62, 1015 CS Amsterdam, NL","email":"eu-rep@eurocert.example.eu"}', 'M'),
  -- ── 공정 ──────────────────────────────────────────────────────────
  ('MAIN_PRODUCTION_ROUTE',              '고로-전로(BF-BOF)', 'M'),
  ('IRONMAKING_PROCESS',                 '고로', 'M'),
  ('STEELMAKING_PROCESS',                '전로(BOF)', 'M'),
  -- ── 규격 ──────────────────────────────────────────────────────────
  ('CAST_NO',                            'C260201-3', 'M'),
  ('DIMENSION',                          '{"thickness":13,"width":200,"length":12000}', 'M'),
  -- ── 자원 ──────────────────────────────────────────────────────────
  ('TOTAL_SCRAP_INPUT_RATIO_PCT',        '21.3', 'M'),
  ('PRE_CONSUMER_SCRAP_RATIO_PCT',       '18.5', 'M'),
  -- ── 순환성 (스크랩 2건은 협력사 제출분) ───────────────────────────
  ('RECYCLED_SCRAP_RATE',                '28', 'S'),
  ('SCRAP_SOURCE',                       '안양협력㈜ 매입 국내 철스크랩(H2 등급) 및 과천제철 평택제철소 공정 반환 스크랩', 'S'),
  ('DISMANTLING_INFO',                   'https://dpp.gwacheon-steel.example.kr/eol/S355JR', 'M'),
  ('RECYCLABILITY_NOTE',                 '해체 후 전량 고철로 분리배출·재용해 가능 (철스크랩 H2 등급)', 'M'),
  -- ── 탄소 / CBAM ───────────────────────────────────────────────────
  ('PCF_METHOD',                         'EN 19694-2:2016 / ISO 14067:2018 (cradle-to-gate)', 'M'),
  ('PCF_SCOPE_BREAKDOWN',                '{"scope1":1.108,"scope2":0.312,"scope3":0}', 'M'),
  ('CBAM_APPLICABLE',                    'true', 'M'),
  ('CARBON_PRICE_PAID_IN_ORIGIN_COUNTRY','9150', 'M'),
  ('CARBON_PRICE_CURRENCY',              'KRW', 'M'),
  ('CARBON_PRICE_REBATE_OR_FREE_ALLOCATION_PCT', '92.0', 'M'),
  -- ── 유해물질 ──────────────────────────────────────────────────────
  ('SOC_PRESENT',                        'false', 'M'),
  ('SVHC_OVER_THRESHOLD',                'false', 'M'),
  ('SVHC_PRESENCE_IN_COATING',           'false', 'M'),
  ('SVHC_SUBSTANCE_NAME',                '해당 없음', 'M'),
  ('SVHC_CAS_NUMBER',                    '해당 없음', 'M'),
  ('SVHC_CONCENTRATION_PCT',             '0', 'M'),
  ('ROHS_COMPLIANT_STATUS',              'true', 'M'),
  ('HEXAVALENT_CHROMIUM_CR6_PRESENCE',   'false', 'M'),
  -- ── 교역 ──────────────────────────────────────────────────────────
  ('ORIGIN_COUNTRY',                     'KR', 'M'),
  ('IMPORTER_COMPANY_NAME',              'Nordwerk GmbH', 'M'),
  ('IMPORTER_EORI_NUMBER',               'DE7412880033100', 'M'),
  -- ── 문서 파싱분: 제강 성적서 (MILL_SHEET_PASS_1) ──────────────────
  ('STEEL_GRADE',                        'S355JR', 'P'),
  ('STEEL_STANDARD',                     'EN 10025-2:2019', 'P'),
  ('HEAT_NO',                            'H260201', 'P'),
  ('LOT_NO',                             'LOT-2026-0201-A', 'P'),
  ('NET_WEIGHT_T',                       '62.4', 'P'),
  ('PRODUCTION_DATE',                    '2026-02-02', 'P'),
  ('MILL_TEST_CERTIFICATE_TYPE',         '3.1', 'P'),
  ('CHEMICAL_ANALYSIS_TYPE',             '레이들(Ladle)', 'P'),
  ('CHEM_MN_ACTUAL_PCT',                 '1.40', 'P'),
  ('YIELD_STRENGTH_ACTUAL_MPA',          '382', 'P'),
  ('YIELD_STRENGTH_MIN_MPA',             '355', 'P'),
  ('TENSILE_STRENGTH_ACTUAL_MPA',        '524', 'P'),
  ('TENSILE_STRENGTH_MIN_MPA',           '470', 'P'),
  ('TENSILE_STRENGTH_MAX_MPA',           '630', 'P'),
  ('ELONGATION_ACTUAL_PCT',              '26', 'P'),
  ('ELONGATION_MIN_PCT',                 '22', 'P'),
  -- ── 문서 파싱분: CBAM 보고서 (승인_수입량초과) ────────────────────
  ('CBAM_DIRECT_EMISSIONS_TCO2E_PER_T',  '1.108', 'P'),
  ('CBAM_INDIRECT_EMISSIONS_TCO2E_PER_T','0.312', 'P'),
  ('PCF_VALUE',                          '1.420', 'P')
)
INSERT INTO dpp_field_value (dpp_id, field_code, value_text, value_num, value_bool,
                             value_date, value_json,
                             submitted_by_org, submitted_by_user, submitted_at)
SELECT d.dpp_id, rf.field_code,
       CASE WHEN rf.data_type IN ('STRING','TEXT','CODE') THEN v.val END,
       CASE WHEN rf.data_type = 'NUMBER'  THEN v.val::numeric END,
       CASE WHEN rf.data_type = 'BOOLEAN' THEN v.val::boolean END,
       CASE WHEN rf.data_type = 'DATE'    THEN v.val::date END,
       CASE WHEN rf.data_type = 'JSON'    THEN v.val::jsonb END,
       CASE WHEN v.src = 'S' THEN (SELECT org_id  FROM org_s) ELSE (SELECT org_id  FROM org_m) END,
       CASE WHEN v.src = 'S' THEN (SELECT user_id FROM usr_s) ELSE (SELECT user_id FROM usr_m) END,
       now() - interval '4 days'
  FROM v
  JOIN requirement_field rf
    ON rf.field_code = v.code
 CROSS JOIN d
 WHERE NOT EXISTS (SELECT 1 FROM dpp_field_value f
                    WHERE f.dpp_id = d.dpp_id AND f.field_code = v.code);

-- ─────────────────────────────────────────────────────────────────────
-- 7) 완성도 재계산
--    분모 = 이 도메인에서 필수이고 자동생성이 아닌 항목 수
-- ─────────────────────────────────────────────────────────────────────
UPDATE dpp SET
  filled_count   = sub.filled,
  required_count = sub.req,
  completeness   = CASE WHEN sub.req = 0 THEN 0
                        ELSE ROUND(sub.filled::numeric * 100 / sub.req, 2) END
FROM (
  SELECT d.dpp_id,
         (SELECT count(*) FROM dpp_field_value f WHERE f.dpp_id = d.dpp_id) AS filled,
         (SELECT count(*) FROM requirement_field rf
           WHERE rf.is_required AND NOT rf.is_auto AND rf.is_active
             AND rf.domain IN ('STEEL','COMMON')) AS req
    FROM dpp d WHERE d.serial_number = 'GCS-2026-0201-H400'
) sub
WHERE dpp.dpp_id = sub.dpp_id;

-- ─────────────────────────────────────────────────────────────────────
-- 8) 도메인 확장 - 과천제철의 주력 도메인(STEEL)만 승인 상태로 넣어둔다.
--    시연에서 신청->승인을 직접 보여줄 거라 PENDING 건은 만들지 않는다.
--    (미리 대기 건을 깔아두고 싶으면 아래 블록의 주석을 풀 것)
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO org_domain_grant (org_id, domain, status, request_reason, requested_at, decided_at)
SELECT o.org_id, 'STEEL', 'APPROVED', '가입 시 주력 도메인', now() - interval '30 days', now() - interval '30 days'
  FROM organization o
 WHERE o.biz_reg_no = '138-86-47212'
   AND NOT EXISTS (SELECT 1 FROM org_domain_grant g
                    WHERE g.org_id = o.org_id AND g.domain = 'STEEL');

-- INSERT INTO org_domain_grant (org_id, domain, status, request_reason, requested_at)
-- SELECT o.org_id, 'BATTERY', 'PENDING', '이차전지용 강재 공급 개시에 따른 도메인 확장 신청', now() - interval '1 day'
--   FROM organization o WHERE o.biz_reg_no = '138-86-47212'
--    AND NOT EXISTS (SELECT 1 FROM org_domain_grant g
--                     WHERE g.org_id = o.org_id AND g.domain = 'BATTERY');

COMMIT;

-- =====================================================================
--  확인용 조회
-- =====================================================================
\echo ''
\echo '--- 만들어진 계정 ---'
SELECT email, account_type, display_name,
       (SELECT org_name FROM organization o WHERE o.org_id = u.org_id) AS 조직
  FROM user_account u
 WHERE email LIKE 'jeonkang1234+t33%@tukorea.ac.kr' AND deleted_at IS NULL
 ORDER BY email;

\echo ''
\echo '--- 만들어진 DPP ---'
SELECT d.dpp_id, d.display_name, d.status, d.public_uuid,
       d.filled_count || '/' || d.required_count AS 채움, d.completeness AS 완성도
  FROM dpp d WHERE d.serial_number = 'GCS-2026-0201-H400';

\echo ''
\echo '--- 항목 값 출처별 건수 (67이 정상) ---'
SELECT count(*) AS 총건수 FROM dpp_field_value f
  JOIN dpp d ON d.dpp_id = f.dpp_id
 WHERE d.serial_number = 'GCS-2026-0201-H400';

\echo ''
\echo '--- 매칭 실패한 field_code (비어 있어야 정상) ---'
SELECT c.code AS 못찾은_코드
  FROM (VALUES
    ('MODEL_NAME'),('INTERNAL_SKU'),('HS_CODE'),('CN_CODE_8_DIGIT'),('OPERATOR_MANUFACTURER'),
    ('GTIN'),('PRODUCT_FORM'),('UOI_MANUFACTURER'),('UFI_PLANT'),('PRODUCTION_FACILITY_ADDRESS'),
    ('PRODUCTION_FACILITY_COUNTRY'),('MANUFACTURER_COUNTRY'),('MANUFACTURER_BUSINESS_REG_NUMBER'),
    ('FACILITY_GPS_LATITUDE'),('FACILITY_GPS_LONGITUDE'),('FURNACE_ID'),('CBAM_OPERATOR_NAME'),
    ('CBAM_INSTALLATION_ID'),('OPERATOR_IMPORTER'),('OPERATOR_EU_REP'),('MAIN_PRODUCTION_ROUTE'),
    ('IRONMAKING_PROCESS'),('STEELMAKING_PROCESS'),('CAST_NO'),('DIMENSION'),
    ('TOTAL_SCRAP_INPUT_RATIO_PCT'),('PRE_CONSUMER_SCRAP_RATIO_PCT'),('RECYCLED_SCRAP_RATE'),
    ('SCRAP_SOURCE'),('DISMANTLING_INFO'),('RECYCLABILITY_NOTE'),('PCF_METHOD'),
    ('PCF_SCOPE_BREAKDOWN'),('CBAM_APPLICABLE'),('CARBON_PRICE_PAID_IN_ORIGIN_COUNTRY'),
    ('CARBON_PRICE_CURRENCY'),('CARBON_PRICE_REBATE_OR_FREE_ALLOCATION_PCT'),('SOC_PRESENT'),
    ('SVHC_OVER_THRESHOLD'),('SVHC_PRESENCE_IN_COATING'),('SVHC_SUBSTANCE_NAME'),('SVHC_CAS_NUMBER'),
    ('SVHC_CONCENTRATION_PCT'),('ROHS_COMPLIANT_STATUS'),('HEXAVALENT_CHROMIUM_CR6_PRESENCE'),
    ('ORIGIN_COUNTRY'),('IMPORTER_COMPANY_NAME'),('IMPORTER_EORI_NUMBER'),('STEEL_GRADE'),
    ('STEEL_STANDARD'),('HEAT_NO'),('LOT_NO'),('NET_WEIGHT_T'),('PRODUCTION_DATE'),
    ('MILL_TEST_CERTIFICATE_TYPE'),('CHEMICAL_ANALYSIS_TYPE'),('CHEM_MN_ACTUAL_PCT'),
    ('YIELD_STRENGTH_ACTUAL_MPA'),('YIELD_STRENGTH_MIN_MPA'),('TENSILE_STRENGTH_ACTUAL_MPA'),
    ('TENSILE_STRENGTH_MIN_MPA'),('TENSILE_STRENGTH_MAX_MPA'),('ELONGATION_ACTUAL_PCT'),
    ('ELONGATION_MIN_PCT'),('CBAM_DIRECT_EMISSIONS_TCO2E_PER_T'),
    ('CBAM_INDIRECT_EMISSIONS_TCO2E_PER_T'),('PCF_VALUE')
  ) AS c(code)
 WHERE NOT EXISTS (SELECT 1 FROM requirement_field rf WHERE rf.field_code = c.code);
