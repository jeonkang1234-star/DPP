-- 수동 실행용 테스트 시드 - Flyway 마이그레이션 아님, db/migration에 넣지 말 것.
-- 시험·인증기관(TEST_LAB) 협력사 테스트 계정을 이메일/전화 인증 없이 바로 활성 상태로
-- 만들고, 대성제강(steel-test@daesungsteel.test)의 dpp_id=1에 TEST_LAB 참여자로 즉시
-- 연결한다. seed-test-partner.sql(RAW_SUPPLIER)과 달리 "미리 초대를 보내둬야" 하는
-- 전제가 없다 - user_account/organization/dpp_participant/invitation을 한 번에 만들고
-- 이미 연결(ACCEPTED/org_id 세팅)까지 끝낸 상태로 시딩한다.
--
-- *** 실행은 반드시 아래 방법으로만 (docker/ 디렉터리에서) ***
--   docker cp seed-test-testlab.sql dpp-postgres:/tmp/seed-test-testlab.sql
--   docker exec -i dpp-postgres psql -U dpp -d dpp -f /tmp/seed-test-testlab.sql
--
-- *** 절대 PowerShell 파이프(Get-Content | docker exec ...)로 실행하지 말 것 ***
-- (콘솔 코드페이지 재인코딩으로 한글이 깨짐)
--
-- 로그인: POST /auth/login  { "email": "testlab-test@krtest.test", "password": "TestLab1234!" }
--
-- 로그인 후 FE 역할 라우팅(FE/src/mocks/data.json의 accounts 맵)에도 이 이메일이
-- "partner"로 등록돼 있어야 화면이 제대로 뜬다 - 이 세션에서 이미 추가해뒀음.

INSERT INTO user_account (
    account_type, email, email_verified, password_hash,
    phone, phone_verified, credential_type,
    display_name, onboarding_step, status
) VALUES (
    'BUSINESS', 'testlab-test@krtest.test', TRUE,
    '$2b$10$izE5CPPPenozIZp3BYPBZevgiwVRUsJapOd1BJumZXLg1St76/cxq', -- TestLab1234!
    '01000000002', TRUE, 'PASSWORD',
    '한국시험인증(테스트)', 'SIGNED_UP', 'ACTIVE'
)
ON CONFLICT (email) WHERE deleted_at IS NULL DO NOTHING;

INSERT INTO organization (org_name, org_type, domain, country_code, biz_reg_no,
                           tier_level, profile_status, approval_status)
SELECT '한국시험인증(테스트)', 'TEST_LAB', 'STEEL', 'KR', '222-22-22222',
       2, 'APPROVED', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM organization WHERE org_name = '한국시험인증(테스트)');

UPDATE user_account
SET org_id = (SELECT org_id FROM organization WHERE org_name = '한국시험인증(테스트)')
WHERE email = 'testlab-test@krtest.test' AND org_id IS NULL;

-- 대성제강의 dpp_id=1에 TEST_LAB 참여자로 즉시 연결(org_id까지 바로 채움 - 초대 대기
-- 상태를 거치지 않는다). 이미 있으면 중복 생성 안 하도록 존재 체크.
INSERT INTO dpp_participant (dpp_id, org_id, role_code, submit_status)
SELECT 1, (SELECT org_id FROM organization WHERE org_name = '한국시험인증(테스트)'),
       'TEST_LAB', 'INVITED'
WHERE NOT EXISTS (
    SELECT 1 FROM dpp_participant
     WHERE dpp_id = 1
       AND org_id = (SELECT org_id FROM organization WHERE org_name = '한국시험인증(테스트)')
       AND role_code = 'TEST_LAB'
);

-- "협력사 초대" 이력 화면에도 자연스럽게 보이도록 이미 수락된 초대 1건도 같이 남긴다.
INSERT INTO invitation (inviter_org_id, invitee_email, invitee_org_name, dpp_id, role_code,
                         token, status, accepted_org_id, expires_at, accepted_at, created_by)
SELECT (SELECT owner_org_id FROM dpp WHERE dpp_id = 1),
       'testlab-test@krtest.test', '한국시험인증(테스트)', 1, 'TEST_LAB',
       gen_random_uuid()::text, 'ACCEPTED',
       (SELECT org_id FROM organization WHERE org_name = '한국시험인증(테스트)'),
       now() + interval '7 days', now(),
       (SELECT user_id FROM user_account WHERE email = 'steel-test@daesungsteel.test')
WHERE NOT EXISTS (
    SELECT 1 FROM invitation WHERE invitee_email = 'testlab-test@krtest.test' AND dpp_id = 1
);

-- 확인용 조회
SELECT u.email, u.org_id, o.org_name, o.org_type,
       (SELECT count(*) FROM dpp_participant p WHERE p.org_id = o.org_id) AS linked_participations
FROM user_account u
JOIN organization o ON o.org_id = u.org_id
WHERE u.email = 'testlab-test@krtest.test';
