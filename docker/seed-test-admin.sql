-- 수동 실행용 테스트 시드 - Flyway 마이그레이션 아님, db/migration에 넣지 말 것.
--
-- *** 실행은 반드시 아래 방법으로만 (docker/ 디렉터리에서) ***
--   docker cp seed-test-admin.sql dpp-postgres:/tmp/seed-test-admin.sql
--   docker exec -i dpp-postgres psql -U dpp -d dpp -f /tmp/seed-test-admin.sql
-- (PowerShell 파이프로 넘기면 한글이 깨진다 - seed-test-manufacturer.sql 상단 설명 참고.
--  이 파일엔 한글이 없지만 다른 시드 파일들과 실행 방법을 통일해둔다.)
--
-- 로그인: POST /auth/login  { "email": "ops@ieum.io", "password": "Admin1234!" }
--
-- ADMIN 계정은 organization에 안 묶는다 - OrganizationService.ALLOWED_ORG_TYPES 주석대로
-- "ADMIN/CONSUMER는 개인 계정용이라" org_type 대상에서 아예 빠져 있고, org_id가 없어도
-- AdminOrgApprovalService는 user_account.account_type만 본다(2026-08-16).

INSERT INTO user_account (
    account_type, email, email_verified, password_hash,
    phone, phone_verified, credential_type,
    display_name, onboarding_step, status
) VALUES (
    'ADMIN', 'ops@ieum.io', TRUE,
    '$2b$10$WRjHdVWdy6Oz89XzStEim.4FRdfQbI5zIbwLYT0GiKKOU41q2bef2',
    '01099990000', TRUE, 'PASSWORD',
    'DPP 플랫폼 운영팀', 'SIGNED_UP', 'ACTIVE'
)
ON CONFLICT (email) WHERE deleted_at IS NULL DO NOTHING;

-- 확인용 조회
SELECT email, account_type, org_id, display_name FROM user_account WHERE email = 'ops@ieum.io';
