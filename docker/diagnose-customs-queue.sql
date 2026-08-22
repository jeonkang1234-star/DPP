-- ============================================================
--  "DPP를 완성했는데 세관 화면에 안 뜬다"의 원인을 짚는다.
--
--  실행:
--    docker cp docker/diagnose-customs-queue.sql dpp-postgres:/tmp/dq.sql
--    docker exec -it dpp-postgres psql -U dpp -d dpp -f /tmp/dq.sql
--
--  배정 규칙(CustomsClearanceService): DPP 발급 순간, 수출국(= DPP 소유 조직의 country_code)
--  과 country_code가 같고 approval_status='ACTIVE'인 CUSTOMS 조직에게만 행이 생긴다.
--  수입측은 데모 전제상 FR 고정.
-- ============================================================
\pset format wrapped

\echo '[1] 세관 계정 - approval_status가 ACTIVE여야 하고 country_code가 채워져 있어야 한다'
SELECT org_id, org_name, country_code, approval_status, created_at
  FROM organization
 WHERE org_type = 'CUSTOMS' AND deleted_at IS NULL
 ORDER BY created_at DESC;

\echo ''
\echo '[2] 발급 완료 DPP와 그 수출국 - 위 [1]의 country_code와 일치해야 배정된다'
SELECT d.dpp_id, o.org_name AS 소유조직, o.country_code AS 수출국,
       d.domain, d.status, d.issued_at
  FROM dpp d JOIN organization o ON o.org_id = d.owner_org_id
 WHERE d.status = 'ACTIVE' AND d.deleted_at IS NULL
 ORDER BY d.issued_at DESC NULLS LAST
 LIMIT 15;

\echo ''
\echo '[3] 실제로 만들어진 통관 케이스 - customs_org_id가 NULL이면 "관할 세관 없음"으로 남은 것'
SELECT cc.clearance_id, cc.dpp_id, cc.clearance_side AS 심사측,
       cc.export_country_code AS 수출국, cc.import_country_code AS 수입국,
       COALESCE(co.org_name, '(배정 안 됨)') AS 배정세관, cc.decision, cc.created_at
  FROM customs_clearance cc
  LEFT JOIN organization co ON co.org_id = cc.customs_org_id
 ORDER BY cc.created_at DESC
 LIMIT 20;

\echo ''
\echo '[4] 진단 요약'
SELECT
  (SELECT count(*) FROM organization WHERE org_type='CUSTOMS' AND approval_status='ACTIVE' AND deleted_at IS NULL) AS 활성세관수,
  (SELECT count(*) FROM dpp WHERE status='ACTIVE' AND deleted_at IS NULL) AS 발급완료DPP수,
  (SELECT count(*) FROM customs_clearance) AS 통관케이스수,
  (SELECT count(*) FROM customs_clearance WHERE customs_org_id IS NULL) AS 미배정케이스수,
  (SELECT count(*) FROM customs_clearance WHERE decision='PENDING' AND customs_org_id IS NOT NULL) AS 대기중케이스수;

\echo ''
\echo '판정:'
\echo '  활성세관수=0        -> 세관 계정이 아직 관리자 승인 전이다. 회원 관리에서 승인할 것.'
\echo '  미배정케이스수>0    -> 발급 시점에 관할 세관이 없었다. reset-customs-queue.sql로 재배정.'
\echo '  통관케이스수=0      -> 발급 자체가 통관 생성을 안 탔다. 백엔드 로그에서 "발급 자동 통관" 검색.'
\echo '  [1]과 [2]의 국가코드가 다르면 -> 그래서 매칭이 안 된 것. 조직 country_code를 맞출 것.'
