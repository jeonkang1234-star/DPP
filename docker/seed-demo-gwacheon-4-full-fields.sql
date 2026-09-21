-- =====================================================================
--  시연용 과천제철 세트 - 4차: 열람 화면 항목 전체 채우기
--  전제: 1·2·3차 실행 완료(완성도 100%)
--
--  *** 실행 (docker/ 디렉터리에서) ***
--    docker cp seed-demo-gwacheon-4-full-fields.sql dpp-postgres:/tmp/s4.sql
--    docker exec -i dpp-postgres psql -U dpp -d dpp -f /tmp/s4.sql
--
--  ■ 목적
--    공개여권/EU 열람은 "값이 채워진 필드만" 보여준다(PublicPassportService).
--    지금까지 70개만 채워서 화면이 허전했다 - EC2에서 문서 업로드+파싱으로
--    채워졌던 수준(철강 기준 약 99개)으로 나머지를 채운다.
--
--  ■ 영업비밀(TRADE_SECRET) 처리 - EC2와 동일한 방식
--    화학성분 실측치 등 disclosure_scope='TRADE_SECRET' 필드는 실측값을
--    저장하지 않는 게 이 시스템의 원칙이다(V25 주석 참고). 대신
--      - dpp_field_value에는 판정 토큰 '충족'만 넣고
--      - zkp_proof에 VERIFIED 증명을 넣으면
--    EU 열람에 "한계값 충족 (영지식증명으로 검증됨)"으로 표시된다.
--    1·2차에서 실수로 넣은 Mn/Cr/Ni 실측값도 여기서 '충족'으로 치환한다.
-- =====================================================================
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE t_dpp ON COMMIT DROP AS
SELECT d.dpp_id, d.public_uuid,
       (SELECT org_id  FROM organization WHERE biz_reg_no = '138-86-47212') AS org_m,
       (SELECT org_id  FROM organization WHERE biz_reg_no = '138-81-30526') AS org_s,
       (SELECT user_id FROM user_account WHERE email = 'jeonkang1234+t333@tukorea.ac.kr') AS usr_m
  FROM dpp d WHERE d.serial_number = 'GCS-2026-0201-H400';

-- ─────────────────────────────────────────────────────────────────────
-- 1) ZKP 증명 3건 (VERIFIED) - 밀시트 규격판정 / 재생원료율 / CBAM 한계
--    hasVerifiedProof가 참이어야 영업비밀 항목이 "충족(ZKP 검증됨)"으로 뜬다.
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO zkp_proof (dpp_id, target_type, document_id, claim_type, circuit_name,
                       proof_data, public_signals, status, verified_at)
SELECT t.dpp_id, 'DOCUMENT',
       (SELECT x.document_id FROM document x
         WHERE x.owner_type='DPP' AND x.owner_id=t.dpp_id
           AND x.doc_type_code = z.doc AND x.deleted_at IS NULL LIMIT 1),
       z.claim, z.circuit, 'demo-proof-' || z.circuit,
       jsonb_build_object('passed', true), 'VERIFIED', now() - interval '4 days'
  FROM t_dpp t
 CROSS JOIN (VALUES
    ('MILL_SHEET',  'CERT_VALID',    'millsheet-spec-check'),
    ('SCRAP_PROOF', 'RECYCLED_RATE', 'recycled-rate-threshold'),
    ('CBAM_REPORT', 'CARBON_LIMIT',  'cbam-emission-limit')
 ) AS z(doc, claim, circuit)
 WHERE NOT EXISTS (SELECT 1 FROM zkp_proof p
                    WHERE p.dpp_id = t.dpp_id AND p.claim_type = z.claim
                      AND p.status = 'VERIFIED');

-- ─────────────────────────────────────────────────────────────────────
-- 2) 영업비밀 필드 정리 - 실측값을 '충족' 토큰으로 치환 (V25와 같은 원칙)
--    1차의 CHEM_MN(1.40), 2차의 CHEM_CR/NI(0.05/0.03)가 여기서 바로잡힌다.
-- ─────────────────────────────────────────────────────────────────────
UPDATE dpp_field_value v
   SET value_text = '충족', updated_at = now()
  FROM requirement_field rf, t_dpp t
 WHERE v.dpp_id = t.dpp_id
   AND rf.field_code = v.field_code
   AND rf.disclosure_scope = 'TRADE_SECRET'
   AND btrim(COALESCE(v.value_text,'')) NOT IN ('충족','미충족');

-- 아직 행 자체가 없는 영업비밀 필드도 전부 '충족'으로 채운다(파싱+ZKP 판정 결과 흉내).
INSERT INTO dpp_field_value (dpp_id, field_code, value_text,
                             submitted_by_org, submitted_by_user, submitted_at)
SELECT t.dpp_id, rf.field_code, '충족', t.org_m, t.usr_m, now() - interval '4 days'
  FROM requirement_field rf CROSS JOIN t_dpp t
 WHERE rf.domain IN ('COMMON','STEEL')
   AND rf.field_kind = 'DATA' AND rf.storage_target = 'FIELD_VALUE'
   AND rf.is_active AND NOT rf.is_auto
   AND rf.disclosure_scope = 'TRADE_SECRET'
ON CONFLICT (dpp_id, field_code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- 3) 나머지 일반 필드 채우기 (영업비밀 제외, 이미 값 있으면 건너뜀)
--    값은 밀시트 PASS_1 / CBAM 승인_수입량초과 / 과천제철 설정과 정합.
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO dpp_field_value (dpp_id, field_code, value_text,
                             submitted_by_org, submitted_by_user, submitted_at)
SELECT t.dpp_id, v.code, v.val, t.org_m, t.usr_m, now() - interval '4 days'
  FROM t_dpp t
 CROSS JOIN (VALUES
  -- ── 탄소/CBAM 상세 ────────────────────────────────────────────────
  ('CBAM_EMISSIONS_VERIFIED_BY_THIRD_PARTY', 'true'),
  ('CBAM_VERIFICATION_BODY_NAME',   'DNV Business Assurance Korea(시연)'),
  ('CBAM_VERIFICATION_REPORT_URL',  'https://dpp.gwacheon-steel.example.kr/docs/cbam-verification-2026Q1.pdf'),
  ('CBAM_ACTUAL_DATA_USED_RATIO_PCT', '100'),
  ('CBAM_DEFAULT_VALUE_USED_RATIO_PCT', '0'),
  ('ELECTRICITY_SOURCE',            '계통 전력(한국전력)'),
  ('PRECURSOR_1_NAME',              '소결광(Sinter)'),
  ('PRECURSOR_1_QUANTITY_T_PER_T',  '1.58'),
  ('PRECURSOR_1_SPECIFIC_EMISSIONS','0.24'),
  ('PRECURSOR_2_NAME',              '용선(Hot Metal)'),
  ('PRECURSOR_2_QUANTITY_T_PER_T',  '1.05'),
  ('PRECURSOR_2_SPECIFIC_EMISSIONS','1.62'),
  ('PRECURSOR_3_NAME',              '석회석(Limestone)'),
  ('PRECURSOR_3_QUANTITY_T_PER_T',  '0.12'),
  ('PRECURSOR_3_SPECIFIC_EMISSIONS','0.03'),
  -- ── 시험/규격 상세 ────────────────────────────────────────────────
  ('CHEMICAL_TEST_STANDARD',        'KS D 1652 (발광분광분석)'),
  ('TENSILE_TEST_STANDARD',         'EN ISO 6892-1 / KS B 0802'),
  ('TEST_DIRECTION',                '길이(압연) 방향'),
  ('GAUGE_LENGTH_MM',               '200'),
  -- ── 식별/시스템 ───────────────────────────────────────────────────
  ('UPI',                           'GCS-2026-0201-H400'),
  ('DATA_CARRIER_TYPE',             'QR 코드'),
  ('PASSPORT_PRIMARY_LANGUAGE',     'ko'),
  ('REGISTRY_UID',                  'EU-DPP-REG-2026-KR-04821'),
  ('FINAL_APPROVAL_OFFICER',        '정하람'),
  -- ── 공정/문서 URL ────────────────────────────────────────────────
  ('SURFACE_TREATMENT_TYPE',        '무도장(흑피, Mill Scale)'),
  ('MILL_TEST_CERTIFICATE_DOCUMENT_URL', 'https://dpp.gwacheon-steel.example.kr/docs/mtc-GCS-2026-0201.pdf'),
  ('CERTIFICATE_OF_ORIGIN_URL',     'https://dpp.gwacheon-steel.example.kr/docs/coo-GCS-2026-0201.pdf')
 ) AS v(code, val)
  JOIN requirement_field rf
    ON rf.field_code = v.code
   AND rf.is_active AND NOT rf.is_auto
   AND rf.storage_target = 'FIELD_VALUE'
   AND COALESCE(rf.disclosure_scope,'PUBLIC') <> 'TRADE_SECRET'
ON CONFLICT (dpp_id, field_code) DO NOTHING;

-- DPP 접근 URI - 이 DPP의 실제 공개 주소로 만든다
INSERT INTO dpp_field_value (dpp_id, field_code, value_text,
                             submitted_by_org, submitted_by_user, submitted_at)
SELECT t.dpp_id, 'DPP_URI', 'http://localhost/p/' || t.public_uuid,
       t.org_m, t.usr_m, now() - interval '4 days'
  FROM t_dpp t
  JOIN requirement_field rf ON rf.field_code = 'DPP_URI' AND NOT rf.is_auto
ON CONFLICT (dpp_id, field_code) DO NOTHING;

COMMIT;

-- 캐시·완성도 갱신
SELECT fn_recalc_completeness(dpp_id) AS 완성도, fn_refresh_dpp_attributes(dpp_id)
  FROM dpp WHERE serial_number = 'GCS-2026-0201-H400';

-- =====================================================================
--  확인
-- =====================================================================
\echo ''
\echo '--- 값이 채워진 필드 수 (열람에 보이는 후보) ---'
SELECT count(*) AS 채워진_필드
  FROM dpp_field_value v
 WHERE v.dpp_id = (SELECT dpp_id FROM dpp WHERE serial_number='GCS-2026-0201-H400');

\echo ''
\echo '--- VERIFIED ZKP 증명 ---'
SELECT claim_type, circuit_name, status FROM zkp_proof
 WHERE dpp_id = (SELECT dpp_id FROM dpp WHERE serial_number='GCS-2026-0201-H400');

\echo ''
\echo '--- 아직 빈 일반 필드 (참고용 - 여기 나온 건 화면에 안 보임) ---'
SELECT rf.field_code, rf.label_ko, rf.section
  FROM requirement_field rf
 WHERE rf.domain IN ('COMMON','STEEL')
   AND rf.field_kind='DATA' AND rf.storage_target='FIELD_VALUE'
   AND rf.is_active AND NOT rf.is_auto
   AND NOT EXISTS (SELECT 1 FROM dpp_field_value v
                    WHERE v.dpp_id=(SELECT dpp_id FROM dpp WHERE serial_number='GCS-2026-0201-H400')
                      AND v.field_code=rf.field_code)
 ORDER BY rf.section, rf.sort_order;
