-- ============================================================
--  세관 통관 큐를 지금 DB 상태 그대로 다시 만든다.
--
--  왜 필요한가: 통관 케이스는 DPP를 발급하는 순간, 그때 ACTIVE인 세관 조직에게만 배정된다.
--  그동안 시드로 넣은 데모 계정·데모 DPP가 쌓이고 세관 계정을 새로 만들기를 반복하면서,
--  큐에는 (a) 지금은 존재하지 않는/관심 없는 옛 케이스와 (b) 새 세관 계정이 못 보는
--  최신 DPP가 섞이게 된다. 이 스크립트는 큐를 통째로 비우고, 현재 ACTIVE인 DPP와
--  현재 ACTIVE인 세관 조직만으로 다시 만든다.
--
--  실행:
--    docker cp docker/reset-customs-queue.sql dpp-postgres:/tmp/rq.sql
--    docker exec -it dpp-postgres psql -U dpp -d dpp -f /tmp/rq.sql
--
--  주의: 이미 내려진 통관 판정(승인/보류/반려)도 같이 사라진다. 데모 준비용이고
--  운영 DB에서는 쓰지 말 것.
-- ============================================================
\set ON_ERROR_STOP on
BEGIN;

\echo '--- 지우기 전 ---'
SELECT co.org_name AS 세관, cc.decision, count(*)
  FROM customs_clearance cc
  LEFT JOIN organization co ON co.org_id = cc.customs_org_id
 GROUP BY 1, 2 ORDER BY 1, 2;

DELETE FROM customs_clearance;

-- 발급 완료(ACTIVE)된 DPP만 대상. 수출측은 소유 조직의 국가, 수입측은 데모 기본값 FR
-- (CustomsClearanceService.DEMO_DEFAULT_IMPORT_COUNTRY와 같은 전제).
WITH target_dpp AS (
    SELECT d.dpp_id, d.owner_org_id, upper(btrim(o.country_code))::char(2) AS export_cc
      FROM dpp d
      JOIN organization o ON o.org_id = d.owner_org_id
     WHERE d.status = 'ACTIVE'
       AND d.deleted_at IS NULL
       AND o.country_code IS NOT NULL
       AND btrim(o.country_code) <> ''
),
sides AS (
    SELECT t.dpp_id, t.owner_org_id, t.export_cc, 'EXPORT'::varchar AS side, t.export_cc AS match_cc
      FROM target_dpp t
    UNION ALL
    SELECT t.dpp_id, t.owner_org_id, t.export_cc, 'IMPORT'::varchar AS side, 'FR'::char(2) AS match_cc
      FROM target_dpp t
     WHERE t.export_cc <> 'FR'
)
INSERT INTO customs_clearance (
    dpp_id, customs_org_id, clearance_side,
    export_country_code, import_country_code,
    importer_name, requested_by_org_id, decision
)
SELECT s.dpp_id,
       co.org_id,
       s.side,
       s.export_cc,
       'FR',
       '발급 시 자동 생성 (수입업체 미정)',
       s.owner_org_id,
       'PENDING'
  FROM sides s
  JOIN organization co
    ON co.org_type = 'CUSTOMS'
   AND co.deleted_at IS NULL
   AND co.approval_status = 'ACTIVE'
   AND upper(btrim(co.country_code)) = s.match_cc;

COMMIT;

\echo '--- 다시 만든 뒤 (세관 계정별 대기 건수) ---'
SELECT co.org_name AS 세관, co.country_code AS 국가, count(*) AS 대기건수
  FROM customs_clearance cc
  JOIN organization co ON co.org_id = cc.customs_org_id
 WHERE cc.decision = 'PENDING'
 GROUP BY 1, 2 ORDER BY 1;

\echo '--- 배정된 DPP 목록 ---'
SELECT co.org_name AS 세관, cc.clearance_side AS 심사측, d.dpp_id, pm.model_name
  FROM customs_clearance cc
  JOIN organization co ON co.org_id = cc.customs_org_id
  JOIN dpp d ON d.dpp_id = cc.dpp_id
  LEFT JOIN product_model pm ON pm.model_id = d.model_id
 ORDER BY co.org_name, d.dpp_id;
