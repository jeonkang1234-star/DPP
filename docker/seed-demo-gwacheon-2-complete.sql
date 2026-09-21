-- =====================================================================
--  시연용 과천제철 세트 - 2차: 완성도 100% 마무리
--  전제: seed-demo-gwacheon.sql을 먼저 실행했을 것
--
--  *** 실행 (docker/ 디렉터리에서) ***
--    docker cp seed-demo-gwacheon-2-complete.sql dpp-postgres:/tmp/s2.sql
--    docker exec -i dpp-postgres psql -U dpp -d dpp -f /tmp/s2.sql
--
--  *** PowerShell 파이프 금지 (한글 깨짐) ***
--
--  v_dpp_missing_field가 알려준 미충족 12건을 채운다.
--    DATA 4건  : CHEM_COMPOSITION(자재구성), CHEM_CR_ACTUAL_PCT,
--                CHEM_NI_ACTUAL_PCT, DISMANTLING_INFO
--    문서 8건  : MILL_SHEET, TECH_FILE, PCF_REPORT, LCA_EPD,
--                SCRAP_PROOF, SOC_SDS, EU_DOC, TEST_REPORT
--    + 필수는 아니지만 실제로 올렸던 COO/LABEL/MANUAL/CBAM_REPORT도 등록
--
--  ■ 문서 파일은 미리 복사해 뒀다
--    docker/document-uploads/demo-gwacheon-<타입>.pdf  (12개)
--    컨테이너 안에서는 /data/document-uploads/... 로 보인다(compose 볼륨).
--
--  ■ 주의 - Cr / Ni 값은 목데이터 문서에 없다
--    MILL_SHEET_PASS_1의 화학성분표에는 C·Si·Mn·P·S·N·Cu·CEV만 있고
--    Cr·Ni가 없다. 그런데 이 둘이 필수 항목이라 비워두면 100%가 안 된다.
--    아래 값은 S355JR 일반 잔류량 수준으로 넣은 것이고 문서 근거가 없다.
--    시연 중 이 숫자를 근거로 설명하지 말 것. 문서와 맞추려면 generator의
--    화학성분표에 Cr·Ni를 추가해 재생성하는 게 맞다.
-- =====================================================================
\set ON_ERROR_STOP on
BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- 0) 대상 DPP
-- ─────────────────────────────────────────────────────────────────────
CREATE TEMP TABLE t_dpp ON COMMIT DROP AS
SELECT d.dpp_id,
       (SELECT org_id FROM organization WHERE biz_reg_no = '138-86-47212') AS org_m,
       (SELECT org_id FROM organization WHERE biz_reg_no = '138-81-30526') AS org_s,
       (SELECT user_id FROM user_account WHERE email = 'jeonkang1234+t333@tukorea.ac.kr') AS usr_m
  FROM dpp d WHERE d.serial_number = 'GCS-2026-0201-H400';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM t_dpp) THEN
    RAISE EXCEPTION '대상 DPP가 없다. seed-demo-gwacheon.sql을 먼저 실행할 것';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 1) 빠진 DATA 항목 3건 (UPSERT - 1차 시드에서 누락됐든 아니든 확실히 채운다)
-- ─────────────────────────────────────────────────────────────────────
-- 값은 전부 value_text에 넣는다 - 백엔드가 읽고 쓰는 유일한 컬럼이다
-- (FieldFormService.setValueText / Collectors.toMap(getValueText) - value_text가
--  NULL인 행이 하나라도 있으면 조회 API가 NPE 500. 3차 패치와 같은 원칙).
INSERT INTO dpp_field_value (dpp_id, field_code, value_text,
                             submitted_by_org, submitted_by_user, submitted_at)
SELECT t.dpp_id, v.code, v.val,
       t.org_m, t.usr_m, now() - interval '4 days'
  FROM t_dpp t
 CROSS JOIN (VALUES
    ('DISMANTLING_INFO',   'https://dpp.gwacheon-steel.example.kr/eol/S355JR'),
    ('CHEM_CR_ACTUAL_PCT', '0.05'),   -- 문서 근거 없음 (상단 주의 참고)
    ('CHEM_NI_ACTUAL_PCT', '0.03')    -- 문서 근거 없음 (상단 주의 참고)
 ) AS v(code, val)
  JOIN requirement_field rf ON rf.field_code = v.code
ON CONFLICT (dpp_id, field_code) DO UPDATE
   SET value_text = EXCLUDED.value_text,
       value_num  = NULL,
       updated_at = now();

-- ─────────────────────────────────────────────────────────────────────
-- 2) 화학 조성 (CHEM_COMPOSITION)
--    이 항목은 storage_target='MATERIAL_COMPOSITION'이라 dpp_field_value가
--    아니라 material_composition에 entry_kind='CHEM_ELEMENT' 행이 있어야
--    충족으로 친다(v_dpp_requirement_status 참고).
--    값은 MILL_SHEET_PASS_1의 레이들 분석표 그대로. Fe는 잔량.
-- ─────────────────────────────────────────────────────────────────────
DELETE FROM material_composition
 WHERE dpp_id IN (SELECT dpp_id FROM t_dpp) AND entry_kind = 'CHEM_ELEMENT';

INSERT INTO material_composition (dpp_id, entry_kind, material_name, cas_number,
                                  content_rate, content_unit, is_hazardous, svhc_flag)
SELECT t.dpp_id, 'CHEM_ELEMENT', m.name, m.cas, m.rate, 'PERCENT', FALSE, FALSE
  FROM t_dpp t
 CROSS JOIN (VALUES
    ('철 (Fe, 잔량)',   '7439-89-6', 97.6100),
    ('탄소 (C)',        '7440-44-0',  0.1800),
    ('규소 (Si)',       '7440-21-3',  0.3500),
    ('망간 (Mn)',       '7439-96-5',  1.4000),
    ('인 (P)',          '7723-14-0',  0.0180),
    ('황 (S)',          '7704-34-9',  0.0120),
    ('질소 (N)',        '7727-37-9',  0.0080),
    ('구리 (Cu)',       '7440-50-8',  0.2200),
    ('크롬 (Cr)',       '7440-47-3',  0.0500),
    ('니켈 (Ni)',       '7440-02-0',  0.0300)
 ) AS m(name, cas, rate);

-- ─────────────────────────────────────────────────────────────────────
-- 3) 문서 12건 등록 + DPP 연결 + 승인 처리
--
--    필수 충족 조건(v_dpp_requirement_status):
--      document_link 존재 AND document.review_status='APPROVED'
--      AND document.deleted_at IS NULL
--    셋 다 맞춰야 완성도에 반영된다.
--
--    SCRAP_PROOF만 제출 주체를 안양협력으로 둔다 - 이 항목의
--    responsible_role이 RAW_SUPPLIER라 협력사 시나리오와 맞아떨어진다.
-- ─────────────────────────────────────────────────────────────────────
WITH docs(type_code, fname, hash, fsize, issuer_kind) AS (VALUES
  ('MILL_SHEET',  'demo-gwacheon-MILL_SHEET.pdf',  'c8940e2d92433e3e4e4b85b17827a26998234b957a59045a638e4974144c57cf', 20134, 'M'),
  ('TECH_FILE',   'demo-gwacheon-TECH_FILE.pdf',   '3fc30497f96e139ff5b3d1dd80b1e35d99902fcd6713830890c81f8e05cb5b58', 16906, 'M'),
  ('PCF_REPORT',  'demo-gwacheon-PCF_REPORT.pdf',  '52e71e42cd0c1bf2037a3c292c871833d49361c8cd20974aa62508c56bb2d045', 13648, 'M'),
  ('LCA_EPD',     'demo-gwacheon-LCA_EPD.pdf',     'efb94c5c2f3ece5be8136a32e69e5d67f507e30e39cb83718909a33189ef0efa', 15219, 'M'),
  ('SCRAP_PROOF', 'demo-gwacheon-SCRAP_PROOF.pdf', '33f42eb26e4927251b450e1da98bf34241a1a189ff92ac468ce5d5668456f533', 14852, 'S'),
  ('SOC_SDS',     'demo-gwacheon-SOC_SDS.pdf',     '392776541bd35f5940103771ceaf1c5a70413711dd3bbf9684a4e6de6b65f265', 17736, 'M'),
  ('EU_DOC',      'demo-gwacheon-EU_DOC.pdf',      'fbc48b6545c3f52e04bac29768ff93fb010865d4e930151e65af5ee6ed316b1d', 15463, 'M'),
  ('TEST_REPORT', 'demo-gwacheon-TEST_REPORT.pdf', 'aea07829c558062c56adfb30ab9b2b2f50cb103ccac65a19551046c3cb28c304', 14221, 'M'),
  ('COO',         'demo-gwacheon-COO.pdf',         'd27a1a4df480dc3b06818ff15ef401cc1739b83230adfc6b005640d1ebb9287d', 11990, 'M'),
  ('LABEL',       'demo-gwacheon-LABEL.pdf',       '46a4fdd10e0daaf7351a9eef4e204b5fae4f0809a830ad49d315ed2f46a185ee', 13664, 'M'),
  ('MANUAL',      'demo-gwacheon-MANUAL.pdf',      '4c62419090ece689c75f826c5ecfba47c282e243e7e83714ab247bc0d7ea6701', 16553, 'M'),
  ('CBAM_REPORT', 'demo-gwacheon-CBAM_REPORT.pdf', 'baba12863b543d29e50c579e9d090a812a56698b7696f254d38c89a504fe01ed', 15921, 'M')
),
ins AS (
  INSERT INTO document (doc_type_code, owner_type, owner_id, submitted_by_org,
                        file_name, file_uri, content_hash, mime_type, file_size,
                        virus_scan_status, issuer, issued_at, expires_at,
                        review_status, parsed_at, created_by)
  SELECT d.type_code, 'DPP', t.dpp_id,
         CASE WHEN d.issuer_kind = 'S' THEN t.org_s ELSE t.org_m END,
         d.fname, '/data/document-uploads/' || d.fname, d.hash,
         'application/pdf', d.fsize, 'CLEAN',
         CASE WHEN d.issuer_kind = 'S' THEN '안양협력 주식회사' ELSE '과천제철 주식회사' END,
         TIMESTAMPTZ '2026-02-02 09:00:00+09', now() + interval '1 year',
         'APPROVED', now() - interval '4 days', t.usr_m
    FROM docs d CROSS JOIN t_dpp t
   WHERE NOT EXISTS (SELECT 1 FROM document x
                      WHERE x.owner_type = 'DPP' AND x.owner_id = t.dpp_id
                        AND x.doc_type_code = d.type_code AND x.deleted_at IS NULL)
  RETURNING document_id
)
INSERT INTO document_link (document_id, dpp_id, link_type)
SELECT i.document_id, t.dpp_id, 'DIRECT' FROM ins i CROSS JOIN t_dpp t
ON CONFLICT (document_id, dpp_id) DO NOTHING;

-- 이미 있던 문서(재실행 시)도 확실히 승인 + 연결 상태로 맞춘다
UPDATE document SET review_status = 'APPROVED', deleted_at = NULL
 WHERE owner_type = 'DPP' AND owner_id IN (SELECT dpp_id FROM t_dpp)
   AND file_name LIKE 'demo-gwacheon-%';

INSERT INTO document_link (document_id, dpp_id, link_type)
SELECT x.document_id, t.dpp_id, 'DIRECT'
  FROM document x CROSS JOIN t_dpp t
 WHERE x.owner_type = 'DPP' AND x.owner_id = t.dpp_id AND x.deleted_at IS NULL
   AND x.file_name LIKE 'demo-gwacheon-%'
ON CONFLICT (document_id, dpp_id) DO NOTHING;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────
-- 4) 완성도 재계산 + attributes 캐시 재생성
--    completeness는 fn_recalc_completeness가 매 조회마다 다시 계산하지만,
--    attributes는 fn_refresh_dpp_attributes를 불러야만 갱신된다.
--    상세 화면이 비어 보이던 원인이 이것이다.
-- ─────────────────────────────────────────────────────────────────────
SELECT fn_recalc_completeness(dpp_id)   AS 완성도,
       fn_refresh_dpp_attributes(dpp_id)
  FROM dpp WHERE serial_number = 'GCS-2026-0201-H400';

-- =====================================================================
--  확인
-- =====================================================================
\echo ''
\echo '--- 완성도 (100.00 이어야 정상) ---'
SELECT display_name, status, filled_count || '/' || required_count AS 채움,
       completeness AS 완성도,
       (SELECT count(*) FROM jsonb_object_keys(attributes)) AS attributes_키수
  FROM dpp WHERE serial_number = 'GCS-2026-0201-H400';

\echo ''
\echo '--- 아직 미충족인 필수 항목 (비어 있어야 정상) ---'
SELECT field_kind, field_code, label_ko
  FROM v_dpp_missing_field
 WHERE dpp_id = (SELECT dpp_id FROM dpp WHERE serial_number = 'GCS-2026-0201-H400')
 ORDER BY field_kind, sort_order;

\echo ''
\echo '--- 등록된 문서 ---'
SELECT x.doc_type_code, x.file_name, x.review_status,
       (SELECT org_name FROM organization o WHERE o.org_id = x.submitted_by_org) AS 제출주체
  FROM document x
  JOIN document_link l ON l.document_id = x.document_id
 WHERE l.dpp_id = (SELECT dpp_id FROM dpp WHERE serial_number = 'GCS-2026-0201-H400')
   AND x.deleted_at IS NULL
 ORDER BY x.doc_type_code;

\echo ''
\echo '--- 화학 조성 ---'
SELECT material_name, content_rate, content_unit
  FROM material_composition
 WHERE dpp_id = (SELECT dpp_id FROM dpp WHERE serial_number = 'GCS-2026-0201-H400')
   AND entry_kind = 'CHEM_ELEMENT'
 ORDER BY content_rate DESC;
