-- 수동 실행용 테스트 시드 - Flyway 마이그레이션 아님, db/migration에 넣지 말 것.
--
-- *** 실행은 반드시 아래 방법으로만 (docker/ 디렉터리에서) ***
--   docker cp seed-test-eu-customs.sql dpp-postgres:/tmp/seed-test-eu-customs.sql
--   docker exec -i dpp-postgres psql -U dpp -d dpp -f /tmp/seed-test-eu-customs.sql
--
-- 로그인 계정 4개:
--   { "email": "gr.yoon@korea.kr",          "password": "EuGr1234!" }        (EU_AUTHORITY)
--   { "email": "audit@zoll.de",              "password": "EuZoll1234!" }      (EU_AUTHORITY)
--   { "email": "jw.han@customs.go.kr",       "password": "CustomsKr1234!" }   (CUSTOMS)
--   { "email": "inspector@douane.gouv.fr",   "password": "CustomsFr1234!" }   (CUSTOMS)
--
-- 넷 다 FE 역할 라우팅(FE/src/mocks/data.json accounts 맵)에 이미 이 이메일로 eu/customs가
-- 매핑돼 있다 - 여기서는 실제로 로그인 가능한 BUSINESS 계정을 DB에 채워 넣기만 한다.
-- 규제기관/세관은 자율신고 후 관리자 승인을 기다리는 일반 제조사 가입과 성격이 달라
-- (플랫폼이 직접 온보딩하는 기관 계정) approval_status를 PENDING이 아니라 ACTIVE로 바로
-- 넣는다 - 가입승인 대기열에는 안 뜬다(2026-08-16).

INSERT INTO organization (org_name, org_type, domain, country_code, biz_reg_no,
                           tier_level, profile_status, approval_status)
SELECT '대한민국 산업통상자원부(테스트)', 'EU_AUTHORITY', NULL, 'KR', NULL, 3, 'APPROVED', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM organization WHERE org_name = '대한민국 산업통상자원부(테스트)');

INSERT INTO organization (org_name, org_type, domain, country_code, biz_reg_no,
                           tier_level, profile_status, approval_status)
SELECT '독일 연방관세청 Zoll(테스트)', 'EU_AUTHORITY', NULL, 'DE', NULL, 3, 'APPROVED', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM organization WHERE org_name = '독일 연방관세청 Zoll(테스트)');

INSERT INTO organization (org_name, org_type, domain, country_code, biz_reg_no,
                           tier_level, profile_status, approval_status)
SELECT '대한민국 관세청(테스트)', 'CUSTOMS', NULL, 'KR', NULL, 3, 'APPROVED', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM organization WHERE org_name = '대한민국 관세청(테스트)');

INSERT INTO organization (org_name, org_type, domain, country_code, biz_reg_no,
                           tier_level, profile_status, approval_status)
SELECT '프랑스 관세청 Douane(테스트)', 'CUSTOMS', NULL, 'FR', NULL, 3, 'APPROVED', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM organization WHERE org_name = '프랑스 관세청 Douane(테스트)');

INSERT INTO user_account (
    account_type, email, email_verified, password_hash,
    phone, phone_verified, credential_type,
    display_name, onboarding_step, status
) VALUES
    ('BUSINESS', 'gr.yoon@korea.kr', TRUE,
     '$2b$10$uPuPRZzozvNMYd4TsJ80YuuQkh4FJ4wRB7J6Q4rb0Lco7ek4jccqe',
     '01099990001', TRUE, 'PASSWORD', '윤규리', 'SIGNED_UP', 'ACTIVE'),
    ('BUSINESS', 'audit@zoll.de', TRUE,
     '$2b$10$7RBAkxgiJBPJWhziuiP28.nGbEFJ1Dd53J6gKElja/yEN2Bl58AKq',
     '01099990002', TRUE, 'PASSWORD', 'Zoll Audit Team', 'SIGNED_UP', 'ACTIVE'),
    ('BUSINESS', 'jw.han@customs.go.kr', TRUE,
     '$2b$10$.P2FNBQZJwY/2FBCI486Gu3YfEdNfQ4mKdZrP13p8gbc2Y9sf/f9W',
     '01099990003', TRUE, 'PASSWORD', '한지원', 'SIGNED_UP', 'ACTIVE'),
    ('BUSINESS', 'inspector@douane.gouv.fr', TRUE,
     '$2b$10$N1yvC.tWPykwnzNge..T5.ob3zHLicahYGW/ySUzD.EHWvbmD4jr6',
     '01099990004', TRUE, 'PASSWORD', 'Douane Inspector', 'SIGNED_UP', 'ACTIVE')
ON CONFLICT (email) WHERE deleted_at IS NULL DO NOTHING;

UPDATE user_account SET org_id = (SELECT org_id FROM organization WHERE org_name = '대한민국 산업통상자원부(테스트)')
WHERE email = 'gr.yoon@korea.kr' AND org_id IS NULL;
UPDATE user_account SET org_id = (SELECT org_id FROM organization WHERE org_name = '독일 연방관세청 Zoll(테스트)')
WHERE email = 'audit@zoll.de' AND org_id IS NULL;
UPDATE user_account SET org_id = (SELECT org_id FROM organization WHERE org_name = '대한민국 관세청(테스트)')
WHERE email = 'jw.han@customs.go.kr' AND org_id IS NULL;
UPDATE user_account SET org_id = (SELECT org_id FROM organization WHERE org_name = '프랑스 관세청 Douane(테스트)')
WHERE email = 'inspector@douane.gouv.fr' AND org_id IS NULL;

-- 확인용 조회
SELECT u.email, u.account_type, o.org_name, o.org_type, o.approval_status
FROM user_account u JOIN organization o ON o.org_id = u.org_id
WHERE u.email IN ('gr.yoon@korea.kr', 'audit@zoll.de', 'jw.han@customs.go.kr', 'inspector@douane.gouv.fr');
