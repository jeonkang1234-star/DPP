-- =====================================================================
-- 데모용: 테스트 제조사의 DPP를 "발급 완료"로 만들어 세관 심사 큐를 채운다
--   2026-08-20 강 요청 - "프랑스 관세청 계정으로 로그인하면 심사를 기다리는 DPP에
--   아무것도 보이지 않는데, 완성된 DPP 중 몇 개를 프랑스 관세청과 엮어서 보이게 해줘"
--
-- V24 마이그레이션은 "이미 발급을 눌렀던" DPP만 소급 처리한다. 시드로 만들어진 빈
-- 초안(DRAFT)까지 자동으로 발급 처리하면 사용자가 작성 중이던 초안을 멋대로 발급해
-- 버리는 셈이라 마이그레이션에서는 절대 하지 않는다. 그래서 이 파일은 마이그레이션이
-- 아니라 수동 시드로 분리했다 - 데모 데이터를 원할 때만 직접 돌린다.
--
-- 적용:
--   docker cp docker/seed-demo-customs-queue.sql dpp-postgres:/tmp/s.sql
--   docker exec dpp-postgres psql -U dpp -d dpp -f /tmp/s.sql
--   (PowerShell에서 Get-Content | docker exec 파이프는 쓰지 말 것 - 한글이 깨진다)
--
-- 대상은 조직명이 '(테스트)'로 끝나는 제조사의 DRAFT DPP뿐이다. 실제로 작업 중인
-- 초안은 건드리지 않는다. 여러 번 돌려도 결과는 같다(이미 ACTIVE거나 통관 행이 있으면
-- 건너뛴다).
-- =====================================================================

-- 1) 테스트 제조사의 DRAFT DPP를 발급 완료 상태로.
--    fn_create_dpp_snapshot이 스냅샷 + MOCK 블록체인 앵커를 같이 만들어 준다
--    (FieldFormService.issue가 발급 때 하는 일과 같다).
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT d.dpp_id
          FROM dpp d
          JOIN organization o ON o.org_id = d.owner_org_id
         WHERE d.status = 'DRAFT'
           AND d.deleted_at IS NULL
           AND o.org_type = 'MANUFACTURER'
           AND o.org_name LIKE '%(테스트)'
         ORDER BY d.dpp_id
    LOOP
        UPDATE dpp
           SET status = 'ACTIVE',
               issued_at = COALESCE(issued_at, now()),
               updated_at = now()
         WHERE dpp_id = r.dpp_id;
        PERFORM fn_create_dpp_snapshot(r.dpp_id, 'ISSUE', NULL, true);
    END LOOP;
END $$;

-- 2) 통관 행이 없는 ACTIVE DPP를 수출측(소유 조직 국가)·수입측(FR) 세관에 배정.
--    V24와 같은 로직이다 - 한쪽을 고치면 다른 쪽도 같이 고쳐야 한다.
WITH target_dpp AS (
    SELECT d.dpp_id, o.country_code AS export_cc
      FROM dpp d
      JOIN organization o ON o.org_id = d.owner_org_id
     WHERE d.status = 'ACTIVE'
       AND d.deleted_at IS NULL
       AND o.country_code IS NOT NULL
       AND btrim(o.country_code) <> ''
       AND NOT EXISTS (SELECT 1 FROM customs_clearance c WHERE c.dpp_id = d.dpp_id)
),
sides AS (
    SELECT t.dpp_id, t.export_cc, 'EXPORT'::varchar AS side, t.export_cc AS match_cc FROM target_dpp t
    UNION ALL
    SELECT t.dpp_id, t.export_cc, 'IMPORT'::varchar AS side, 'FR'::char(2) AS match_cc
      FROM target_dpp t WHERE upper(btrim(t.export_cc)) <> 'FR'
)
INSERT INTO customs_clearance (
    dpp_id, customs_org_id, clearance_side,
    export_country_code, import_country_code,
    importer_name, requested_by_org_id, decision
)
SELECT s.dpp_id, co.org_id, s.side,
       upper(btrim(s.export_cc)), 'FR',
       '발급 시 자동 생성 (수입업체 미정)',
       d.owner_org_id, 'PENDING'
  FROM sides s
  JOIN dpp d ON d.dpp_id = s.dpp_id
  JOIN organization co
    ON co.org_type = 'CUSTOMS'
   AND co.deleted_at IS NULL
   AND co.approval_status = 'ACTIVE'
   AND upper(btrim(co.country_code)) = upper(btrim(s.match_cc));

-- 3) 결과 확인용 (psql로 직접 돌리면 표가 찍힌다)
SELECT o.org_name AS 세관, c.clearance_side AS 구분, count(*) AS 대기건수
  FROM customs_clearance c
  JOIN organization o ON o.org_id = c.customs_org_id
 WHERE c.decision = 'PENDING'
 GROUP BY 1, 2
 ORDER BY 1, 2;
