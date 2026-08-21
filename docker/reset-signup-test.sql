-- ============================================================
--  가입 테스트용 - 특정 이메일 계정과 그 조직을 통째로 지운다
--
--  아래 :'target' 값만 바꿔서 쓴다. psql -v 로 넘긴다.
--  DPP·문서까지 만든 계정도 지워진다(조직에 다른 사람이 없을 때만 조직까지).
--  운영 DB에서는 절대 쓰지 말 것.
-- ============================================================
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE _u AS
  SELECT user_id, org_id FROM user_account WHERE lower(email) = lower(:'target');

CREATE TEMP TABLE _o AS
  SELECT DISTINCT o.org_id
    FROM organization o
    JOIN _u ON _u.org_id = o.org_id
   WHERE NOT EXISTS (                    -- 그 조직에 남는 사람이 있으면 조직은 건드리지 않는다
     SELECT 1 FROM user_account u2
      WHERE u2.org_id = o.org_id AND u2.user_id NOT IN (SELECT user_id FROM _u));

\echo '--- 지울 대상 ---'
SELECT (SELECT count(*) FROM _u) AS users, (SELECT count(*) FROM _o) AS orgs;

-- 1) 조직이 소유한 DPP 계열부터 (자식 -> 부모 순서)
CREATE TEMP TABLE _d AS SELECT dpp_id FROM dpp WHERE owner_org_id IN (SELECT org_id FROM _o);

DELETE FROM customs_clearance  WHERE dpp_id IN (SELECT dpp_id FROM _d);
DELETE FROM registry_entry     WHERE dpp_id IN (SELECT dpp_id FROM _d);
DELETE FROM compliance_check   WHERE dpp_id IN (SELECT dpp_id FROM _d);
DELETE FROM zkp_proof          WHERE dpp_id IN (SELECT dpp_id FROM _d);
DELETE FROM lifecycle_event    WHERE dpp_id IN (SELECT dpp_id FROM _d);
DELETE FROM material_composition WHERE dpp_id IN (SELECT dpp_id FROM _d);
DELETE FROM dpp_field_value    WHERE dpp_id IN (SELECT dpp_id FROM _d);
DELETE FROM dpp_participant    WHERE dpp_id IN (SELECT dpp_id FROM _d);
DELETE FROM document_link      WHERE dpp_id IN (SELECT dpp_id FROM _d);
DELETE FROM data_carrier       WHERE dpp_id IN (SELECT dpp_id FROM _d);
DELETE FROM scan_history       WHERE dpp_id IN (SELECT dpp_id FROM _d);
DELETE FROM invitation         WHERE dpp_id IN (SELECT dpp_id FROM _d);
UPDATE dpp_snapshot SET anchor_id = NULL WHERE dpp_id IN (SELECT dpp_id FROM _d);
DELETE FROM blockchain_anchor
 WHERE target_type = 'DPP_SNAPSHOT'
   AND target_id IN (SELECT snapshot_id FROM dpp_snapshot WHERE dpp_id IN (SELECT dpp_id FROM _d));
DELETE FROM dpp_snapshot       WHERE dpp_id IN (SELECT dpp_id FROM _d);
DELETE FROM dpp                WHERE dpp_id IN (SELECT dpp_id FROM _d);

-- 2) 조직이 올린 문서/제품/설비
DELETE FROM document_review WHERE document_id IN
  (SELECT document_id FROM document WHERE submitted_by_org IN (SELECT org_id FROM _o));
DELETE FROM document_link   WHERE document_id IN
  (SELECT document_id FROM document WHERE submitted_by_org IN (SELECT org_id FROM _o));
DELETE FROM document        WHERE submitted_by_org IN (SELECT org_id FROM _o);
DELETE FROM batch           WHERE model_id IN
  (SELECT model_id FROM product_model WHERE org_id IN (SELECT org_id FROM _o));
DELETE FROM product_model   WHERE org_id IN (SELECT org_id FROM _o);
DELETE FROM facility        WHERE org_id IN (SELECT org_id FROM _o);
DELETE FROM tier_application WHERE org_id IN (SELECT org_id FROM _o);
DELETE FROM document_request WHERE target_org_id IN (SELECT org_id FROM _o);
DELETE FROM customs_clearance WHERE customs_org_id IN (SELECT org_id FROM _o)
                                 OR requested_by_org_id IN (SELECT org_id FROM _o);
DELETE FROM invitation      WHERE inviter_org_id IN (SELECT org_id FROM _o)
                               OR accepted_org_id IN (SELECT org_id FROM _o);
DELETE FROM dpp_participant WHERE org_id IN (SELECT org_id FROM _o);

-- 3) 사용자에 붙은 것들
DELETE FROM notification       WHERE recipient_user_id IN (SELECT user_id FROM _u);
DELETE FROM notification_setting WHERE user_id IN (SELECT user_id FROM _u);
DELETE FROM user_role          WHERE user_id IN (SELECT user_id FROM _u)
                                  OR granted_by IN (SELECT user_id FROM _u);
DELETE FROM user_sns_link      WHERE user_id IN (SELECT user_id FROM _u);
DELETE FROM user_agreement     WHERE user_id IN (SELECT user_id FROM _u);
DELETE FROM login_history      WHERE user_id IN (SELECT user_id FROM _u);
DELETE FROM user_session       WHERE user_id IN (SELECT user_id FROM _u);
DELETE FROM auth_token         WHERE user_id IN (SELECT user_id FROM _u);
DELETE FROM scan_history       WHERE user_id IN (SELECT user_id FROM _u);
DELETE FROM oauth_state        WHERE link_user_id IN (SELECT user_id FROM _u);
DELETE FROM attachment         WHERE uploaded_by IN (SELECT user_id FROM _u);
DELETE FROM invitation         WHERE created_by IN (SELECT user_id FROM _u);
UPDATE organization SET approved_by = NULL WHERE approved_by IN (SELECT user_id FROM _u);
UPDATE audit_log SET actor_user_id = NULL WHERE actor_user_id IN (SELECT user_id FROM _u);
UPDATE audit_log SET actor_org_id  = NULL WHERE actor_org_id  IN (SELECT org_id  FROM _o);

DELETE FROM user_account WHERE user_id IN (SELECT user_id FROM _u);

-- 4) 조직 첨부파일 + 조직
DELETE FROM attachment  WHERE owner_type = 'ORGANIZATION' AND owner_id IN (SELECT org_id FROM _o);
DELETE FROM organization WHERE org_id IN (SELECT org_id FROM _o);

-- 5) 인증 이력 (같은 주소로 다시 인증받을 수 있게)
DELETE FROM email_verification WHERE lower(email) = lower(:'target');
DELETE FROM phone_verification;    -- 60초 쿨다운도 같이 풀린다

COMMIT;

\echo '--- 남아있으면 실패 (0 rows 여야 정상) ---'
SELECT email FROM user_account WHERE lower(email) = lower(:'target');
