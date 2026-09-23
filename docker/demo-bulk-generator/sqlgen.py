# -*- coding: utf-8 -*-
"""seed-demo-bulk.sql 작성기 - COPY 스테이징 + 집합 INSERT."""
import json

DOC_URI = "/data/document-uploads/demo-bulk/"


def esc(v):
    if v is None:
        return r"\N"
    if isinstance(v, bool):
        return "t" if v else "f"
    s = str(v)
    return s.replace("\\", "\\\\").replace("\t", "\\t").replace("\n", "\\n").replace("\r", "\\r")


def copy_block(out, table, cols, rows):
    out.write(f"COPY {table} ({', '.join(cols)}) FROM stdin;\n")
    for r in rows:
        out.write("\t".join(esc(x) for x in r) + "\n")
    out.write("\\.\n\n")


HEADER = r"""-- =====================================================================
--  보여주기용 대량 데모 데이터 (2026-09-23)
--
--  * 도메인(철강/배터리/섬유)별 신규 회원 30곳 = 제조사 10 + 협력사 20
--    (원자재 공급사 9 · 시험인증기관 5~6 · 재활용업체 5~6, 일부 해외 협력사)
--  * 신규 제조사 1곳당 DPP 50건 = 총 1,500건
--    - 발급 완료(ACTIVE) / 작성 중(DRAFT) / 정지 / 수명종료(배터리) 섞음
--    - 도메인 전 항목 값, 화학조성·섬유혼용률·우려물질, 증빙문서 PDF(승인),
--      ZKP 검증 결과, 협력사 참여·초대, 발급 스냅샷 + 블록체인 앵커,
--      통관 이력(KR 수출 / FR 수입 세관), EU 레지스트리, 감사 로그
--    - DPP마다 서로 다른 제품 사진(3D 렌더링, 라벨 QR = 실제 여권 주소)
--  * 기존 계정(ops@ieum.io, steel-test@... 등 16개)과 그 데이터는 건드리지 않는다.
--  * 새 회원 로그인 비밀번호는 전부 Demo1234!
--
--  *** 실행 (docker/ 디렉터리에서) - PowerShell 파이프 금지(한글 깨짐) ***
--    docker cp seed-demo-bulk.sql dpp-postgres:/tmp/seed-demo-bulk.sql
--    docker exec -i dpp-postgres psql -U dpp -d dpp -f /tmp/seed-demo-bulk.sql
--
--  파일(사진·문서 PDF)은 docker/document-uploads/ 아래에 있어야 한다
--  (백엔드 컨테이너 /data/document-uploads 로 마운트됨):
--    document-uploads/dpp-photos/demo/<DPP UUID>.jpg
--    document-uploads/demo-bulk/<회사>/<품목코드>_<문서>.pdf
--
--  여러 번 돌려도 안전하다 - 이미 들어간 조직/계정/DPP(UUID 기준)는 건너뛴다.
--  되돌리기: docker/cleanup-demo-bulk.sql
-- =====================================================================
\set ON_ERROR_STOP on
\timing off
SET client_min_messages = warning;
BEGIN;

CREATE TEMP TABLE s_org (key text, name text, name_en text, org_type text, domain text, country text, biz text, eori text,
  postal text, addr1 text, addr2 text, city text, contact text, dept text, phone text, email text, website text, tier int,
  joined int, approved int, mobile text, last_login int) ON COMMIT DROP;
CREATE TEMP TABLE s_model (org_key text, sku text, gtin text, name text, brand text, category text, hs text, domain text,
  granularity text, created int) ON COMMIT DROP;
CREATE TEMP TABLE s_dpp (uuid uuid, org_key text, sku text, serial text, display text, domain text, stage int, status text,
  created int, issued int, updated int, photo text) ON COMMIT DROP;
CREATE TEMP TABLE s_part (uuid uuid, role text, org_key text, st text, invited int, accepted int, completed int) ON COMMIT DROP;
CREATE TEMP TABLE s_val (uuid uuid, code text, val text, role text, age int) ON COMMIT DROP;
CREATE TEMP TABLE s_mat (uuid uuid, kind text, name text, cas text, rate numeric, unit text, haz boolean, svhc boolean,
  rec numeric, loc text) ON COMMIT DROP;
CREATE TEMP TABLE s_doc (uuid uuid, doc_type text, role text, submitter text, file_name text, file_uri text, hash text,
  size bigint, issuer text, issued_date date, uploaded int, status text, tx text) ON COMMIT DROP;
CREATE TEMP TABLE s_zkp (uuid uuid, doc_type text, claim text, circuit text, proof text, signals jsonb, verified int, tx text) ON COMMIT DROP;
CREATE TEMP TABLE s_snap (uuid uuid, tx text) ON COMMIT DROP;
CREATE TEMP TABLE s_customs (uuid uuid, decision text, reason text, created int, decided int, imp_name text, imp_eori text,
  imp_addr text, hs text) ON COMMIT DROP;
CREATE TEMP TABLE s_audit (org_key text, action text, ttype text, uuid uuid, label text, result text, tx text, age int) ON COMMIT DROP;

"""

BODY = r"""
-- ─────────────────────────────────────────────────────────────────────
-- 시간 헬퍼: 스테이징의 숫자는 '지금으로부터 몇 분 전'
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION pg_temp.ago(m int) RETURNS timestamptz AS $$ SELECT now() - make_interval(mins => m) $$ LANGUAGE sql STABLE;
-- 블록 높이: 시간에 비례(약 2시간당 1블록) - 앵커 순서와 블록 순서가 어긋나지 않게
CREATE OR REPLACE FUNCTION pg_temp.blk(t timestamptz) RETURNS bigint AS $$
  SELECT 1200 + floor(extract(epoch FROM (t - (now() - interval '240 days'))) / 7200)::bigint $$ LANGUAGE sql STABLE;

-- ─────────────────────────────────────────────────────────────────────
-- 1) 조직 / 계정 / 도메인 권한
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO organization (org_name, org_type, domain, country_code, biz_reg_no, eori_code, uoi, postal_code, address_line1,
                          address_line2, city, contact_name, contact_dept, contact_phone, contact_email, website_url,
                          tier_level, profile_status, approval_status, approved_by, approved_at, created_at, updated_at,
                          verify_auto_approvable, verify_checked_at)
SELECT s.name, s.org_type, s.domain, s.country, s.biz, s.eori,
       CASE WHEN s.country = 'KR' THEN 'KR' || replace(s.biz, '-', '') END,
       s.postal, s.addr1, NULLIF(s.addr2, ''), s.city, s.contact, s.dept, s.phone, s.email, s.website,
       s.tier, 'APPROVED', 'ACTIVE',
       (SELECT user_id FROM user_account WHERE email = 'ops@ieum.io' AND deleted_at IS NULL LIMIT 1),
       pg_temp.ago(s.approved), pg_temp.ago(s.joined), pg_temp.ago(s.approved),
       s.country = 'KR', pg_temp.ago(s.joined - 3)
  FROM s_org s
 WHERE NOT EXISTS (SELECT 1 FROM organization o WHERE o.biz_reg_no = s.biz AND o.deleted_at IS NULL);

CREATE TEMP TABLE t_org ON COMMIT DROP AS
SELECT s.key, o.org_id, s.name, s.email, s.domain, s.org_type
  FROM s_org s JOIN organization o ON o.biz_reg_no = s.biz AND o.deleted_at IS NULL;

INSERT INTO user_account (org_id, account_type, email, email_verified, password_hash, phone, phone_verified,
                          credential_type, display_name, onboarding_step, status, last_login_at, created_at, updated_at)
SELECT t.org_id, 'BUSINESS', s.email, TRUE, :'pw', replace(s.mobile, '-', ''), TRUE, 'PASSWORD', s.name, 'COMPLETED', 'ACTIVE',
       pg_temp.ago(s.last_login), pg_temp.ago(s.joined), pg_temp.ago(s.last_login)
  FROM s_org s JOIN t_org t ON t.key = s.key
 WHERE NOT EXISTS (SELECT 1 FROM user_account u WHERE u.email = s.email AND u.deleted_at IS NULL);

CREATE TEMP TABLE t_user ON COMMIT DROP AS
SELECT t.key, u.user_id, t.org_id FROM t_org t JOIN user_account u ON u.email = t.email AND u.deleted_at IS NULL;

INSERT INTO org_domain_grant (org_id, domain, status, request_reason, requested_by, requested_at, decided_by, decided_at)
SELECT t.org_id, t.domain, 'APPROVED', '가입 시 주력 도메인', u.user_id, pg_temp.ago(s.joined),
       (SELECT user_id FROM user_account WHERE email = 'ops@ieum.io' AND deleted_at IS NULL LIMIT 1), pg_temp.ago(s.approved)
  FROM t_org t JOIN s_org s ON s.key = t.key JOIN t_user u ON u.key = t.key
 WHERE NOT EXISTS (SELECT 1 FROM org_domain_grant g WHERE g.org_id = t.org_id AND g.domain = t.domain);

-- ─────────────────────────────────────────────────────────────────────
-- 2) 제품 모델 / DPP
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO product_model (org_id, internal_sku, gtin, model_name, brand, category_code, hs_code, origin_country, domain,
                           granularity, status, created_at, updated_at, created_by)
SELECT t.org_id, m.sku, m.gtin, m.name, m.brand, m.category, m.hs, 'KR', m.domain, m.granularity, 'ACTIVE',
       pg_temp.ago(m.created), pg_temp.ago(m.created), u.user_id
  FROM s_model m JOIN t_org t ON t.key = m.org_key JOIN t_user u ON u.key = m.org_key
 WHERE NOT EXISTS (SELECT 1 FROM product_model p WHERE p.org_id = t.org_id AND p.internal_sku = m.sku AND p.deleted_at IS NULL)
   AND NOT EXISTS (SELECT 1 FROM product_model p WHERE p.gtin = m.gtin AND p.deleted_at IS NULL);

CREATE TEMP TABLE t_new ON COMMIT DROP AS SELECT s.uuid FROM s_dpp s WHERE NOT EXISTS (SELECT 1 FROM dpp d WHERE d.public_uuid = s.uuid);

INSERT INTO dpp (public_uuid, model_id, owner_org_id, serial_number, display_name, domain, lifecycle_stage, status,
                 issued_at, created_at, updated_at, created_by, updated_by, product_photo_uri, product_photo_content_type)
SELECT s.uuid, p.model_id, t.org_id, s.serial, s.display, s.domain, s.stage, s.status,
       CASE WHEN s.issued IS NULL THEN NULL ELSE pg_temp.ago(s.issued) END,
       pg_temp.ago(s.created), pg_temp.ago(s.updated), u.user_id, u.user_id, s.photo, 'image/jpeg'
  FROM s_dpp s
  JOIN t_new n ON n.uuid = s.uuid
  JOIN t_org t ON t.key = s.org_key
  JOIN t_user u ON u.key = s.org_key
  JOIN product_model p ON p.org_id = t.org_id AND p.internal_sku = s.sku AND p.deleted_at IS NULL;

CREATE TEMP TABLE t_dpp ON COMMIT DROP AS
SELECT d.dpp_id, d.public_uuid AS uuid, d.owner_org_id, s.status, s.domain, s.created, s.issued, s.org_key,
       (SELECT user_id FROM t_user u WHERE u.key = s.org_key) AS usr
  FROM s_dpp s JOIN t_new n ON n.uuid = s.uuid JOIN dpp d ON d.public_uuid = s.uuid;
CREATE INDEX ON t_dpp (uuid);

-- ─────────────────────────────────────────────────────────────────────
-- 3) 협력사 참여 + 초대 이력
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO dpp_participant (dpp_id, org_id, role_code, submit_status, invited_at, accepted_at, completed_at)
SELECT d.dpp_id, t.org_id, p.role, p.st, pg_temp.ago(p.invited),
       CASE WHEN p.accepted IS NULL THEN NULL ELSE pg_temp.ago(p.accepted) END,
       CASE WHEN p.completed IS NULL THEN NULL ELSE pg_temp.ago(p.completed) END
  FROM s_part p JOIN t_dpp d ON d.uuid = p.uuid JOIN t_org t ON t.key = p.org_key
ON CONFLICT DO NOTHING;

INSERT INTO invitation (inviter_org_id, invitee_email, invitee_org_name, dpp_id, role_code, token, status, accepted_org_id,
                        expires_at, accepted_at, created_at, created_by)
SELECT d.owner_org_id, t.email, t.name, d.dpp_id, p.role, 'demo-' || md5(p.uuid::text || p.role),
       CASE WHEN p.accepted IS NULL THEN 'SENT' ELSE 'ACCEPTED' END,
       CASE WHEN p.accepted IS NULL THEN NULL ELSE t.org_id END,
       pg_temp.ago(p.invited) + interval '14 days',
       CASE WHEN p.accepted IS NULL THEN NULL ELSE pg_temp.ago(p.accepted) END,
       pg_temp.ago(p.invited), d.usr
  FROM s_part p JOIN t_dpp d ON d.uuid = p.uuid JOIN t_org t ON t.key = p.org_key
ON CONFLICT (token) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- 4) 항목 값 - 전부 value_text (FieldFormService가 읽는 유일한 컬럼)
--    제출 주체: M=제조사, S/T/R=그 역할의 참여 협력사, A=시스템(제조사 명의)
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO dpp_field_value (dpp_id, field_code, value_text, submitted_by_org, submitted_by_user, submitted_at, updated_at, signature)
SELECT d.dpp_id, v.code, v.val,
       COALESCE(pt.org_id, d.owner_org_id),
       COALESCE(pu.user_id, d.usr),
       pg_temp.ago(v.age), pg_temp.ago(v.age),
       encode(sha256(convert_to(d.uuid::text || v.code || v.val, 'UTF8')), 'hex')
  FROM s_val v
  JOIN t_dpp d ON d.uuid = v.uuid
  JOIN requirement_field rf ON rf.field_code = v.code
  LEFT JOIN s_part sp ON sp.uuid = v.uuid AND sp.role = CASE v.role WHEN 'S' THEN 'RAW_SUPPLIER' WHEN 'T' THEN 'TEST_LAB' WHEN 'R' THEN 'RECYCLER' END
  LEFT JOIN t_org pt ON pt.key = sp.org_key
  LEFT JOIN t_user pu ON pu.key = sp.org_key
ON CONFLICT (dpp_id, field_code) DO NOTHING;

INSERT INTO material_composition (dpp_id, entry_kind, material_name, cas_number, content_rate, content_unit, is_hazardous,
                                  svhc_flag, recycled_rate, part_location, created_at, updated_at)
SELECT d.dpp_id, m.kind, m.name, m.cas, m.rate, m.unit, m.haz, m.svhc, m.rec, m.loc,
       pg_temp.ago(GREATEST(COALESCE(d.issued, 60), d.created - 1440)), pg_temp.ago(GREATEST(COALESCE(d.issued, 60), d.created - 1440))
  FROM s_mat m JOIN t_dpp d ON d.uuid = m.uuid;

-- ─────────────────────────────────────────────────────────────────────
-- 5) 문서 + DPP 연결 + 검수(승인) 이력
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO document (doc_type_code, owner_type, owner_id, submitted_by_org, file_name, file_uri, content_hash, mime_type,
                      file_size, virus_scan_status, issuer, issued_at, expires_at, review_status, parsed_at,
                      created_at, updated_at, created_by)
SELECT x.doc_type, 'DPP', d.dpp_id, t.org_id, x.file_name, x.file_uri, x.hash, 'application/pdf', x.size, 'CLEAN',
       x.issuer, x.issued_date::timestamptz + interval '9 hours',
       CASE WHEN dt.requires_expiry THEN x.issued_date::timestamptz + interval '3 years' END,
       x.status, CASE WHEN x.status = 'APPROVED' THEN pg_temp.ago(x.uploaded - 2) END,
       pg_temp.ago(x.uploaded), pg_temp.ago(x.uploaded), COALESCE(u.user_id, d.usr)
  FROM s_doc x
  JOIN t_dpp d ON d.uuid = x.uuid
  JOIN t_org t ON t.key = x.submitter
  LEFT JOIN t_user u ON u.key = x.submitter
  JOIN document_type dt ON dt.doc_type_code = x.doc_type
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE t_doc ON COMMIT DROP AS
SELECT doc.document_id, doc.owner_id AS dpp_id, doc.doc_type_code, doc.content_hash, doc.created_at, doc.review_status, x.tx,
       doc.submitted_by_org, x.uuid, doc.file_name
  FROM s_doc x JOIN t_dpp d ON d.uuid = x.uuid
  JOIN document doc ON doc.owner_type = 'DPP' AND doc.owner_id = d.dpp_id AND doc.doc_type_code = x.doc_type AND doc.deleted_at IS NULL;

INSERT INTO document_link (document_id, dpp_id, link_type, created_at)
SELECT document_id, dpp_id, 'DIRECT', created_at FROM t_doc
ON CONFLICT (document_id, dpp_id) DO NOTHING;

INSERT INTO document_review (document_id, reviewer_user_id, action, reason_detail, reviewed_at)
SELECT t.document_id, NULL, 'APPROVE', '자동 검증 통과(형식·서명·해시 확인)', t.created_at + interval '2 minutes'
  FROM t_doc t WHERE t.review_status = 'APPROVED';

-- 문서 해시 앵커
INSERT INTO blockchain_anchor (target_type, target_id, content_hash, channel_name, chaincode, tx_id, block_no, status, anchored_at, created_at)
SELECT 'DOCUMENT', t.document_id, t.content_hash, 'dppchannel', 'dpp-ledger-chaincode', t.tx,
       pg_temp.blk(t.created_at + interval '1 minute'), 'CONFIRMED', t.created_at + interval '1 minute', t.created_at
  FROM t_doc t;

-- ─────────────────────────────────────────────────────────────────────
-- 6) ZKP 검증 결과 + 판정 앵커
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO zkp_proof (dpp_id, target_type, document_id, claim_type, circuit_name, proof_data, public_signals, status, verified_at, created_at)
SELECT d.dpp_id, 'DOCUMENT', t.document_id, z.claim, z.circuit,
       json_build_object('proof', z.proof, 'verificationKeyHash', md5(z.circuit), 'system', 'o1js/kimchi')::text,
       z.signals, 'VERIFIED', pg_temp.ago(z.verified), pg_temp.ago(z.verified + 1)
  FROM s_zkp z JOIN t_dpp d ON d.uuid = z.uuid
  JOIN t_doc t ON t.uuid = z.uuid AND t.doc_type_code = z.doc_type;

INSERT INTO blockchain_anchor (target_type, target_id, content_hash, channel_name, chaincode, tx_id, block_no, status, anchored_at, created_at)
SELECT 'EVENT', p.proof_id, z.tx, 'dppchannel', 'dpp-ledger-chaincode', z.tx, pg_temp.blk(p.verified_at + interval '1 minute'),
       'CONFIRMED', p.verified_at + interval '1 minute', p.verified_at
  FROM s_zkp z JOIN t_dpp d ON d.uuid = z.uuid
  JOIN zkp_proof p ON p.dpp_id = d.dpp_id AND p.circuit_name = z.circuit;

-- ─────────────────────────────────────────────────────────────────────
-- 7) 완성도 / 조회 캐시 재계산
-- ─────────────────────────────────────────────────────────────────────
SELECT count(*) AS "완성도 재계산" FROM (SELECT fn_recalc_completeness(dpp_id), fn_refresh_dpp_attributes(dpp_id) FROM t_dpp) x;

-- ─────────────────────────────────────────────────────────────────────
-- 8) 발급 스냅샷 + 블록체인 앵커 (FieldFormService.issue 와 같은 흐름)
--    fn_create_dpp_snapshot 이 MOCK 앵커를 만들면 그 행을 확정(CONFIRMED)으로 바꾼다.
-- ─────────────────────────────────────────────────────────────────────
CREATE TEMP TABLE t_snap ON COMMIT DROP AS
SELECT d.dpp_id, d.uuid, d.issued, fn_create_dpp_snapshot(d.dpp_id, 'ISSUE', d.usr, TRUE) AS snapshot_id
  FROM t_dpp d WHERE d.issued IS NOT NULL;

UPDATE dpp_snapshot s SET created_at = pg_temp.ago(t.issued), created_by = d.usr
  FROM t_snap t JOIN t_dpp d ON d.dpp_id = t.dpp_id WHERE s.snapshot_id = t.snapshot_id;

UPDATE blockchain_anchor a
   SET tx_id = sn.tx, status = 'CONFIRMED', block_no = pg_temp.blk(pg_temp.ago(t.issued) + interval '2 minutes'),
       anchored_at = pg_temp.ago(t.issued) + interval '2 minutes', created_at = pg_temp.ago(t.issued)
  FROM t_snap t JOIN s_snap sn ON sn.uuid = t.uuid
 WHERE a.target_type = 'DPP_SNAPSHOT' AND a.target_id = t.snapshot_id;

-- 데이터 캐리어(QR) / EU 레지스트리 / 생애주기 이벤트
INSERT INTO data_carrier (dpp_id, carrier_type, digital_link_uri, is_primary, generated_at)
SELECT t.dpp_id, 'QR', 'http://localhost/p/' || t.uuid, TRUE, pg_temp.ago(t.issued) FROM t_snap t;

INSERT INTO registry_entry (dpp_id, registry_uid, hs_code, product_name, org_name, status, registered_at, updated_at)
SELECT t.dpp_id, v.value_text, pm.hs_code, pm.model_name, o.org_name, 'REGISTERED', pg_temp.ago(t.issued) + interval '10 minutes',
       pg_temp.ago(t.issued) + interval '10 minutes'
  FROM t_snap t JOIN dpp d ON d.dpp_id = t.dpp_id JOIN product_model pm ON pm.model_id = d.model_id
  JOIN organization o ON o.org_id = d.owner_org_id
  JOIN dpp_field_value v ON v.dpp_id = t.dpp_id AND v.field_code = 'REGISTRY_UID'
ON CONFLICT (registry_uid) DO NOTHING;

INSERT INTO lifecycle_event (dpp_id, event_type, lifecycle_stage, actor_org_id, actor_user_id, payload, is_anchored, anchor_id, occurred_at, recorded_at)
SELECT t.dpp_id, 'DPP_ISSUED', 4, d.owner_org_id, d.usr, jsonb_build_object('snapshotId', t.snapshot_id), TRUE,
       (SELECT anchor_id FROM blockchain_anchor a WHERE a.target_type = 'DPP_SNAPSHOT' AND a.target_id = t.snapshot_id LIMIT 1),
       pg_temp.ago(t.issued), pg_temp.ago(t.issued)
  FROM t_snap t JOIN t_dpp d ON d.dpp_id = t.dpp_id;

-- ─────────────────────────────────────────────────────────────────────
-- 9) 통관 이력 - 수출(KR 세관) + 수입(FR 세관). 세관 계정이 있을 때만 행이 생긴다.
--    대부분 과거에 결정 완료(승인/보류)라 시연용 대기열 맨 위를 가리지 않는다.
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO customs_clearance (dpp_id, snapshot_id, customs_org_id, hs_code, decision, reason, integrity_result, decided_by,
                               decided_at, created_at, clearance_side, export_country_code, import_country_code,
                               importer_name, importer_address, importer_eori, requested_by_org_id)
SELECT d.dpp_id, t.snapshot_id, co.org_id, c.hs, c.decision, c.reason,
       CASE WHEN c.decision = 'PENDING' THEN NULL ELSE 'MATCH' END,
       CASE WHEN c.decision = 'PENDING' THEN NULL
            ELSE (SELECT u.user_id FROM user_account u WHERE u.org_id = co.org_id AND u.deleted_at IS NULL ORDER BY u.user_id LIMIT 1) END,
       CASE WHEN c.decided IS NULL THEN NULL ELSE pg_temp.ago(c.decided - CASE WHEN side.s = 'IMPORT' THEN 600 ELSE 0 END) END,
       pg_temp.ago(c.created), side.s, 'KR', 'FR', c.imp_name, c.imp_addr, c.imp_eori, d.owner_org_id
  FROM s_customs c
  JOIN t_dpp d ON d.uuid = c.uuid
  JOIN t_snap t ON t.dpp_id = d.dpp_id
  CROSS JOIN (VALUES ('EXPORT', 'KR'), ('IMPORT', 'FR')) AS side(s, cc)
  JOIN organization co ON co.org_type = 'CUSTOMS' AND co.deleted_at IS NULL AND co.approval_status = 'ACTIVE'
                      AND upper(btrim(co.country_code)) = side.cc;

-- ─────────────────────────────────────────────────────────────────────
-- 10) 감사 로그 - 가입 승인 / 문서 업로드 / ZKP 검증 / DPP 발급
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO audit_log (actor_user_id, actor_org_id, action, target_type, target_id, after_value, created_at)
SELECT (SELECT user_id FROM user_account WHERE email = 'ops@ieum.io' AND deleted_at IS NULL LIMIT 1),
       (SELECT org_id FROM user_account WHERE email = 'ops@ieum.io' AND deleted_at IS NULL LIMIT 1),
       'APPROVE', 'ORGANIZATION', t.org_id,
       jsonb_build_object('targetLabel', s.name || ' 가입 심사 (사업자등록증 자동검증)', 'result', '승인'), pg_temp.ago(s.approved)
  FROM s_org s JOIN t_org t ON t.key = s.key
 WHERE NOT EXISTS (SELECT 1 FROM audit_log l WHERE l.target_type = 'ORGANIZATION' AND l.target_id = t.org_id);

INSERT INTO audit_log (actor_user_id, actor_org_id, action, target_type, target_id, after_value, created_at)
SELECT COALESCE(u.user_id, d.usr), t.submitted_by_org, 'CREATE', 'DOCUMENT', t.document_id,
       jsonb_build_object('targetLabel', dt.name_ko || ' ' || t.doc_type_code || ' (DPP-' || t.dpp_id || ')', 'result', '성공', 'txId', t.tx),
       t.created_at
  FROM t_doc t JOIN t_dpp d ON d.dpp_id = t.dpp_id JOIN document_type dt ON dt.doc_type_code = t.doc_type_code
  LEFT JOIN t_user u ON u.org_id = t.submitted_by_org
 WHERE t.doc_type_code IN ('MILL_SHEET', 'CBAM_REPORT', 'SCRAP_PROOF', 'CARE_LABEL', 'OEKOTEX_LABEL', 'GRS_CERTIFICATE',
                           'BATTERY_CARBON_REPORT', 'DUE_DILIGENCE_REPORT', 'RECYCLING_REPORT', 'TEST_REPORT');

INSERT INTO audit_log (actor_user_id, actor_org_id, action, target_type, target_id, after_value, created_at)
SELECT d.usr, d.owner_org_id, 'CREATE', 'ZKP_PROOF', p.proof_id,
       jsonb_build_object('targetLabel', z.doc_type || ' ZKP (DPP-' || d.dpp_id || ') ' || z.circuit, 'result', '충족', 'txId', z.tx),
       p.verified_at
  FROM s_zkp z JOIN t_dpp d ON d.uuid = z.uuid JOIN zkp_proof p ON p.dpp_id = d.dpp_id AND p.circuit_name = z.circuit;

INSERT INTO audit_log (actor_user_id, actor_org_id, action, target_type, target_id, after_value, created_at)
SELECT d.usr, d.owner_org_id, a.action, a.ttype, d.dpp_id,
       jsonb_build_object('targetLabel', a.label, 'result', a.result, 'txId', a.tx), pg_temp.ago(a.age)
  FROM s_audit a JOIN t_dpp d ON d.uuid = a.uuid;

-- ─────────────────────────────────────────────────────────────────────
-- 11) 수정 시각 보정 - 위의 재계산 UPDATE가 trigger로 updated_at 을 전부 now()로 바꿔놨다.
--     "최근 작업" 목록이 실제 작업 순서대로 보이도록 원래 시각으로 되돌린다.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE dpp DISABLE TRIGGER trg_dpp_version;
UPDATE dpp d SET updated_at = pg_temp.ago(s.updated), version = 1 + (SELECT count(*) FROM dpp_field_value v WHERE v.dpp_id = d.dpp_id) / 20
  FROM s_dpp s JOIN t_new n ON n.uuid = s.uuid WHERE d.public_uuid = s.uuid;
ALTER TABLE dpp ENABLE TRIGGER trg_dpp_version;

COMMIT;

-- =====================================================================
--  확인
-- =====================================================================
\echo ''
\echo '--- 도메인별 신규 회원 (각 30이 정상) ---'
SELECT o.domain, count(*) FILTER (WHERE o.org_type = 'MANUFACTURER') AS 제조사,
       count(*) FILTER (WHERE o.org_type <> 'MANUFACTURER') AS 협력사, count(*) AS 합계
  FROM organization o WHERE o.contact_email IN (__EMAILS__) GROUP BY 1 ORDER BY 1;

\echo ''
\echo '--- 신규 제조사별 DPP (보유 50 / 발행) ---'
SELECT o.org_name, count(d.*) AS 보유, count(d.*) FILTER (WHERE d.status = 'ACTIVE') AS 발행,
       round(avg(d.completeness), 1) AS 평균완성도
  FROM organization o JOIN dpp d ON d.owner_org_id = o.org_id AND d.deleted_at IS NULL
 WHERE o.org_type = 'MANUFACTURER' AND o.contact_email IN (__EMAILS__)
 GROUP BY o.org_name ORDER BY o.org_name;

\echo ''
\echo '--- 발급건 중 필수 미충족이 남은 DPP 수 (0이 정상) ---'
SELECT count(DISTINCT m.dpp_id) AS 미충족_DPP
  FROM v_dpp_missing_field m JOIN dpp d ON d.dpp_id = m.dpp_id
 WHERE d.status = 'ACTIVE' AND d.public_uuid IN (SELECT uuid FROM s_dpp_check);
"""


def write(path, orgs, models, rows_dpp, rows_part, rows_inv, rows_val, rows_mat, rows_doc, rows_zkp, rows_customs, rows_audit,
          meta, ob, pw, model_partner):
    import random
    rnd = random.Random(5)
    with open(path, "w", encoding="utf-8", newline="\n") as out:
        out.write(HEADER.replace("BEGIN;", f"\\set pw '{pw}'\nBEGIN;", 1))
        org_rows = []
        for o in orgs:
            joined = o["joined_days"] * 1440 + rnd.randint(0, 600)
            approved = joined - rnd.randint(180, 2 * 1440)
            last = rnd.randint(30, 6 * 1440) if o["org_type"] == "MANUFACTURER" else rnd.randint(60, 20 * 1440)
            org_rows.append((o["key"], o["name"], o["name_en"], o["org_type"], o["domain"], o["country"], o["biz"], o.get("eori"),
                             o["postal"], o["addr1"], o.get("addr2", ""), o["city"], o["contact"], o["dept"], o["phone"], o["email"],
                             o["website"], o["tier"], joined, approved, o["mobile"], last))
        copy_block(out, "s_org", ["key", "name", "name_en", "org_type", "domain", "country", "biz", "eori", "postal", "addr1", "addr2",
                                  "city", "contact", "dept", "phone", "email", "website", "tier", "joined", "approved", "mobile", "last_login"], org_rows)
        # 모델 생성 시각 = 그 모델의 가장 오래된 DPP보다 조금 전
        first = {}
        for r in rows_dpp:
            first[r[2]] = max(first.get(r[2], 0), r[8])
        mrows = []
        for m in models:
            o = ob[m["org"]]
            cat = m["hs"]
            brand = o["name"].replace(" 주식회사", "")
            gran = {"STEEL": "BATCH", "TEXTILE": "BATCH", "BATTERY": "ITEM"}[m["domain"]]
            mrows.append((m["org"], m["sku"], m["gtin"], m["name"], brand, cat, m["hs"], m["domain"], gran,
                          first.get(m["sku"], o["joined_days"] * 1440 - 7 * 1440) + 1440 * 3))
        copy_block(out, "s_model", ["org_key", "sku", "gtin", "name", "brand", "category", "hs", "domain", "granularity", "created"], mrows)
        copy_block(out, "s_dpp", ["uuid", "org_key", "sku", "serial", "display", "domain", "stage", "status", "created", "issued", "updated", "photo"], rows_dpp)
        copy_block(out, "s_part", ["uuid", "role", "org_key", "st", "invited", "accepted", "completed"], rows_part)
        copy_block(out, "s_val", ["uuid", "code", "val", "role", "age"], rows_val)
        copy_block(out, "s_mat", ["uuid", "kind", "name", "cas", "rate", "unit", "haz", "svhc", "rec", "loc"], rows_mat)
        drows = []
        for (uuid, t, role, key, submitter, up, status, txh) in rows_doc:
            rel, h, size, issuer, doc_no, dt = meta[key]
            drows.append((uuid, t, role, submitter, rel.split("/")[-1], DOC_URI + rel, h, size, issuer, dt, up, status, txh))
        copy_block(out, "s_doc", ["uuid", "doc_type", "role", "submitter", "file_name", "file_uri", "hash", "size", "issuer", "issued_date",
                                  "uploaded", "status", "tx"], drows)
        copy_block(out, "s_zkp", ["uuid", "doc_type", "claim", "circuit", "proof", "signals", "verified", "tx"], rows_zkp)
        snaps = [(r[0], None) for r in rows_dpp if r[9] is not None]
        # 스냅샷 tx 는 values.system_values 의 LEDGER_TX_HASH 와 같아야 한다
        ledger = {r[0]: r[2] for r in rows_val if r[1] == "LEDGER_TX_HASH"}
        copy_block(out, "s_snap", ["uuid", "tx"], [(u, ledger[u]) for u, _ in snaps])
        copy_block(out, "s_customs", ["uuid", "decision", "reason", "created", "decided", "imp_name", "imp_eori", "imp_addr", "hs"], rows_customs)
        copy_block(out, "s_audit", ["org_key", "action", "ttype", "uuid", "label", "result", "tx", "age"], rows_audit)
        emails = ", ".join("'" + o["email"] + "'" for o in orgs)
        body = BODY.replace("__EMAILS__", emails)
        # 마지막 확인 쿼리는 트랜잭션 밖이라 임시테이블이 없다 - 이메일 기준으로 바꾼다
        body = body.replace("AND d.public_uuid IN (SELECT uuid FROM s_dpp_check)",
                            "AND d.owner_org_id IN (SELECT org_id FROM organization WHERE contact_email IN (" + emails + "))")
        out.write(body)
