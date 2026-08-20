-- =====================================================================
-- 이미 발급된 DPP를 세관 심사 큐로 소급 연결 - 2026-08-20 강 리포트
--   "프랑스 관세청 계정으로 로그인하면 '심사를 기다리는 DPP'에 아무것도 보이지 않는다"
--
-- 원인이 두 가지 겹쳐 있었다.
--   (1) 발급 완료를 status='PENDING'으로 두던 시절에 만들어진 DPP들이 그대로 남아 있다.
--       그 상태를 ACTIVE로 올리는 코드가 어디에도 없어서 통관 신청 조건("ACTIVE인 DPP만")
--       을 영영 통과하지 못했다(FieldFormService.issue 주석 참고).
--   (2) 발급 시 자동 통관 접수(CustomsClearanceService.autoCreateOnIssue)는 2026-08-20에
--       붙인 것이라, 그 전에 발급된 DPP에는 customs_clearance 행이 아예 없다.
--
-- 이 마이그레이션은 두 가지를 소급 적용한다. 앞으로 발급되는 DPP는 발급 시점에 같은
-- 일이 자바 쪽에서 일어나므로 여기 로직과 결과가 같아야 한다 - 바꿀 때 같이 봐야 한다.
--
-- 수입국은 데모 전제상 프랑스(FR) 고정이다("모든 물건이 프랑스로 간다", 2026-08-20 강).
-- 실제 수출국은 DPP 소유 조직의 country_code를 그대로 쓴다.
-- =====================================================================

-- (1) 발급됐지만 PENDING에 머물러 있는 DPP를 ACTIVE로.
--     issued_at이 찍힌 행만 대상 - 발급을 누른 적 없는 초안(DRAFT)은 건드리지 않는다.
UPDATE dpp
   SET status = 'ACTIVE',
       updated_at = now()
 WHERE status = 'PENDING'
   AND issued_at IS NOT NULL
   AND deleted_at IS NULL;

-- (2) 통관 행이 하나도 없는 ACTIVE DPP마다, 매칭되는 세관 조직 수만큼 행을 만든다.
--     - EXPORT측: DPP 소유 조직의 country_code와 같은 나라의 CUSTOMS 조직
--     - IMPORT측: FR의 CUSTOMS 조직 (수출국이 이미 FR이면 IMPORT측은 만들지 않는다)
--     한 나라에 세관 조직이 여러 개면(예: 'Douane Lyon'과 '프랑스 관세청 Douane(테스트)')
--     자바 쪽 createSideRows와 똑같이 조직마다 한 행씩 만든다.
WITH target_dpp AS (
    SELECT d.dpp_id,
           o.country_code AS export_cc
      FROM dpp d
      JOIN organization o ON o.org_id = d.owner_org_id
     WHERE d.status = 'ACTIVE'
       AND d.deleted_at IS NULL
       AND o.country_code IS NOT NULL
       AND btrim(o.country_code) <> ''
       AND NOT EXISTS (SELECT 1 FROM customs_clearance c WHERE c.dpp_id = d.dpp_id)
),
sides AS (
    SELECT t.dpp_id, t.export_cc, 'EXPORT'::varchar AS side, t.export_cc AS match_cc
      FROM target_dpp t
    UNION ALL
    SELECT t.dpp_id, t.export_cc, 'IMPORT'::varchar AS side, 'FR'::char(2) AS match_cc
      FROM target_dpp t
     WHERE upper(btrim(t.export_cc)) <> 'FR'
)
INSERT INTO customs_clearance (
    dpp_id, customs_org_id, clearance_side,
    export_country_code, import_country_code,
    importer_name, requested_by_org_id, decision
)
SELECT s.dpp_id,
       co.org_id,
       s.side,
       upper(btrim(s.export_cc)),
       'FR',
       '발급 시 자동 생성 (수입업체 미정)',
       d.owner_org_id,
       'PENDING'
  FROM sides s
  JOIN dpp d ON d.dpp_id = s.dpp_id
  JOIN organization co
    ON co.org_type = 'CUSTOMS'
   AND co.deleted_at IS NULL
   AND co.approval_status = 'ACTIVE'
   AND upper(btrim(co.country_code)) = upper(btrim(s.match_cc));
