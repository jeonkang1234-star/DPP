-- =====================================================================
--  seed-demo-bulk.sql 로 넣은 보여주기용 대량 데이터 되돌리기
--
--  대상: seed-demo-bulk.sql 의 90개 조직(사업자/등록번호 기준)과 그 조직이
--        소유한 DPP, 그 조직 계정이 남긴 모든 흔적. 기존 16개 계정·과천제철 세트는
--        건드리지 않는다. 사진/문서 파일은 지우지 않는다(폴더째 지우면 된다:
--        docker/document-uploads/dpp-photos/demo, docker/document-uploads/demo-bulk).
--
--  실행 (docker/ 디렉터리에서):
--    docker cp cleanup-demo-bulk.sql dpp-postgres:/tmp/cleanup-demo-bulk.sql
--    docker exec -i dpp-postgres psql -U dpp -d dpp -f /tmp/cleanup-demo-bulk.sql
-- =====================================================================
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE c_org ON COMMIT DROP AS
SELECT org_id FROM organization WHERE contact_email IN (__EMAILS__);
CREATE TEMP TABLE c_user ON COMMIT DROP AS
SELECT user_id FROM user_account WHERE org_id IN (SELECT org_id FROM c_org);
CREATE TEMP TABLE c_dpp ON COMMIT DROP AS
SELECT dpp_id FROM dpp WHERE owner_org_id IN (SELECT org_id FROM c_org);
CREATE TEMP TABLE c_doc ON COMMIT DROP AS
SELECT document_id FROM document WHERE (owner_type = 'DPP' AND owner_id IN (SELECT dpp_id FROM c_dpp))
    OR submitted_by_org IN (SELECT org_id FROM c_org);
CREATE TEMP TABLE c_snap ON COMMIT DROP AS
SELECT snapshot_id FROM dpp_snapshot WHERE dpp_id IN (SELECT dpp_id FROM c_dpp);
CREATE TEMP TABLE c_zkp ON COMMIT DROP AS
SELECT proof_id FROM zkp_proof WHERE dpp_id IN (SELECT dpp_id FROM c_dpp) OR document_id IN (SELECT document_id FROM c_doc);

-- 감사 로그 / 앵커
DELETE FROM audit_log WHERE actor_org_id IN (SELECT org_id FROM c_org) OR actor_user_id IN (SELECT user_id FROM c_user)
   OR (target_type = 'ORGANIZATION' AND target_id IN (SELECT org_id FROM c_org))
   OR (target_type = 'DPP' AND target_id IN (SELECT dpp_id FROM c_dpp));
UPDATE dpp_snapshot SET anchor_id = NULL WHERE snapshot_id IN (SELECT snapshot_id FROM c_snap);
DELETE FROM lifecycle_event WHERE dpp_id IN (SELECT dpp_id FROM c_dpp) OR actor_org_id IN (SELECT org_id FROM c_org)
   OR actor_user_id IN (SELECT user_id FROM c_user);
DELETE FROM blockchain_anchor WHERE (target_type = 'DOCUMENT' AND target_id IN (SELECT document_id FROM c_doc))
   OR (target_type = 'EVENT' AND target_id IN (SELECT proof_id FROM c_zkp))
   OR (target_type = 'DPP_SNAPSHOT' AND target_id IN (SELECT snapshot_id FROM c_snap));

-- DPP 하위
DELETE FROM customs_clearance WHERE dpp_id IN (SELECT dpp_id FROM c_dpp) OR requested_by_org_id IN (SELECT org_id FROM c_org);
DELETE FROM registry_entry WHERE dpp_id IN (SELECT dpp_id FROM c_dpp);
DELETE FROM data_carrier WHERE dpp_id IN (SELECT dpp_id FROM c_dpp);
DELETE FROM scan_history WHERE dpp_id IN (SELECT dpp_id FROM c_dpp) OR user_id IN (SELECT user_id FROM c_user);
DELETE FROM compliance_check WHERE dpp_id IN (SELECT dpp_id FROM c_dpp);
DELETE FROM dpp_field_cross_check WHERE dpp_id IN (SELECT dpp_id FROM c_dpp) OR document_id IN (SELECT document_id FROM c_doc);
DELETE FROM zkp_proof WHERE proof_id IN (SELECT proof_id FROM c_zkp);
DELETE FROM dpp_snapshot WHERE snapshot_id IN (SELECT snapshot_id FROM c_snap);
UPDATE dpp_field_value SET source_document_id = NULL WHERE source_document_id IN (SELECT document_id FROM c_doc);
DELETE FROM dpp_field_value WHERE dpp_id IN (SELECT dpp_id FROM c_dpp);
-- 다른 회사 DPP에 이 조직들이 제출한 값/참여(시연 중 생겼을 수 있음)
DELETE FROM dpp_field_value WHERE submitted_by_org IN (SELECT org_id FROM c_org) OR submitted_by_user IN (SELECT user_id FROM c_user);
UPDATE material_composition SET source_document_id = NULL WHERE source_document_id IN (SELECT document_id FROM c_doc);
DELETE FROM material_composition WHERE dpp_id IN (SELECT dpp_id FROM c_dpp);
DELETE FROM document_review WHERE document_id IN (SELECT document_id FROM c_doc) OR reviewer_user_id IN (SELECT user_id FROM c_user);
DELETE FROM document_link WHERE document_id IN (SELECT document_id FROM c_doc) OR dpp_id IN (SELECT dpp_id FROM c_dpp);
DELETE FROM document_request WHERE dpp_id IN (SELECT dpp_id FROM c_dpp) OR target_org_id IN (SELECT org_id FROM c_org)
   OR requested_by IN (SELECT user_id FROM c_user);
DELETE FROM document WHERE document_id IN (SELECT document_id FROM c_doc);
DELETE FROM invitation WHERE dpp_id IN (SELECT dpp_id FROM c_dpp) OR inviter_org_id IN (SELECT org_id FROM c_org)
   OR accepted_org_id IN (SELECT org_id FROM c_org) OR created_by IN (SELECT user_id FROM c_user);
DELETE FROM dpp_participant WHERE dpp_id IN (SELECT dpp_id FROM c_dpp) OR org_id IN (SELECT org_id FROM c_org);
DELETE FROM dpp WHERE dpp_id IN (SELECT dpp_id FROM c_dpp);
DELETE FROM batch WHERE model_id IN (SELECT model_id FROM product_model WHERE org_id IN (SELECT org_id FROM c_org));
DELETE FROM product_model WHERE org_id IN (SELECT org_id FROM c_org);

-- 계정/조직
DELETE FROM notification WHERE recipient_org_id IN (SELECT org_id FROM c_org) OR recipient_user_id IN (SELECT user_id FROM c_user);
DELETE FROM notification_setting WHERE user_id IN (SELECT user_id FROM c_user);
DELETE FROM inquiry_message WHERE inquiry_id IN (SELECT inquiry_id FROM inquiry WHERE org_id IN (SELECT org_id FROM c_org)
                                                  OR created_by_user_id IN (SELECT user_id FROM c_user))
   OR sender_user_id IN (SELECT user_id FROM c_user);
DELETE FROM inquiry WHERE org_id IN (SELECT org_id FROM c_org) OR created_by_user_id IN (SELECT user_id FROM c_user);
DELETE FROM org_domain_grant WHERE org_id IN (SELECT org_id FROM c_org);
DELETE FROM tier_application WHERE org_id IN (SELECT org_id FROM c_org);
DELETE FROM facility WHERE org_id IN (SELECT org_id FROM c_org);
DELETE FROM user_role WHERE user_id IN (SELECT user_id FROM c_user);
DELETE FROM auth_token WHERE user_id IN (SELECT user_id FROM c_user);
DELETE FROM user_session WHERE user_id IN (SELECT user_id FROM c_user);
DELETE FROM login_history WHERE user_id IN (SELECT user_id FROM c_user);
DELETE FROM user_agreement WHERE user_id IN (SELECT user_id FROM c_user);
DELETE FROM user_sns_link WHERE user_id IN (SELECT user_id FROM c_user);
DELETE FROM oauth_state WHERE link_user_id IN (SELECT user_id FROM c_user);
DELETE FROM attachment WHERE uploaded_by IN (SELECT user_id FROM c_user);
UPDATE organization SET approved_by = NULL WHERE approved_by IN (SELECT user_id FROM c_user);
DELETE FROM user_account WHERE user_id IN (SELECT user_id FROM c_user);
DELETE FROM organization WHERE org_id IN (SELECT org_id FROM c_org);

COMMIT;

SELECT count(*) AS 남은_데모조직 FROM organization WHERE contact_email IN (__EMAILS__);
