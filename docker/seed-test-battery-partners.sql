-- 수동 실행용 테스트 시드 - Flyway 마이그레이션 아님, db/migration에 넣지 말 것.
-- 배터리(BATTERY) 도메인 협력사 3종 테스트 계정 - seed-test-testlab.sql(철강 TEST_LAB
-- 직접연결 패턴)과 seed-test-textile-partner.sql(섬유 RAW_SUPPLIER 직접연결 패턴)을
-- 그대로 합쳐서 한 파일에 담았다. 셋 다 "먼저 초대를 보내둬야" 하는 전제 없이
-- user_account/organization/dpp_participant/invitation을 한 번에 만들고 이미
-- 연결(ACCEPTED)까지 끝낸 상태로 시딩한다.
--
-- *** 실행 전제: seed-test-battery-manufacturer.sql을 먼저 실행해서 루멘셀(테스트)
-- 조직과 그 DPP(BATT-NMC75-TEST)가 이미 있어야 한다. ***
--
-- *** 실행은 반드시 아래 방법으로만 (docker/ 디렉터리에서) ***
--   docker cp seed-test-battery-partners.sql dpp-postgres:/tmp/seed-test-battery-partners.sql
--   docker exec -i dpp-postgres psql -U dpp -d dpp -f /tmp/seed-test-battery-partners.sql
--
-- *** 절대 PowerShell 파이프(Get-Content | docker exec ...)로 실행하지 말 것 ***
-- (콘솔 코드페이지 재인코딩으로 한글이 깨짐 - seed-test-manufacturer.sql 헤더 참고)
--
-- 로그인 계정 3개:
--   시험·인증기관(TEST_LAB, 배터리 탄소발자국 선언 담당):
--     { "email": "testlab-test@krbattery.test", "password": "Testlab2Batt!" }
--   재활용 처리업체(RECYCLER, 재활용 처리 결과 보고서 담당):
--     { "email": "recycler-test@greenloop.test", "password": "Recycler1234!" }
--   원자재·화학 공급사(RAW_SUPPLIER, 공급망 실사 보고서 담당):
--     { "email": "supplier-test@coreminerals.test", "password": "RawSupply123!" }
--
-- 셋 다 로그인 후 FE 역할 라우팅(FE/src/mocks/data.json accounts 맵)에서 "partner"로
-- 매핑돼야 한다 - 이 세션에서 이미 추가해뒀음.

-- ── 1) 한국배터리시험인증(테스트) - TEST_LAB ──────────────────────────
INSERT INTO user_account (
    account_type, email, email_verified, password_hash,
    phone, phone_verified, credential_type,
    display_name, onboarding_step, status
) VALUES (
    'BUSINESS', 'testlab-test@krbattery.test', TRUE,
    '$2b$10$ZWLb24MNr1xkif.rdQnv/erTRBps6fxgofgIMJVucwhgan8L4L1Su', -- Testlab2Batt!
    '01000000004', TRUE, 'PASSWORD',
    '한국배터리시험인증(테스트)', 'SIGNED_UP', 'ACTIVE'
)
ON CONFLICT (email) WHERE deleted_at IS NULL DO NOTHING;

INSERT INTO organization (org_name, org_type, domain, country_code, biz_reg_no,
                           tier_level, profile_status, approval_status)
SELECT '한국배터리시험인증(테스트)', 'TEST_LAB', 'BATTERY', 'KR', '333-22-33333',
       2, 'APPROVED', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM organization WHERE org_name = '한국배터리시험인증(테스트)');

UPDATE user_account
SET org_id = (SELECT org_id FROM organization WHERE org_name = '한국배터리시험인증(테스트)')
WHERE email = 'testlab-test@krbattery.test' AND org_id IS NULL;

INSERT INTO dpp_participant (dpp_id, org_id, role_code, submit_status)
SELECT d.dpp_id,
       (SELECT org_id FROM organization WHERE org_name = '한국배터리시험인증(테스트)'),
       'TEST_LAB', 'INVITED'
FROM dpp d
JOIN product_model m ON m.model_id = d.model_id
WHERE m.internal_sku = 'BATT-NMC75-TEST'
  AND NOT EXISTS (
      SELECT 1 FROM dpp_participant p
       WHERE p.dpp_id = d.dpp_id
         AND p.org_id = (SELECT org_id FROM organization WHERE org_name = '한국배터리시험인증(테스트)')
         AND p.role_code = 'TEST_LAB'
  );

INSERT INTO invitation (inviter_org_id, invitee_email, invitee_org_name, role_code, token,
                        status, accepted_org_id, dpp_id, expires_at, accepted_at)
SELECT (SELECT org_id FROM organization WHERE org_name = '루멘셀(테스트)'),
       'testlab-test@krbattery.test', '한국배터리시험인증(테스트)', 'TEST_LAB',
       md5(random()::text || clock_timestamp()::text),
       'ACCEPTED',
       (SELECT org_id FROM organization WHERE org_name = '한국배터리시험인증(테스트)'),
       d.dpp_id, now() + interval '30 days', now()
FROM dpp d
JOIN product_model m ON m.model_id = d.model_id
WHERE m.internal_sku = 'BATT-NMC75-TEST'
  AND NOT EXISTS (
      SELECT 1 FROM invitation i
       WHERE i.invitee_email = 'testlab-test@krbattery.test' AND i.dpp_id = d.dpp_id
  );

-- ── 2) 그린루프리사이클(테스트) - RECYCLER ────────────────────────────
INSERT INTO user_account (
    account_type, email, email_verified, password_hash,
    phone, phone_verified, credential_type,
    display_name, onboarding_step, status
) VALUES (
    'BUSINESS', 'recycler-test@greenloop.test', TRUE,
    '$2b$10$t89UVU2iwoqMcbAWwnLYjuMoM.hnefLIyVMVnhTddKWd91CRAHzjq', -- Recycler1234!
    '01000000005', TRUE, 'PASSWORD',
    '그린루프리사이클(테스트)', 'SIGNED_UP', 'ACTIVE'
)
ON CONFLICT (email) WHERE deleted_at IS NULL DO NOTHING;

INSERT INTO organization (org_name, org_type, domain, country_code, biz_reg_no,
                           tier_level, profile_status, approval_status)
SELECT '그린루프리사이클(테스트)', 'RECYCLER', 'BATTERY', 'KR', '444-22-44444',
       2, 'APPROVED', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM organization WHERE org_name = '그린루프리사이클(테스트)');

UPDATE user_account
SET org_id = (SELECT org_id FROM organization WHERE org_name = '그린루프리사이클(테스트)')
WHERE email = 'recycler-test@greenloop.test' AND org_id IS NULL;

INSERT INTO dpp_participant (dpp_id, org_id, role_code, submit_status)
SELECT d.dpp_id,
       (SELECT org_id FROM organization WHERE org_name = '그린루프리사이클(테스트)'),
       'RECYCLER', 'INVITED'
FROM dpp d
JOIN product_model m ON m.model_id = d.model_id
WHERE m.internal_sku = 'BATT-NMC75-TEST'
  AND NOT EXISTS (
      SELECT 1 FROM dpp_participant p
       WHERE p.dpp_id = d.dpp_id
         AND p.org_id = (SELECT org_id FROM organization WHERE org_name = '그린루프리사이클(테스트)')
         AND p.role_code = 'RECYCLER'
  );

INSERT INTO invitation (inviter_org_id, invitee_email, invitee_org_name, role_code, token,
                        status, accepted_org_id, dpp_id, expires_at, accepted_at)
SELECT (SELECT org_id FROM organization WHERE org_name = '루멘셀(테스트)'),
       'recycler-test@greenloop.test', '그린루프리사이클(테스트)', 'RECYCLER',
       md5(random()::text || clock_timestamp()::text),
       'ACCEPTED',
       (SELECT org_id FROM organization WHERE org_name = '그린루프리사이클(테스트)'),
       d.dpp_id, now() + interval '30 days', now()
FROM dpp d
JOIN product_model m ON m.model_id = d.model_id
WHERE m.internal_sku = 'BATT-NMC75-TEST'
  AND NOT EXISTS (
      SELECT 1 FROM invitation i
       WHERE i.invitee_email = 'recycler-test@greenloop.test' AND i.dpp_id = d.dpp_id
  );

-- ── 3) 코어미네랄즈(테스트) - RAW_SUPPLIER ────────────────────────────
INSERT INTO user_account (
    account_type, email, email_verified, password_hash,
    phone, phone_verified, credential_type,
    display_name, onboarding_step, status
) VALUES (
    'BUSINESS', 'supplier-test@coreminerals.test', TRUE,
    '$2b$10$ykwgqQKSiDw0Pmlze4XeY.14SVa1WKo/y/KlryUbq8yHg2DeApN5K', -- RawSupply123!
    '01000000006', TRUE, 'PASSWORD',
    '코어미네랄즈(테스트)', 'SIGNED_UP', 'ACTIVE'
)
ON CONFLICT (email) WHERE deleted_at IS NULL DO NOTHING;

INSERT INTO organization (org_name, org_type, domain, country_code, biz_reg_no,
                           tier_level, profile_status, approval_status)
SELECT '코어미네랄즈(테스트)', 'RAW_SUPPLIER', 'BATTERY', 'KR', '555-22-55555',
       2, 'APPROVED', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM organization WHERE org_name = '코어미네랄즈(테스트)');

UPDATE user_account
SET org_id = (SELECT org_id FROM organization WHERE org_name = '코어미네랄즈(테스트)')
WHERE email = 'supplier-test@coreminerals.test' AND org_id IS NULL;

INSERT INTO dpp_participant (dpp_id, org_id, role_code, submit_status)
SELECT d.dpp_id,
       (SELECT org_id FROM organization WHERE org_name = '코어미네랄즈(테스트)'),
       'RAW_SUPPLIER', 'INVITED'
FROM dpp d
JOIN product_model m ON m.model_id = d.model_id
WHERE m.internal_sku = 'BATT-NMC75-TEST'
  AND NOT EXISTS (
      SELECT 1 FROM dpp_participant p
       WHERE p.dpp_id = d.dpp_id
         AND p.org_id = (SELECT org_id FROM organization WHERE org_name = '코어미네랄즈(테스트)')
         AND p.role_code = 'RAW_SUPPLIER'
  );

INSERT INTO invitation (inviter_org_id, invitee_email, invitee_org_name, role_code, token,
                        status, accepted_org_id, dpp_id, expires_at, accepted_at)
SELECT (SELECT org_id FROM organization WHERE org_name = '루멘셀(테스트)'),
       'supplier-test@coreminerals.test', '코어미네랄즈(테스트)', 'RAW_SUPPLIER',
       md5(random()::text || clock_timestamp()::text),
       'ACCEPTED',
       (SELECT org_id FROM organization WHERE org_name = '코어미네랄즈(테스트)'),
       d.dpp_id, now() + interval '30 days', now()
FROM dpp d
JOIN product_model m ON m.model_id = d.model_id
WHERE m.internal_sku = 'BATT-NMC75-TEST'
  AND NOT EXISTS (
      SELECT 1 FROM invitation i
       WHERE i.invitee_email = 'supplier-test@coreminerals.test' AND i.dpp_id = d.dpp_id
  );

-- 확인용 조회
SELECT u.email, u.org_id, o.org_name, o.org_type,
       (SELECT count(*) FROM dpp_participant p WHERE p.org_id = o.org_id) AS linked_participations
FROM user_account u
JOIN organization o ON o.org_id = u.org_id
WHERE u.email IN ('testlab-test@krbattery.test', 'recycler-test@greenloop.test', 'supplier-test@coreminerals.test');
