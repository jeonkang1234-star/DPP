-- 수동 실행용 테스트 시드 - Flyway 마이그레이션 아님, db/migration에 넣지 말 것.
--
-- *** 실행은 반드시 아래 방법으로만 (docker/ 디렉터리에서) ***
--   docker cp seed-test-manufacturer.sql dpp-postgres:/tmp/seed-test-manufacturer.sql
--   docker exec -i dpp-postgres psql -U dpp -d dpp -f /tmp/seed-test-manufacturer.sql
--
-- *** 절대 이렇게 실행하지 말 것 (Windows PowerShell에서 한글이 깨져서 DB에 들어감): ***
--   Get-Content seed-test-manufacturer.sql | docker exec -i dpp-postgres psql -U dpp -d dpp
--   docker exec -i dpp-postgres psql -U dpp -d dpp < seed-test-manufacturer.sql   (PowerShell엔 < 리다이렉션 자체가 없음)
-- 이유: PowerShell이 파이프로 외부 프로세스(docker)에 텍스트를 넘길 때 콘솔 코드페이지
-- (한국어 Windows 기본 cp949)로 재인코딩한다 - UTF-8 한글이 이 과정에서 깨져서 DB에
-- "?????" 같은 문자로 그대로 저장돼버린다(2026-08-13, org_name/display_name/model_name
-- 전부 이렇게 깨진 걸 확인 - 매번 UPDATE로 땜질하지 말고 애초에 이 방법으로 넣을 것).
-- `docker cp` + `psql -f`는 컨테이너 내부 파일시스템에서 직접 읽기 때문에 PowerShell
-- 콘솔 인코딩을 아예 거치지 않아 안전하다.
--
-- 로그인: POST /auth/login  { "email": "steel-test@daesungsteel.test", "password": "Steel1234!" }
--
-- 문서 업로드(POST /document/upload)를 테스트하려면 document.owner_id가 가리킬 대상이
-- 있어야 하는데(owner_type=DPP), organization/product_model/dpp 전부 아직 CRUD가 없어서
-- (item 4 회사 프로필, 그리고 아직 시작 안 한 product/dpp 도메인) 테스트용으로 최소
-- 1건씩 직접 넣는다. 실제 온보딩/제품등록 API가 생기면 이 시드는 필요 없어진다.

INSERT INTO user_account (
    account_type, email, email_verified, password_hash,
    phone, phone_verified, credential_type,
    display_name, onboarding_step, status
) VALUES (
    'BUSINESS', 'steel-test@daesungsteel.test', TRUE,
    '$2b$10$7pPn/n3lipbX99FB0Ms30OOBEX5BzciFOtzxCBGEE6N5aRQWCHQf.',
    '01000000000', TRUE, 'PASSWORD',
    '대성제강(테스트)', 'SIGNED_UP', 'ACTIVE'
)
ON CONFLICT (email) WHERE deleted_at IS NULL DO NOTHING;

INSERT INTO organization (org_name, org_type, domain, country_code, biz_reg_no,
                           tier_level, profile_status, approval_status)
SELECT '대성제강(테스트)', 'MANUFACTURER', 'STEEL', 'KR', '000-00-00000',
       2, 'APPROVED', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM organization WHERE org_name = '대성제강(테스트)');

UPDATE user_account
SET org_id = (SELECT org_id FROM organization WHERE org_name = '대성제강(테스트)')
WHERE email = 'steel-test@daesungsteel.test' AND org_id IS NULL;

INSERT INTO product_model (org_id, internal_sku, model_name, domain, granularity, status)
SELECT o.org_id, 'HRC-SPHC-32-TEST', '열연코일 HR-SPHC 3.2t (테스트)', 'STEEL', 'BATCH', 'ACTIVE'
FROM organization o
WHERE o.org_name = '대성제강(테스트)'
  AND NOT EXISTS (SELECT 1 FROM product_model WHERE internal_sku = 'HRC-SPHC-32-TEST');

INSERT INTO dpp (model_id, owner_org_id, domain, lifecycle_stage, status)
SELECT m.model_id, m.org_id, 'STEEL', 1, 'DRAFT'
FROM product_model m
WHERE m.internal_sku = 'HRC-SPHC-32-TEST'
  AND NOT EXISTS (
      SELECT 1 FROM dpp d WHERE d.model_id = m.model_id
  );

-- 확인용 조회
SELECT u.email, u.org_id, o.org_name, m.model_id, d.dpp_id, d.public_uuid
FROM user_account u
JOIN organization o ON o.org_id = u.org_id
JOIN product_model m ON m.org_id = o.org_id
JOIN dpp d ON d.model_id = m.model_id
WHERE u.email = 'steel-test@daesungsteel.test';
