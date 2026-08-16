-- 수동 실행용 테스트 시드 - Flyway 마이그레이션 아님, db/migration에 넣지 말 것.
--
-- *** 실행은 반드시 아래 방법으로만 (docker/ 디렉터리에서) ***
--   docker cp seed-test-pending-signups.sql dpp-postgres:/tmp/seed-test-pending-signups.sql
--   docker exec -i dpp-postgres psql -U dpp -d dpp -f /tmp/seed-test-pending-signups.sql
--
-- 로그인 계정 2개:
--   { "email": "pending-kr@sinheung-steel.test", "password": "Pending1234!" }
--   { "email": "pending-de@nordstahl.test",       "password": "Pending1234!" }
--
-- 지금까지 있던 seed-test-*.sql은 전부 organization.approval_status를 처음부터 'ACTIVE'로
-- 박아 넣어서(가입승인 기능이 없던 시절 만든 것들), 실제로 가입승인 화면(/admin/approvals)을
-- 방금 붙였는데도 관리자가 심사할 대기 건이 하나도 없었다. 이 두 조직은 여기서 일부러
-- approval_status 컬럼을 안 넣어서(기본값 PENDING) 대기중 탭에서 바로 승인/반려를
-- 눌러볼 수 있게 한다(2026-08-16). 참고: 이건 raw SQL INSERT라 OrganizationService.
-- findOrCreateForSignup의 사업자등록번호 체크섬 자동심사 코드 자체를 안 거친다 - 실제
-- 회원가입 폼(POST /auth/signup/business)으로 들어오는 신청 건에 대해서만 그 자동심사가
-- 동작한다. 국가는 굳이 KR/DE로 갈라뒀다 - 나중에 자동심사 로직을 눈으로 확인하고 싶으면
-- 이 두 조직이 아니라 실제 회원가입 폼에서 유효/무효 사업자등록번호로 테스트할 것.

INSERT INTO user_account (
    account_type, email, email_verified, password_hash,
    phone, phone_verified, credential_type,
    display_name, onboarding_step, status
) VALUES
    ('BUSINESS', 'pending-kr@sinheung-steel.test', TRUE,
     '$2b$10$KLwgz0BM6cGd0WcpzhoxYeOUqGcsy0VzozCZTXMWVDi8Hhh9UUFNy',
     '01099990010', TRUE, 'PASSWORD', '신흥특수강(테스트)', 'SIGNED_UP', 'ACTIVE'),
    ('BUSINESS', 'pending-de@nordstahl.test', TRUE,
     '$2b$10$KLwgz0BM6cGd0WcpzhoxYeOUqGcsy0VzozCZTXMWVDi8Hhh9UUFNy',
     '01099990011', TRUE, 'PASSWORD', 'Nordstahl GmbH(테스트)', 'SIGNED_UP', 'ACTIVE')
ON CONFLICT (email) WHERE deleted_at IS NULL DO NOTHING;

INSERT INTO organization (org_name, org_type, domain, country_code, biz_reg_no, tier_level, profile_status)
SELECT '신흥특수강(테스트)', 'MANUFACTURER', 'STEEL', 'KR', '123-45-67890', 2, 'APPROVED'
WHERE NOT EXISTS (SELECT 1 FROM organization WHERE org_name = '신흥특수강(테스트)');

INSERT INTO organization (org_name, org_type, domain, country_code, biz_reg_no, tier_level, profile_status)
SELECT 'Nordstahl GmbH(테스트)', 'MANUFACTURER', 'STEEL', 'DE', 'DE123456789', 2, 'APPROVED'
WHERE NOT EXISTS (SELECT 1 FROM organization WHERE org_name = 'Nordstahl GmbH(테스트)');

UPDATE user_account SET org_id = (SELECT org_id FROM organization WHERE org_name = '신흥특수강(테스트)')
WHERE email = 'pending-kr@sinheung-steel.test' AND org_id IS NULL;
UPDATE user_account SET org_id = (SELECT org_id FROM organization WHERE org_name = 'Nordstahl GmbH(테스트)')
WHERE email = 'pending-de@nordstahl.test' AND org_id IS NULL;

-- 확인용 조회 (approval_status가 둘 다 PENDING으로 보여야 정상)
SELECT u.email, o.org_name, o.country_code, o.biz_reg_no, o.approval_status
FROM user_account u JOIN organization o ON o.org_id = u.org_id
WHERE u.email IN ('pending-kr@sinheung-steel.test', 'pending-de@nordstahl.test');
