-- 철강 협력사 테스트 계정(partner-test@woojinmetal.test / Partner1234!) 로그인 복구 (2026-10-04)
--
-- 원인: 2026-10-01 remap-partner-emails.sql 이 RAW_SUPPLIER/TEST_LAB/RECYCLER 등 협력사 계정
--   이메일을 jeonkang1234+t<번호>@tukorea.ac.kr 로 일괄 변경했다(실제 메일 수신 테스트용).
--   이 계정도 그 대상(org_type=RAW_SUPPLIER)이라 로그인 이메일 자체가 바뀌어 "이메일 또는
--   비밀번호가 올바르지 않습니다"가 난다. 이 스크립트는 이 계정 하나만 원래 이메일로 되돌리고
--   (다른 협력사 리매핑은 그대로 둔다), 비밀번호/상태/잠금도 같이 정상화한다.
--
-- 실행 (docker/ 에서, PowerShell 파이프 금지 - 한글 깨짐):
--   docker cp fix-woojin-partner-login.sql dpp-postgres:/tmp/fix-woojin.sql
--   docker exec -i dpp-postgres psql -U dpp -d dpp -f /tmp/fix-woojin.sql
\set ON_ERROR_STOP on

-- 0) 진단: 지금 상태
SELECT 'before' AS t, u.user_id, u.email, u.status, u.deleted_at, u.failed_login_count, u.locked_until, o.org_name, o.org_type, o.approval_status
  FROM user_account u LEFT JOIN organization o ON o.org_id = u.org_id
 WHERE u.email ILIKE '%woojinmetal%' OR o.org_name LIKE '우진메탈%';

BEGIN;
DO $$
DECLARE
  v_uid BIGINT;
  v_new TEXT;
  v_old CONSTANT TEXT := 'partner-test@woojinmetal.test';
BEGIN
  IF to_regclass('public.demo_email_remap') IS NOT NULL THEN
    SELECT user_id, new_email INTO v_uid, v_new FROM demo_email_remap WHERE lower(old_email) = v_old;
    IF v_uid IS NOT NULL THEN
      UPDATE user_account     SET email = v_old WHERE user_id = v_uid AND email = v_new;
      UPDATE invitation       SET invitee_email = v_old WHERE invitee_email = v_new;
      UPDATE dpp_participant  SET guest_email   = v_old WHERE guest_email   = v_new;
      UPDATE dpp_field_value  SET guest_email   = v_old WHERE guest_email   = v_new;
      UPDATE document         SET guest_email   = v_old WHERE guest_email   = v_new;
      UPDATE document_request SET target_email  = v_old WHERE target_email  = v_new;
      DELETE FROM demo_email_remap WHERE user_id = v_uid;
      RAISE NOTICE '리매핑 되돌림: % -> %', v_new, v_old;
    END IF;
  END IF;
END $$;

-- 비밀번호(Partner1234!) / 상태 / 잠금 정상화 - seed-test-partner.sql 과 같은 해시
UPDATE user_account
   SET password_hash = '$2b$10$k5xkznVAHUdjjn4Cwa/gI.Afm.yTEej260ZyXKX49RnIhKIZwZcWm',
       credential_type = 'PASSWORD', status = 'ACTIVE',
       failed_login_count = 0, locked_until = NULL, email_verified = TRUE
 WHERE email = 'partner-test@woojinmetal.test' AND deleted_at IS NULL;

UPDATE organization o SET approval_status = 'ACTIVE'
  FROM user_account u
 WHERE u.email = 'partner-test@woojinmetal.test' AND u.org_id = o.org_id;
COMMIT;

SELECT 'after' AS t, u.user_id, u.email, u.status, u.failed_login_count, u.locked_until, o.org_name, o.org_type, o.approval_status
  FROM user_account u LEFT JOIN organization o ON o.org_id = u.org_id
 WHERE u.email = 'partner-test@woojinmetal.test';
