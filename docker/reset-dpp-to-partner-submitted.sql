-- ============================================================
--  DPP 하나를 "협력사가 자료를 올린 직후 / 아직 발급 전" 상태로 되돌린다.
--  데모 영상을 발급 장면부터 다시 찍기 위한 스크립트 (2026-08-23 강 요청).
--
--  ■ 되돌리는 것 (= 발급 버튼을 누르면서 생긴 것들)
--    dpp.status ACTIVE -> DRAFT, issued_at -> NULL   (FieldFormService.issue)
--    customs_clearance   그 DPP의 세관 심사 케이스   (autoCreateOnIssue)
--    dpp_snapshot        ISSUE 스냅샷
--    blockchain_anchor   그 스냅샷을 가리키는 앵커 행
--    audit_log           그 DPP의 발급 기록
--    scan_history        지난 촬영 때 QR로 조회한 기록
--
--  ■ 건드리지 않는 것
--    dpp_field_value / document / document_link  - 제조사·협력사가 입력·업로드한 값
--    dpp_participant / invitation                - 협력사 초대·수락 상태
--    product_model                               - 제품명 등
--    즉 "협력사가 제출을 끝낸 화면"이 그대로 남고 발급만 안 한 상태가 된다.
--
--  ■ 이 스크립트가 못 하는 것
--    발급 이후에 제조사가 고친 입력값은 되돌리지 않는다. 이건 발급 행위만 무르는
--    스크립트지, 데이터 편집 이력을 되감는 스크립트가 아니다.
--
--  ■ 실행
--    docker cp docker/reset-dpp-to-partner-submitted.sql dpp-postgres:/tmp/rs.sql
--    docker exec -it dpp-postgres psql -U dpp -d dpp -f /tmp/rs.sql
--
--  ■ 대상 바꾸기
--    아래 :sku 값만 바꾸면 다른 DPP에도 쓸 수 있다. product_model.internal_sku 다.
--
--  주의: dpp_snapshot / audit_log 는 스키마 주석상 append-only(수정·삭제 금지)다.
--  데모 재촬영 준비용으로만 쓰고 운영 DB에서는 쓰지 말 것. 앵커·감사기록을 남겨둔 채
--  상태만 되돌리고 싶으면 아래 3)~5) 블록을 지우면 된다 - 다시 발급해도 스냅샷
--  version_no 는 max+1 로 붙으므로 충돌하지 않는다(fn_create_dpp_snapshot).
-- ============================================================
\set ON_ERROR_STOP on
\set sku 'STEEL-40-1787496634757'

BEGIN;

-- 대상 DPP 고정. 임시 테이블에 담아 두고 아래에서 계속 쓴다 - 매번 조인하면
-- 중간에 status 를 바꾼 뒤로는 같은 조건이 다른 행을 가리킬 수 있다.
CREATE TEMP TABLE _target ON COMMIT DROP AS
SELECT d.dpp_id, d.model_id, d.public_uuid
  FROM dpp d
  JOIN product_model pm ON pm.model_id = d.model_id
 WHERE pm.internal_sku = :'sku'
   AND d.deleted_at IS NULL;

\echo '--- 대상 DPP ---'
SELECT t.dpp_id, pm.internal_sku, pm.model_name AS 제품명, d.display_name AS DPP이름,
       d.status, d.issued_at, d.completeness
  FROM _target t
  JOIN dpp d ON d.dpp_id = t.dpp_id
  JOIN product_model pm ON pm.model_id = t.model_id;

-- 대상이 정확히 1건이 아니면 여기서 멈춘다. 0건이면 sku 오타, 2건 이상이면
-- 같은 sku 가 중복된 것이라 어느 쪽을 되돌릴지 사람이 정해야 한다.
DO $$
DECLARE n INT;
BEGIN
    SELECT count(*) INTO n FROM _target;
    IF n <> 1 THEN
        RAISE EXCEPTION '대상 DPP가 %건입니다. internal_sku를 확인하세요.', n;
    END IF;
END $$;

\echo '--- 되돌리기 전 상태 ---'
SELECT (SELECT count(*) FROM customs_clearance c JOIN _target t ON t.dpp_id = c.dpp_id) AS 통관케이스,
       (SELECT count(*) FROM dpp_snapshot s JOIN _target t ON t.dpp_id = s.dpp_id)      AS 스냅샷,
       (SELECT count(*) FROM audit_log a JOIN _target t ON t.dpp_id = a.target_id
         WHERE a.target_type = 'DPP')                                                    AS 감사기록,
       (SELECT count(*) FROM scan_history h JOIN _target t ON t.dpp_id = h.dpp_id)      AS QR조회기록,
       (SELECT count(*) FROM dpp_field_value v JOIN _target t ON t.dpp_id = v.dpp_id)   AS 입력값_유지,
       (SELECT count(*) FROM document_link l JOIN _target t ON t.dpp_id = l.dpp_id)     AS 업로드문서_유지;

-- 1) 세관 심사 큐. dpp_snapshot 을 FK로 참조하므로 스냅샷보다 먼저 지운다.
DELETE FROM customs_clearance c
 USING _target t
 WHERE c.dpp_id = t.dpp_id;

-- 2) 지울 앵커를 미리 확보. blockchain_anchor.target_id 에는 FK가 없어서
--    스냅샷을 먼저 지우면 어느 앵커가 이 DPP 것이었는지 알 수 없게 된다.
CREATE TEMP TABLE _anchors ON COMMIT DROP AS
SELECT s.anchor_id
  FROM dpp_snapshot s
  JOIN _target t ON t.dpp_id = s.dpp_id
 WHERE s.anchor_id IS NOT NULL
UNION
SELECT a.anchor_id
  FROM blockchain_anchor a
 WHERE a.target_type = 'DPP_SNAPSHOT'
   AND a.target_id IN (SELECT s.snapshot_id FROM dpp_snapshot s JOIN _target t ON t.dpp_id = s.dpp_id);

-- 3) 스냅샷 (append-only 예외 - 위 주석 참고)
DELETE FROM dpp_snapshot s
 USING _target t
 WHERE s.dpp_id = t.dpp_id;

-- 4) 블록체인 앵커
DELETE FROM blockchain_anchor a
 USING _anchors x
 WHERE a.anchor_id = x.anchor_id;

-- 5) 감사기록 (append-only 예외). 남겨두면 EU 감사로그 화면에 지난 촬영분 발급
--    기록이 그대로 보인다.
DELETE FROM audit_log a
 USING _target t
 WHERE a.target_type = 'DPP'
   AND a.target_id = t.dpp_id;

-- 6) 지난 촬영 때 개인 계정으로 QR을 찍은 기록
DELETE FROM scan_history h
 USING _target t
 WHERE h.dpp_id = t.dpp_id;

-- 7) 본체. 발급 전 상태로. public_uuid 는 그대로 둔다 - 생성 시점에 받는 값이고,
--    바꾸면 이미 뽑아둔 QR/링크가 전부 죽는다(FieldFormService.createDraftDpp).
UPDATE dpp d
   SET status = 'DRAFT',
       issued_at = NULL
  FROM _target t
 WHERE d.dpp_id = t.dpp_id;

-- 완성도는 발급 여부와 무관하게 입력값 기준으로 다시 계산해 둔다.
SELECT fn_recalc_completeness(t.dpp_id) FROM _target t;

\echo '--- 되돌린 뒤 상태 ---'
SELECT d.dpp_id, d.status, d.issued_at, d.completeness, d.public_uuid,
       (SELECT count(*) FROM customs_clearance c WHERE c.dpp_id = d.dpp_id) AS 통관케이스,
       (SELECT count(*) FROM dpp_snapshot s WHERE s.dpp_id = d.dpp_id)      AS 스냅샷,
       (SELECT count(*) FROM dpp_field_value v WHERE v.dpp_id = d.dpp_id)   AS 입력값,
       (SELECT count(*) FROM document_link l WHERE l.dpp_id = d.dpp_id)     AS 업로드문서
  FROM dpp d JOIN _target t ON t.dpp_id = d.dpp_id;

\echo '--- 협력사 참여 상태(그대로 유지되어야 함) ---'
SELECT p.role_code, p.submit_status, p.accepted_at IS NOT NULL AS 수락됨,
       o.org_name
  FROM dpp_participant p
  JOIN _target t ON t.dpp_id = p.dpp_id
  LEFT JOIN organization o ON o.org_id = p.org_id;

COMMIT;
