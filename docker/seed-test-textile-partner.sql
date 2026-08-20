-- 수동 실행용 테스트 시드 - Flyway 마이그레이션 아님, db/migration에 넣지 말 것.
-- 섬유 협력사(원사·원단 공급사, RAW_SUPPLIER) 테스트 계정을 이메일/전화 인증 없이 바로
-- 활성 상태로 만든다 - seed-test-partner.sql(철강 · 우진메탈)과 같은 목적.
--
-- *** 실행 전제: seed-test-textile-manufacturer.sql을 먼저 실행해서 아라텍스(테스트)
-- 조직과 그 DPP(FAB-OC180-TEST)가 이미 있어야 한다. ***
--
-- *** 실행은 반드시 아래 방법으로만 (docker/ 디렉터리에서) ***
--   docker cp seed-test-textile-partner.sql dpp-postgres:/tmp/seed-test-textile-partner.sql
--   docker exec -i dpp-postgres psql -U dpp -d dpp -f /tmp/seed-test-textile-partner.sql
--
-- *** 절대 PowerShell 파이프(Get-Content | docker exec ...)로 실행하지 말 것 ***
-- (콘솔 코드페이지 재인코딩으로 한글이 깨짐 - seed-test-manufacturer.sql 헤더 참고)
--
-- 로그인: POST /auth/login  { "email": "partner-test@cheongwoo.test", "password": "Partner1234!" }
--
-- 2026-08-20 수정: 사업자등록번호가 seed-test-testlab.sql의 한국시험인증(테스트)과 똑같은
-- '222-22-22222'라서, 두 시드를 같이 넣으면 ux_org_biz_reg_no(country_code, biz_reg_no
-- 유니크)에 걸려 이 파일이 통째로 실패했다. 실패하면 청우섬유 조직도 계정도 안 생겨서
-- partner-test@cheongwoo.test 로그인이 아예 안 된다. 번호를 '666-22-66666'으로 분리한다.
--
-- seed-test-partner.sql(철강)은 "협력사 초대" 탭에서 먼저 실제로 초대를 보내둬야
-- dpp_participant/invitation이 이 계정과 연결됐는데, 여기서는 그 수동 단계 없이 초대
-- 발송 + 수락까지 이 스크립트 하나로 직접 만든다(InvitationService.send() +
-- linkIfAlreadyRegistered()가 하는 일을 SQL로 그대로 흉내낸 것) - 실행하고 바로 로그인해서
-- "참여 DPP" 탭에 아라텍스의 DPP가 떠 있는지 확인할 수 있다.
--
-- 담당 항목(V16__seed_requirement_textile.sql, responsible_role='RAW_SUPPLIER' 기준):
-- RECYCLED_FIBER_RATE·RECYCLED_FIBER_SOURCE(재생 섬유 함유율/출처) + DOC_GRS_CERTIFICATE
-- (GRS/RCS 거래증명서 업로드).

INSERT INTO user_account (
    account_type, email, email_verified, password_hash,
    phone, phone_verified, credential_type,
    display_name, onboarding_step, status
) VALUES (
    'BUSINESS', 'partner-test@cheongwoo.test', TRUE,
    '$2b$10$0XBLMcBbZo.T99ITxhm13e3/QOy05nUMGQhb6eWyqcNbcV1G7npRG', -- Partner1234!
    '01000000003', TRUE, 'PASSWORD',
    '청우섬유(테스트)', 'SIGNED_UP', 'ACTIVE'
)
ON CONFLICT (email) WHERE deleted_at IS NULL DO NOTHING;

INSERT INTO organization (org_name, org_type, domain, country_code, biz_reg_no,
                           tier_level, profile_status, approval_status)
SELECT '청우섬유(테스트)', 'RAW_SUPPLIER', 'TEXTILE', 'KR', '666-22-66666',
       2, 'APPROVED', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM organization WHERE org_name = '청우섬유(테스트)');

UPDATE user_account
SET org_id = (SELECT org_id FROM organization WHERE org_name = '청우섬유(테스트)')
WHERE email = 'partner-test@cheongwoo.test' AND org_id IS NULL;

-- dpp_participant 직접 연결 - 아라텍스(테스트) 조직의 DPP(FAB-OC180-TEST)에 RAW_SUPPLIER로 참여.
INSERT INTO dpp_participant (dpp_id, org_id, role_code, submit_status)
SELECT d.dpp_id,
       (SELECT org_id FROM organization WHERE org_name = '청우섬유(테스트)'),
       'RAW_SUPPLIER', 'INVITED'
FROM dpp d
JOIN product_model m ON m.model_id = d.model_id
WHERE m.internal_sku = 'FAB-OC180-TEST'
  AND NOT EXISTS (
      SELECT 1 FROM dpp_participant p
       WHERE p.dpp_id = d.dpp_id
         AND p.org_id = (SELECT org_id FROM organization WHERE org_name = '청우섬유(테스트)')
         AND p.role_code = 'RAW_SUPPLIER'
  );

-- invitation 이력도 같이 남겨서 "협력사 초대" 화면(아라텍스 계정)에서도 정상적으로 보이게
-- 한다 - 실제 접근 권한 자체는 위 dpp_participant가 이미 부여했으므로 이 행은 이력용.
INSERT INTO invitation (inviter_org_id, invitee_email, invitee_org_name, role_code, token,
                        status, accepted_org_id, dpp_id, expires_at, accepted_at)
SELECT (SELECT org_id FROM organization WHERE org_name = '아라텍스(테스트)'),
       'partner-test@cheongwoo.test', '청우섬유(테스트)', 'RAW_SUPPLIER',
       md5(random()::text || clock_timestamp()::text),
       'ACCEPTED',
       (SELECT org_id FROM organization WHERE org_name = '청우섬유(테스트)'),
       d.dpp_id, now() + interval '30 days', now()
FROM dpp d
JOIN product_model m ON m.model_id = d.model_id
WHERE m.internal_sku = 'FAB-OC180-TEST'
  AND NOT EXISTS (
      SELECT 1 FROM invitation i
       WHERE i.invitee_email = 'partner-test@cheongwoo.test' AND i.dpp_id = d.dpp_id
  );

-- 확인용 조회
SELECT u.email, u.org_id, o.org_name, o.org_type,
       (SELECT count(*) FROM dpp_participant p WHERE p.org_id = o.org_id) AS linked_participations
FROM user_account u
JOIN organization o ON o.org_id = u.org_id
WHERE u.email = 'partner-test@cheongwoo.test';
