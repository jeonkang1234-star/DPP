-- ============================================================
--  데모용 공개 DPP 시드 - 개인회원 QR 조회 / EU 레지스트리 검색용
--
--  왜 필요한가: 갓 배포한 EC2 DB에는 발급 완료된 DPP가 거의 없어서, EU 시장감독기관으로
--  로그인해 레지스트리를 열어도 목록이 비어 있고 검색해도 아무것도 안 나온다. 데모에서
--  "감독기관이 시장에 유통 중인 제품을 조회한다"를 보여주려면 이미 유통 중인 것처럼 보이는
--  DPP가 몇 개 있어야 한다.
--
--  실행:
--    docker cp docker/seed-demo-registry.sql dpp-postgres:/tmp/sr.sql
--    docker exec -it dpp-postgres psql -U dpp -d dpp -f /tmp/sr.sql
--
--  여러 번 돌려도 안전하다(사업자등록번호 기준으로 이미 있으면 건너뛴다).
--  지울 때는 맨 아래 주석의 DELETE 블록 참고.
--
--  주의: 여기서 만드는 회사는 전부 가상이다. 실제 기업명·사업자등록번호와 겹치지 않도록
--  9로 시작하는 미사용 대역의 번호를 쓴다.
-- ============================================================
\set ON_ERROR_STOP on
BEGIN;

-- 1) 가상 제조사 3곳 (철강 / 배터리 / 섬유)
INSERT INTO organization (org_name, org_type, domain, country_code, biz_reg_no, website_url,
                          contact_name, contact_phone, contact_email,
                          tier_level, profile_status, approval_status, approved_at)
SELECT v.org_name, 'MANUFACTURER', v.domain, 'KR', v.biz_reg_no, v.website_url,
       v.contact_name, v.contact_phone, v.contact_email,
       3, 'SUBMITTED', 'ACTIVE', now() - (v.age || ' days')::interval
  FROM (VALUES
    ('가온스틸 주식회사',   'STEEL',   '900-81-10001', 'https://gaon-steel.example', '문서영', '032-555-0101', 'contact@gaon-steel.example', 240),
    ('블루셀에너지 주식회사','BATTERY', '900-81-10002', 'https://bluecell.example',   '남기훈', '041-555-0102', 'contact@bluecell.example',   200),
    ('한올텍스타일 주식회사','TEXTILE', '900-81-10003', 'https://hanol-tex.example',  '서지안', '053-555-0103', 'contact@hanol-tex.example',  180)
  ) AS v(org_name, domain, biz_reg_no, website_url, contact_name, contact_phone, contact_email, age)
 WHERE NOT EXISTS (SELECT 1 FROM organization o WHERE o.biz_reg_no = v.biz_reg_no);

-- 2) 제품 모델
INSERT INTO product_model (org_id, internal_sku, gtin, model_name, brand, hs_code,
                           origin_country, domain, granularity, warranty_months, status)
SELECT o.org_id, v.sku, v.gtin, v.model_name, v.brand, v.hs_code, 'KR', v.domain, 'BATCH', v.warranty, 'ACTIVE'
  FROM (VALUES
    ('900-81-10001', 'GS-HRC-2607', '8809000010017', '열연강판 HRC S275JR',        '가온스틸',    '7208.51', 'STEEL',    60),
    ('900-81-10001', 'GS-REB-2607', '8809000010024', '철근 SD400 D16',             '가온스틸',    '7214.20', 'STEEL',    60),
    ('900-81-10002', 'BC-NMC-2608', '8809000010031', '전기차용 NMC 배터리팩 64kWh','블루셀',      '8507.60', 'BATTERY',  96),
    ('900-81-10002', 'BC-ESS-2608', '8809000010048', 'ESS용 LFP 모듈 5.1kWh',      '블루셀',      '8507.60', 'BATTERY',  120),
    ('900-81-10003', 'HT-COT-2608', '8809000010055', '오가닉 코튼 저지 180g',      '한올텍스타일','6006.21', 'TEXTILE',  12),
    ('900-81-10003', 'HT-RPE-2608', '8809000010062', '리사이클 폴리에스터 트윌',   '한올텍스타일','5407.61', 'TEXTILE',  12)
  ) AS v(biz_reg_no, sku, gtin, model_name, brand, hs_code, domain, warranty)
  JOIN organization o ON o.biz_reg_no = v.biz_reg_no
 WHERE NOT EXISTS (SELECT 1 FROM product_model pm WHERE pm.internal_sku = v.sku);

-- 3) 발급 완료(ACTIVE) DPP - 모델당 1건
INSERT INTO dpp (model_id, owner_org_id, serial_number, domain, lifecycle_stage, status,
                 completeness, filled_count, required_count, issued_at, created_at)
SELECT pm.model_id, pm.org_id, v.serial, pm.domain, 4, 'ACTIVE',
       100.00, 24, 24, now() - (v.age || ' days')::interval, now() - (v.age || ' days')::interval
  FROM (VALUES
    ('GS-HRC-2607', 'GS-HRC-2607-B0412', 42),
    ('GS-REB-2607', 'GS-REB-2607-B0188', 35),
    ('BC-NMC-2608', 'BC-NMC-2608-P1027', 28),
    ('BC-ESS-2608', 'BC-ESS-2608-M0663', 21),
    ('HT-COT-2608', 'HT-COT-2608-L0915', 14),
    ('HT-RPE-2608', 'HT-RPE-2608-L0431', 7)
  ) AS v(sku, serial, age)
  JOIN product_model pm ON pm.internal_sku = v.sku
 WHERE NOT EXISTS (SELECT 1 FROM dpp d WHERE d.serial_number = v.serial);

-- 4) 공개 항목 채우기
--    requirement_field에서 "공개(PUBLIC) + 데이터 입력" 필드만 골라, 자료형에 맞는 그럴듯한
--    값을 넣는다. 필드 목록을 여기 하드코딩하지 않는 이유: 도메인별 필드가 마이그레이션마다
--    바뀌는데 시드가 그걸 따라가지 못하면 화면에 빈 항목만 남는다.
INSERT INTO dpp_field_value (dpp_id, field_code, value_text, submitted_by_org, submitted_at)
SELECT d.dpp_id,
       rf.field_code,
       CASE rf.data_type
         WHEN 'NUMBER'  THEN to_char(20 + (abs(hashtext(rf.field_code || d.serial_number)) % 60), 'FM999')
         WHEN 'BOOLEAN' THEN '예'
         WHEN 'DATE'    THEN to_char(d.issued_at, 'YYYY-MM-DD')
         WHEN 'URL'     THEN 'https://example.test/' || lower(replace(rf.field_code, '_', '-'))
         ELSE COALESCE(rf.label_ko, rf.field_code) || ' 값'
       END,
       d.owner_org_id,
       d.issued_at
  FROM dpp d
  JOIN product_model pm ON pm.model_id = d.model_id
  JOIN requirement_field rf
    ON rf.domain IN ('COMMON', d.domain)
   AND rf.field_kind = 'DATA'
   AND rf.storage_target = 'FIELD_VALUE'
   AND rf.is_auto = FALSE
   AND rf.is_active = TRUE
   AND rf.disclosure_scope = 'PUBLIC'
 WHERE pm.internal_sku IN ('GS-HRC-2607','GS-REB-2607','BC-NMC-2608','BC-ESS-2608','HT-COT-2608','HT-RPE-2608')
   AND NOT EXISTS (SELECT 1 FROM dpp_field_value v
                    WHERE v.dpp_id = d.dpp_id AND v.field_code = rf.field_code);

-- 5) 발급 스냅샷 + 앵커(MOCK) - "블록체인에 기록됨"이 화면에 보이게
WITH target AS (
    SELECT d.dpp_id, d.public_uuid, d.issued_at
      FROM dpp d JOIN product_model pm ON pm.model_id = d.model_id
     WHERE pm.internal_sku IN ('GS-HRC-2607','GS-REB-2607','BC-NMC-2608','BC-ESS-2608','HT-COT-2608','HT-RPE-2608')
       AND NOT EXISTS (SELECT 1 FROM dpp_snapshot s WHERE s.dpp_id = d.dpp_id)
), ins_anchor AS (
    INSERT INTO blockchain_anchor (target_type, target_id, content_hash, channel_name, chaincode,
                                   tx_id, status, anchored_at)
    SELECT 'DPP_SNAPSHOT', t.dpp_id,
           encode(sha256(t.public_uuid::text::bytea), 'hex'),
           'dppchannel', 'dpp-ledger-chaincode',
           'mock-' || encode(sha256(t.public_uuid::text::bytea), 'hex'),
           'MOCK', t.issued_at
      FROM target t
    RETURNING anchor_id, target_id, content_hash
)
INSERT INTO dpp_snapshot (dpp_id, version_no, payload, content_hash, anchor_id, trigger_reason, created_at)
SELECT a.target_id, 1,
       jsonb_build_object('seed', 'demo-registry', 'dppId', a.target_id),
       a.content_hash, a.anchor_id, 'ISSUE', t.issued_at
  FROM ins_anchor a JOIN target t ON t.dpp_id = a.target_id;

-- 6) EU 레지스트리 등재
INSERT INTO registry_entry (dpp_id, registry_uid, hs_code, product_name, org_name, status, registered_at)
SELECT d.dpp_id,
       'EU-DPP-' || upper(replace(d.public_uuid::text, '-', ''))::varchar,
       pm.hs_code, pm.model_name, o.org_name, 'REGISTERED', d.issued_at
  FROM dpp d
  JOIN product_model pm ON pm.model_id = d.model_id
  JOIN organization o ON o.org_id = d.owner_org_id
 WHERE pm.internal_sku IN ('GS-HRC-2607','GS-REB-2607','BC-NMC-2608','BC-ESS-2608','HT-COT-2608','HT-RPE-2608')
   AND NOT EXISTS (SELECT 1 FROM registry_entry r WHERE r.dpp_id = d.dpp_id);

COMMIT;

\echo '--- 등록된 데모 DPP ---'
SELECT d.dpp_id, o.org_name AS 제조사, pm.model_name AS 제품, d.domain, d.serial_number,
       left(d.public_uuid::text, 8) AS uuid앞자리,
       (SELECT count(*) FROM dpp_field_value v WHERE v.dpp_id = d.dpp_id) AS 공개항목수
  FROM dpp d
  JOIN product_model pm ON pm.model_id = d.model_id
  JOIN organization o ON o.org_id = d.owner_org_id
 WHERE o.biz_reg_no IN ('900-81-10001','900-81-10002','900-81-10003')
 ORDER BY d.issued_at DESC;

\echo ''
\echo '--- QR 대신 브라우저로 열어볼 공개 주소 ---'
SELECT 'http://15.134.9.240/p/' || d.public_uuid AS 공개여권주소, pm.model_name AS 제품
  FROM dpp d JOIN product_model pm ON pm.model_id = d.model_id
  JOIN organization o ON o.org_id = d.owner_org_id
 WHERE o.biz_reg_no IN ('900-81-10001','900-81-10002','900-81-10003')
 ORDER BY d.issued_at DESC;

-- ============================================================
--  되돌리기 (데모 끝난 뒤 지우고 싶을 때)
--
--  BEGIN;
--  CREATE TEMP TABLE _o AS SELECT org_id FROM organization
--   WHERE biz_reg_no IN ('900-81-10001','900-81-10002','900-81-10003');
--  CREATE TEMP TABLE _d AS SELECT dpp_id FROM dpp WHERE owner_org_id IN (SELECT org_id FROM _o);
--  DELETE FROM registry_entry   WHERE dpp_id IN (SELECT dpp_id FROM _d);
--  DELETE FROM customs_clearance WHERE dpp_id IN (SELECT dpp_id FROM _d);
--  DELETE FROM dpp_field_value  WHERE dpp_id IN (SELECT dpp_id FROM _d);
--  DELETE FROM blockchain_anchor WHERE target_type = 'DPP_SNAPSHOT'
--     AND target_id IN (SELECT dpp_id FROM _d);
--  DELETE FROM dpp_snapshot      WHERE dpp_id IN (SELECT dpp_id FROM _d);
--  DELETE FROM dpp               WHERE dpp_id IN (SELECT dpp_id FROM _d);
--  DELETE FROM product_model     WHERE org_id IN (SELECT org_id FROM _o);
--  DELETE FROM organization      WHERE org_id IN (SELECT org_id FROM _o);
--  COMMIT;
-- ============================================================
