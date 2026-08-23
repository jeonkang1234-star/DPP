-- =====================================================================
-- 데모 계정만 남기고 전부 정리 + 같은 이메일로 재가입 가능하게 (2026-08-23 강 요청)
--
--   docker cp reset-to-demo-accounts.sql dpp-postgres:/tmp/
--   docker exec -i dpp-postgres psql -U dpp -d dpp -f /tmp/reset-to-demo-accounts.sql
--
-- ■ 왜 DELETE가 아니라 deleted_at인가
--   user_account는 audit_log / notification / document.uploaded_by / invitation.created_by
--   등 여러 테이블에서 ON DELETE 없이 참조된다. 물리 삭제는 FK 위반으로 실패하거나,
--   억지로 지우면 되돌릴 수 없다.
--
-- ■ 왜 이메일 뒤에 꼬리표를 붙이는가 (핵심)
--   BusinessSignupService의 중복 체크(existsByEmail)가 지금 배포본에서는 deleted_at을
--   보지 않는다. 그래서 소프트 삭제만 하면 "이미 가입된 이메일입니다"로 재가입이 막힌다
--   (ux_user_email 인덱스는 `WHERE deleted_at IS NULL` 부분 인덱스라 DB는 허용하는데
--   애플리케이션이 막는 상황). 코드는 별도로 고쳤지만 배포 전에도 동작해야 하므로,
--   여기서는 삭제된 행의 email 자체를 바꿔서 원래 주소를 비워 준다.
--   조직(organization) 쪽은 조회가 이미 AndDeletedAtIsNull이라 손댈 필요가 없다.
-- =====================================================================

BEGIN;

CREATE TEMP TABLE keep_email(email TEXT PRIMARY KEY) ON COMMIT DROP;
INSERT INTO keep_email(email) VALUES
  ('ops@ieum.io'),
  ('gr.yoon@korea.kr'),
  ('audit@zoll.de'),
  ('jw.han@customs.go.kr'),
  ('inspector@douane.gouv.fr'),
  ('steel-test@daesungsteel.test'),
  ('partner-test@woojinmetal.test'),
  ('testlab-test@krtest.test'),
  ('yj.choi@aratex.co.kr'),
  ('partner-test@cheongwoo.test'),
  ('sj.lee@lumencell.co.kr'),
  ('testlab-test@krbattery.test'),
  ('recycler-test@greenloop.test'),
  ('supplier-test@coreminerals.test'),
  ('pending-kr@sinheung-steel.test'),
  ('pending-de@nordstahl.test');

\echo ''
\echo '=== [0] 유지 목록 중 DB에 없는 계정 (오타/미생성 확인) ==='
SELECT k.email AS "DB에 없음"
  FROM keep_email k
 WHERE NOT EXISTS (SELECT 1 FROM user_account u
                    WHERE u.email = k.email AND u.deleted_at IS NULL);

\echo ''
\echo '=== [1] 삭제 대상 계정 (유지 목록에 없는 모든 계정) ==='
SELECT u.user_id, u.email, u.account_type, u.sns_provider, o.org_name, o.approval_status
  FROM user_account u
  LEFT JOIN organization o ON o.org_id = u.org_id
 WHERE u.deleted_at IS NULL
   AND u.email NOT IN (SELECT email FROM keep_email)
 ORDER BY u.account_type, u.email;

\echo ''
\echo '=== [2] 함께 삭제될 조직 (남는 계정이 하나도 없게 되는 조직) ==='
\echo '    주의: 활성계정 0인데 DPP가 있는 조직은 검색 데모용 시드다. 아래 목록에 나오면 안 된다.'
SELECT o.org_id, o.org_name, o.biz_reg_no, o.org_type,
       (SELECT COUNT(*) FROM dpp d WHERE d.owner_org_id = o.org_id AND d.deleted_at IS NULL) AS 보유DPP
  FROM organization o
 WHERE o.deleted_at IS NULL
   AND o.org_type NOT IN ('CUSTOMS', 'EU_AUTHORITY')
   AND EXISTS (SELECT 1 FROM user_account u
                WHERE u.org_id = o.org_id AND u.deleted_at IS NULL
                  AND u.email NOT IN (SELECT email FROM keep_email))
   AND NOT EXISTS (SELECT 1 FROM user_account u
                    WHERE u.org_id = o.org_id AND u.deleted_at IS NULL
                      AND u.email IN (SELECT email FROM keep_email));

-- ── 실행 ───────────────────────────────────────────────────────────────
-- (a) 계정이 하나도 안 남게 되는 조직을 먼저 소프트 삭제한다.
--     사업자등록번호를 비워 줘야 같은 번호로 다시 가입할 수 있다.
--
--     단 세관(CUSTOMS)·시장감독기관(EU_AUTHORITY) 조직은 제외한다.
--     이 조직들은 통관 케이스의 배정 대상(customs_clearance.customs_org_id)이라
--     지우면 큐 라우팅이 조용히 달라진다. 게다가 사업자등록번호가 없어서 지워도
--     비워지는 자리가 없다 - 삭제할 이득이 전혀 없고 잃을 것만 있다.
UPDATE organization o
   SET deleted_at = now(), updated_at = now()
 WHERE o.deleted_at IS NULL
   AND o.org_type NOT IN ('CUSTOMS', 'EU_AUTHORITY')
   AND EXISTS (SELECT 1 FROM user_account u
                WHERE u.org_id = o.org_id AND u.deleted_at IS NULL
                  AND u.email NOT IN (SELECT email FROM keep_email))
   AND NOT EXISTS (SELECT 1 FROM user_account u
                    WHERE u.org_id = o.org_id AND u.deleted_at IS NULL
                      AND u.email IN (SELECT email FROM keep_email));

-- (b) 계정 소프트 삭제 + 이메일 자리 비우기.
--     원래 주소는 email_note 대신 그대로 알아볼 수 있게 접미사만 붙인다.
UPDATE user_account u
   SET deleted_at = now(),
       updated_at = now(),
       email      = u.email || '.deleted.' || u.user_id,
       login_id   = CASE WHEN u.login_id IS NULL THEN NULL
                         ELSE u.login_id || '.deleted.' || u.user_id END,
       -- SNS 계정도 같은 구글 계정으로 새로 가입할 수 있게 연결을 끊는다.
       sns_subject = CASE WHEN u.sns_subject IS NULL THEN NULL
                          ELSE u.sns_subject || '.deleted.' || u.user_id END
 WHERE u.deleted_at IS NULL
   AND u.email NOT IN (SELECT email FROM keep_email);

\echo ''
\echo '=== [3] 정리 후 남은 계정 ==='
SELECT u.user_id, u.email, u.account_type, o.org_name, o.approval_status
  FROM user_account u
  LEFT JOIN organization o ON o.org_id = u.org_id
 WHERE u.deleted_at IS NULL
 ORDER BY u.account_type, u.email;

\echo ''
\echo '=== [4] 재가입 가능 여부 확인 (0 이어야 가입 가능) ==='
SELECT 'jeonkang1234@tukorea.ac.kr' AS 이메일,
       COUNT(*) AS 살아있는_계정수
  FROM user_account
 WHERE deleted_at IS NULL AND email = 'jeonkang1234@tukorea.ac.kr';

\echo ''
\echo '=== [5] 남은 조직 (검색 데모용 시드가 살아있는지 확인) ==='
SELECT o.org_id, o.org_name, o.org_type, o.biz_reg_no,
       (SELECT COUNT(*) FROM user_account u WHERE u.org_id = o.org_id AND u.deleted_at IS NULL) AS 활성계정,
       (SELECT COUNT(*) FROM dpp d WHERE d.owner_org_id = o.org_id AND d.deleted_at IS NULL)    AS 보유DPP
  FROM organization o
 WHERE o.deleted_at IS NULL
 ORDER BY o.org_id;

COMMIT;

-- ── 되돌리기 ───────────────────────────────────────────────────────────
--   UPDATE user_account
--      SET deleted_at = NULL,
--          email      = regexp_replace(email, '\.deleted\.[0-9]+$', ''),
--          login_id   = regexp_replace(login_id, '\.deleted\.[0-9]+$', ''),
--          sns_subject= regexp_replace(sns_subject, '\.deleted\.[0-9]+$', '')
--    WHERE deleted_at >= now() - INTERVAL '1 hour';
--   UPDATE organization SET deleted_at = NULL WHERE deleted_at >= now() - INTERVAL '1 hour';
