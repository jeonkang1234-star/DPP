-- ============================================================
--  DPP 하나를 "협력사 제출분만 남고 제조사는 아무것도 입력하지 않은" 상태로 되돌린다.
--  데모 영상에서 제조사가 데이터를 입력하는 장면부터 다시 찍기 위한 스크립트
--  (2026-08-23 강 요청).
--
--  ■ 남기는 것 - 협력사가 낸 것 전부
--    dpp_field_value  submitted_by_org 가 이 DPP의 참여 협력사인 행
--    document         같은 기준으로 협력사가 올린 문서 + 그 문서의 ZKP 증명
--    dpp_participant / invitation  초대·수락·제출완료 상태
--
--  ■ 지우는 것 - 제조사가 낸 것 전부
--    dpp_field_value  submitted_by_org 가 소유 조직이거나 비어 있는 행
--    document         제조사가 올린 문서와 그 링크·검토·ZKP 증명
--    product_model.model_name  제품명 칸을 비우므로 자리표시자로 되돌린다
--    발급 산출물(스냅샷·앵커·통관·감사기록·QR 조회기록)과 발급 상태
--
--  ■ 판정 기준을 submitted_by_org 로 잡은 이유
--    requirement_field.responsible_role 로 가르면 "협력사 담당인데 제조사가 미리
--    채워둔 값"이 남는다. 그건 협력사에게 받은 게 아니다. 실제로 누가 저장했는지는
--    submitted_by_org 에만 있다(FieldFormService.upsertValues, DocumentSlotService.upload).
--
--  ■ 실행
--    docker exec -i dpp-postgres psql -U dpp -d dpp -f /tmp/rk.sql
--    또는 아래 :id 만 바꿔서 heredoc 으로 붙여넣기.
--
--  주의: dpp_snapshot / audit_log 는 스키마상 append-only 다. 데모 준비용으로만 쓸 것.
-- ============================================================
\set ON_ERROR_STOP on
\set id 13

BEGIN;

-- 이 DPP에 붙은 참여 협력사 조직. 여기 없는 org 가 낸 것은 전부 제조사 몫으로 본다.
CREATE TEMP TABLE _partner ON COMMIT DROP AS
SELECT DISTINCT org_id FROM dpp_participant WHERE dpp_id = :id AND org_id IS NOT NULL;

-- 지울 문서: 이 DPP에 연결돼 있으면서 협력사가 올린 게 아닌 것.
CREATE TEMP TABLE _doc ON COMMIT DROP AS
SELECT d.document_id
  FROM document_link l
  JOIN document d ON d.document_id = l.document_id
 WHERE l.dpp_id = :id
   AND (d.submitted_by_org IS NULL
        OR d.submitted_by_org NOT IN (SELECT org_id FROM _partner));

\echo '--- 되돌리기 전 ---'
SELECT (SELECT count(*) FROM _partner) AS 참여협력사,
       (SELECT count(*) FROM dpp_field_value v WHERE v.dpp_id = :id) AS 입력값_전체,
       (SELECT count(*) FROM dpp_field_value v WHERE v.dpp_id = :id
          AND v.submitted_by_org IN (SELECT org_id FROM _partner)) AS 입력값_협력사분,
       (SELECT count(*) FROM document_link l WHERE l.dpp_id = :id) AS 문서_전체,
       (SELECT count(*) FROM _doc) AS 문서_삭제대상;

-- ── 1) 제조사가 올린 문서 지우기 ──────────────────────────────
-- document 를 참조하는 테이블부터 정리한다. document_link 는 ON DELETE CASCADE 라
-- 따로 안 지워도 되지만, 나머지는 FK 가 막는다.
DELETE FROM zkp_proof p USING _doc x WHERE p.document_id = x.document_id;
DELETE FROM document_review r USING _doc x WHERE r.document_id = x.document_id;
-- 남을 행이 지워질 문서를 가리키고 있으면 참조만 끊는다(그 값 자체는 협력사 것일 수 있다).
UPDATE dpp_field_value v SET source_document_id = NULL
 WHERE v.source_document_id IN (SELECT document_id FROM _doc);
UPDATE material_composition m SET source_document_id = NULL
 WHERE m.source_document_id IN (SELECT document_id FROM _doc);
DELETE FROM document d USING _doc x WHERE d.document_id = x.document_id;

-- ── 2) 제조사가 입력한 값 지우기 ──────────────────────────────
-- submitted_by_org 가 비어 있는 행도 제조사 몫으로 본다 - 협력사 저장 경로는 항상
-- org 를 채운다(FieldFormService.upsertValues).
DELETE FROM dpp_field_value v
 WHERE v.dpp_id = :id
   AND (v.submitted_by_org IS NULL
        OR v.submitted_by_org NOT IN (SELECT org_id FROM _partner));

-- ── 3) 발급 산출물 되돌리기 ───────────────────────────────────
CREATE TEMP TABLE _anchor ON COMMIT DROP AS
SELECT s.anchor_id FROM dpp_snapshot s WHERE s.dpp_id = :id AND s.anchor_id IS NOT NULL
UNION
SELECT a.anchor_id FROM blockchain_anchor a
 WHERE a.target_type = 'DPP_SNAPSHOT'
   AND a.target_id IN (SELECT snapshot_id FROM dpp_snapshot WHERE dpp_id = :id);

DELETE FROM customs_clearance WHERE dpp_id = :id;
DELETE FROM dpp_snapshot      WHERE dpp_id = :id;
DELETE FROM blockchain_anchor a USING _anchor x WHERE a.anchor_id = x.anchor_id;
DELETE FROM audit_log         WHERE target_type = 'DPP' AND target_id = :id;
DELETE FROM scan_history      WHERE dpp_id = :id;

-- public_uuid 는 그대로 둔다 - 생성 시점에 받는 값이라, 바꾸면 이미 뽑아둔 QR/링크가 죽는다.
UPDATE dpp SET status = 'DRAFT', issued_at = NULL WHERE dpp_id = :id;

-- 제품명 칸을 지웠으므로 모델명도 자리표시자로 되돌린다. 그대로 두면 목록에 예전
-- 제품명이 남아서 "아직 아무것도 입력 안 한 DPP"처럼 보이지 않는다.
UPDATE product_model pm
   SET model_name = CASE d.domain WHEN 'TEXTILE' THEN '미입력 섬유 제품'
                                  WHEN 'BATTERY' THEN '미입력 배터리 제품'
                                  ELSE '미입력 철강 제품' END
  FROM dpp d
 WHERE d.model_id = pm.model_id AND d.dpp_id = :id;

SELECT fn_recalc_completeness(:id);

\echo '--- 되돌린 뒤 ---'
SELECT d.dpp_id, d.status, d.issued_at, d.completeness, pm.model_name AS 모델명,
       d.display_name AS DPP이름,
       (SELECT count(*) FROM dpp_field_value WHERE dpp_id = :id)   AS 남은입력값,
       (SELECT count(*) FROM document_link  WHERE dpp_id = :id)    AS 남은문서,
       (SELECT count(*) FROM dpp_snapshot   WHERE dpp_id = :id)    AS 스냅샷
  FROM dpp d JOIN product_model pm ON pm.model_id = d.model_id
 WHERE d.dpp_id = :id;

\echo '--- 남은 입력값(전부 협력사 제출분이어야 함) ---'
SELECT v.field_code, left(v.value_text, 40) AS 값, o.org_name AS 제출조직
  FROM dpp_field_value v
  LEFT JOIN organization o ON o.org_id = v.submitted_by_org
 WHERE v.dpp_id = :id
 ORDER BY v.field_code;

\echo '--- 남은 문서 ---'
SELECT doc.doc_type_code, doc.file_name, doc.review_status, o.org_name AS 제출조직
  FROM document_link l
  JOIN document doc ON doc.document_id = l.document_id
  LEFT JOIN organization o ON o.org_id = doc.submitted_by_org
 WHERE l.dpp_id = :id;

\echo '--- 협력사 참여 상태(유지되어야 함) ---'
SELECT p.role_code, p.submit_status, p.accepted_at IS NOT NULL AS 수락됨, o.org_name
  FROM dpp_participant p
  LEFT JOIN organization o ON o.org_id = p.org_id
 WHERE p.dpp_id = :id;

COMMIT;
