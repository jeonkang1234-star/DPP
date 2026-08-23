-- 데모용 계정 정리 (2026-08-23 강 요청 "여기 있는 계정 말고 다 삭제")
--
-- 사용법 (EC2에서):
--   docker cp cleanup-demo-accounts.sql dpp-postgres:/tmp/
--   docker exec -i dpp-postgres psql -U dpp -d dpp -f /tmp/cleanup-demo-accounts.sql
--
-- ── 설계 원칙 ─────────────────────────────────────────────────────────────
-- 1) 물리 삭제(DELETE)가 아니라 deleted_at 소프트 삭제다.
--    user_account는 dpp.created_by / notification / audit_log / scan_history 등
--    여러 곳에서 참조된다. 물리 삭제는 FK 위반으로 실패하거나, 성공하면 되돌릴 수
--    없다. 앱은 전부 `deleted_at IS NULL`로 필터하므로 화면에서는 완전히 사라지고,
--    잘못 지웠으면 아래 [복구] 쿼리 한 줄로 되돌린다.
--
-- 2) PERSONAL(SNS) 계정은 건드리지 않는다.
--    데모 때 구글 로그인으로 쓰실 계정이 섞여 있으면 로그인 자체가 깨진다.
--    목록만 출력하니 눈으로 보고 필요하면 개별로 처리할 것.
--
-- 3) organization은 건드리지 않는다.
--    seed-demo-registry.sql이 만든 가온스틸/블루셀/한올텍스타일은 "계정 없이
--    조직만 있는" 개인회원·EU 검색 데모용 데이터다. "사용자 없는 조직"을 지우면
--    그 데모가 통째로 날아간다. 역시 목록만 출력한다.
-- ─────────────────────────────────────────────────────────────────────────

BEGIN;

-- 유지할 계정 목록. 여기에 없는 BUSINESS/ADMIN 계정이 정리 대상이 된다.
CREATE TEMP TABLE keep_email(email TEXT PRIMARY KEY) ON COMMIT DROP;
INSERT INTO keep_email(email) VALUES
  ('ops@ieum.io'),                        -- 관리자
  ('gr.yoon@korea.kr'),                   -- EU(산업통상자원부)
  ('audit@zoll.de'),                      -- EU(Zoll)
  ('jw.han@customs.go.kr'),               -- 관세청(한국)
  ('inspector@douane.gouv.fr'),           -- 관세청(프랑스)
  ('steel-test@daesungsteel.test'),       -- 철강 제조사
  ('partner-test@woojinmetal.test'),      -- 철강 협력사
  ('testlab-test@krtest.test'),           -- 철강 협력사(시험)
  ('yj.choi@aratex.co.kr'),               -- 섬유 제조사
  ('partner-test@cheongwoo.test'),        -- 섬유 협력사
  ('sj.lee@lumencell.co.kr'),             -- 배터리 제조사
  ('testlab-test@krbattery.test'),        -- 배터리 협력사(시험)
  ('recycler-test@greenloop.test'),       -- 배터리 협력사(재활용)
  ('supplier-test@coreminerals.test'),    -- 배터리 협력사(원료)
  ('pending-kr@sinheung-steel.test'),     -- 가입승인 대기 데모(KR)
  ('pending-de@nordstahl.test');          -- 가입승인 대기 데모(DE)

\echo ''
\echo '=== [0] 유지 목록 중 DB에 없는 계정 (오타/미생성 확인용) ==='
SELECT k.email AS "DB에 없음"
  FROM keep_email k
 WHERE NOT EXISTS (SELECT 1 FROM user_account u
                    WHERE u.email = k.email AND u.deleted_at IS NULL);

\echo ''
\echo '=== [1] 이번에 소프트 삭제될 계정 (BUSINESS/ADMIN 중 유지 목록에 없는 것) ==='
SELECT u.user_id, u.email, u.account_type, o.org_name, o.org_type, o.approval_status,
       u.last_login_at
  FROM user_account u
  LEFT JOIN organization o ON o.org_id = u.org_id
 WHERE u.deleted_at IS NULL
   AND u.account_type IN ('BUSINESS','ADMIN')
   AND u.email NOT IN (SELECT email FROM keep_email)
 ORDER BY u.account_type, u.email;

-- ── 실행 ──
UPDATE user_account
   SET deleted_at = now(),
       updated_at = now()
 WHERE deleted_at IS NULL
   AND account_type IN ('BUSINESS','ADMIN')
   AND email NOT IN (SELECT email FROM keep_email);

\echo ''
\echo '=== [2] 정리 후 남은 BUSINESS/ADMIN 계정 ==='
SELECT u.user_id, u.email, u.account_type, o.org_name, o.org_type, o.approval_status
  FROM user_account u
  LEFT JOIN organization o ON o.org_id = u.org_id
 WHERE u.deleted_at IS NULL
   AND u.account_type IN ('BUSINESS','ADMIN')
 ORDER BY u.account_type, u.email;

\echo ''
\echo '=== [3] 참고: PERSONAL(SNS) 계정 - 건드리지 않았음 ==='
SELECT user_id, email, sns_provider, display_name, last_login_at
  FROM user_account
 WHERE deleted_at IS NULL AND account_type = 'PERSONAL'
 ORDER BY user_id;

\echo ''
\echo '=== [4] 참고: 조직 목록 - 건드리지 않았음 ==='
\echo '    활성계정=0 이면서 DPP가 있는 조직은 검색 데모용 시드 데이터다. 지우지 말 것.'
SELECT o.org_id, o.org_name, o.org_type, o.domain, o.approval_status,
       (SELECT COUNT(*) FROM user_account u
         WHERE u.org_id = o.org_id AND u.deleted_at IS NULL)          AS 활성계정,
       (SELECT COUNT(*) FROM dpp d
         WHERE d.owner_org_id = o.org_id AND d.deleted_at IS NULL)    AS DPP수
  FROM organization o
 WHERE o.deleted_at IS NULL
 ORDER BY o.org_id;

COMMIT;

-- ── [복구] 잘못 지웠을 때 ────────────────────────────────────────────────
-- 전체 되돌리기:
--   UPDATE user_account SET deleted_at = NULL
--    WHERE deleted_at >= now() - INTERVAL '1 hour';
-- 특정 계정만:
--   UPDATE user_account SET deleted_at = NULL WHERE email = 'someone@example.com';
