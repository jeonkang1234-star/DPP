-- 수동 실행용 테스트 시드 - Flyway 마이그레이션 아님, db/migration에 넣지 말 것.
-- seed-test-manufacturer.sql(철강)/seed-test-textile-manufacturer.sql(섬유)와 완전히
-- 같은 패턴, domain만 BATTERY.
--
-- *** 실행은 반드시 아래 방법으로만 (docker/ 디렉터리에서) ***
--   docker cp seed-test-battery-manufacturer.sql dpp-postgres:/tmp/seed-test-battery-manufacturer.sql
--   docker exec -i dpp-postgres psql -U dpp -d dpp -f /tmp/seed-test-battery-manufacturer.sql
--
-- *** 절대 PowerShell 파이프(Get-Content | docker exec ...)로 실행하지 말 것 ***
-- (콘솔 코드페이지 재인코딩으로 한글이 깨짐 - seed-test-manufacturer.sql과 동일한 이유)
--
-- 로그인: POST /auth/login  { "email": "sj.lee@lumencell.co.kr", "password": "Battery1234!" }
--
-- 이 이메일은 FE/src/mocks/data.json의 accounts 맵에 이미 "battery"로 매핑되어 있어서
-- (로그인 후 역할 라우팅은 100% 클라이언트 이메일 휴리스틱) 별도로 data.json을 안 고쳐도
-- 로그인만 하면 배터리 화면으로 간다.

INSERT INTO user_account (
    account_type, email, email_verified, password_hash,
    phone, phone_verified, credential_type,
    display_name, onboarding_step, status
) VALUES (
    'BUSINESS', 'sj.lee@lumencell.co.kr', TRUE,
    '$2b$10$eQRpbOEFF35/tHuUgn83OOMs9Tbw.P4a27I1/ttM5SW5jhpSLoCYS', -- Battery1234!
    '01000000002', TRUE, 'PASSWORD',
    '루멘셀(테스트)', 'SIGNED_UP', 'ACTIVE'
)
ON CONFLICT (email) WHERE deleted_at IS NULL DO NOTHING;

INSERT INTO organization (org_name, org_type, domain, country_code, biz_reg_no,
                           tier_level, profile_status, approval_status)
SELECT '루멘셀(테스트)', 'MANUFACTURER', 'BATTERY', 'KR', '124-86-77203',
       2, 'APPROVED', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM organization WHERE org_name = '루멘셀(테스트)');

UPDATE user_account
SET org_id = (SELECT org_id FROM organization WHERE org_name = '루멘셀(테스트)')
WHERE email = 'sj.lee@lumencell.co.kr' AND org_id IS NULL;

INSERT INTO product_model (org_id, internal_sku, model_name, domain, granularity, status)
SELECT o.org_id, 'BATT-NMC75-TEST', '전기차용 NMC 배터리팩 75kWh (테스트)', 'BATTERY', 'BATCH', 'ACTIVE'
FROM organization o
WHERE o.org_name = '루멘셀(테스트)'
  AND NOT EXISTS (SELECT 1 FROM product_model WHERE internal_sku = 'BATT-NMC75-TEST');

INSERT INTO dpp (model_id, owner_org_id, domain, lifecycle_stage, status)
SELECT m.model_id, m.org_id, 'BATTERY', 1, 'DRAFT'
FROM product_model m
WHERE m.internal_sku = 'BATT-NMC75-TEST'
  AND NOT EXISTS (
      SELECT 1 FROM dpp d WHERE d.model_id = m.model_id
  );

-- 확인용 조회
SELECT u.email, u.org_id, o.org_name, o.domain, m.model_id, d.dpp_id, d.public_uuid
FROM user_account u
JOIN organization o ON o.org_id = u.org_id
JOIN product_model m ON m.org_id = o.org_id
JOIN dpp d ON d.model_id = m.model_id
WHERE u.email = 'sj.lee@lumencell.co.kr';
