-- 수동 실행용 테스트 시드 - Flyway 마이그레이션 아님, db/migration에 넣지 말 것.
-- seed-test-manufacturer.sql(철강)과 완전히 같은 패턴, domain만 TEXTILE.
--
-- *** 실행은 반드시 아래 방법으로만 (docker/ 디렉터리에서) ***
--   docker cp seed-test-textile-manufacturer.sql dpp-postgres:/tmp/seed-test-textile-manufacturer.sql
--   docker exec -i dpp-postgres psql -U dpp -d dpp -f /tmp/seed-test-textile-manufacturer.sql
--
-- *** 절대 PowerShell 파이프(Get-Content | docker exec ...)로 실행하지 말 것 ***
-- (콘솔 코드페이지 재인코딩으로 한글이 깨짐 - seed-test-manufacturer.sql과 동일한 이유,
--  자세한 설명은 그 파일 헤더 참고)
--
-- 로그인: POST /auth/login  { "email": "yj.choi@aratex.co.kr", "password": "Textile1234!" }
--
-- 이 이메일은 FE/src/mocks/data.json의 accounts 맵에 이미 "textile"로 매핑되어 있어서
-- (로그인 후 역할 라우팅은 100% 클라이언트 이메일 휴리스틱 - useAppLogic.js의
-- roleFromEmail 참고) 별도로 data.json을 안 고쳐도 로그인만 하면 섬유 화면으로 간다.

INSERT INTO user_account (
    account_type, email, email_verified, password_hash,
    phone, phone_verified, credential_type,
    display_name, onboarding_step, status
) VALUES (
    'BUSINESS', 'yj.choi@aratex.co.kr', TRUE,
    '$2b$10$1CvKg2aztkjuNhVrzmuWv.2L9KoRdYQH.Bhmubrfb/lyh7oBIv6Di', -- Textile1234!
    '01000000002', TRUE, 'PASSWORD',
    '아라텍스(테스트)', 'SIGNED_UP', 'ACTIVE'
)
ON CONFLICT (email) WHERE deleted_at IS NULL DO NOTHING;

INSERT INTO organization (org_name, org_type, domain, country_code, biz_reg_no,
                           tier_level, profile_status, approval_status)
SELECT '아라텍스(테스트)', 'MANUFACTURER', 'TEXTILE', 'KR', '312-81-55910',
       2, 'APPROVED', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM organization WHERE org_name = '아라텍스(테스트)');

UPDATE user_account
SET org_id = (SELECT org_id FROM organization WHERE org_name = '아라텍스(테스트)')
WHERE email = 'yj.choi@aratex.co.kr' AND org_id IS NULL;

INSERT INTO product_model (org_id, internal_sku, model_name, domain, granularity, status)
SELECT o.org_id, 'FAB-OC180-TEST', '유기농 면 혼방 원단 OC-180 (테스트)', 'TEXTILE', 'BATCH', 'ACTIVE'
FROM organization o
WHERE o.org_name = '아라텍스(테스트)'
  AND NOT EXISTS (SELECT 1 FROM product_model WHERE internal_sku = 'FAB-OC180-TEST');

INSERT INTO dpp (model_id, owner_org_id, domain, lifecycle_stage, status)
SELECT m.model_id, m.org_id, 'TEXTILE', 1, 'DRAFT'
FROM product_model m
WHERE m.internal_sku = 'FAB-OC180-TEST'
  AND NOT EXISTS (
      SELECT 1 FROM dpp d WHERE d.model_id = m.model_id
  );

-- 확인용 조회
SELECT u.email, u.org_id, o.org_name, o.domain, m.model_id, d.dpp_id, d.public_uuid
FROM user_account u
JOIN organization o ON o.org_id = u.org_id
JOIN product_model m ON m.org_id = o.org_id
JOIN dpp d ON d.model_id = m.model_id
WHERE u.email = 'yj.choi@aratex.co.kr';
