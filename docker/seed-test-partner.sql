-- 수동 실행용 테스트 시드 - Flyway 마이그레이션 아님, db/migration에 넣지 말 것.
-- 협력사(파트너) 테스트 계정을 이메일/전화 인증 없이 바로 활성 상태로 만든다.
-- SMTP(app.mail.enabled=true)는 건드리지 않고, 회원가입 화면 자체를 건너뛰는 방식.
--
-- *** 실행은 반드시 아래 방법으로만 (docker/ 디렉터리에서) ***
--   docker cp seed-test-partner.sql dpp-postgres:/tmp/seed-test-partner.sql
--   docker exec -i dpp-postgres psql -U dpp -d dpp -f /tmp/seed-test-partner.sql
--
-- *** 절대 PowerShell 파이프(Get-Content | docker exec ...)로 실행하지 말 것 ***
-- (콘솔 코드페이지 재인코딩으로 한글이 깨짐 - seed-test-manufacturer.sql과 동일한 이유)
--
-- 로그인: POST /auth/login  { "email": "partner-test@woojinmetal.test", "password": "Partner1234!" }
--
-- 전제: 대성제강(steel-test@daesungsteel.test) 계정으로 "협력사 초대" 탭에서
-- 이 이메일로 미리 초대를 보내둘 것. 그래야 dpp_participant.guest_email /
-- invitation.invitee_email이 이미 채워져 있고, 아래 UPDATE 두 개가 그 행을
-- 이번에 만드는 조직으로 연결해준다(BusinessSignupService.linkPendingCollaborations를
-- 수동으로 흉내낸 것). 초대를 먼저 안 보냈다면 계정/조직만 생기고 "참여 DPP"는 빈 목록.

INSERT INTO user_account (
    account_type, email, email_verified, password_hash,
    phone, phone_verified, credential_type,
    display_name, onboarding_step, status
) VALUES (
    'BUSINESS', 'partner-test@woojinmetal.test', TRUE,
    '$2b$10$k5xkznVAHUdjjn4Cwa/gI.Afm.yTEej260ZyXKX49RnIhKIZwZcWm', -- Partner1234!
    '01000000001', TRUE, 'PASSWORD',
    '우진메탈(테스트)', 'SIGNED_UP', 'ACTIVE'
)
ON CONFLICT (email) WHERE deleted_at IS NULL DO NOTHING;

INSERT INTO organization (org_name, org_type, domain, country_code, biz_reg_no,
                           tier_level, profile_status, approval_status)
SELECT '우진메탈(테스트)', 'RAW_SUPPLIER', 'STEEL', 'KR', '111-11-11111',
       2, 'APPROVED', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM organization WHERE org_name = '우진메탈(테스트)');

UPDATE user_account
SET org_id = (SELECT org_id FROM organization WHERE org_name = '우진메탈(테스트)')
WHERE email = 'partner-test@woojinmetal.test' AND org_id IS NULL;

-- 미리 보내둔 초대의 dpp_participant / invitation을 이 조직으로 연결
UPDATE dpp_participant
SET org_id = (SELECT org_id FROM organization WHERE org_name = '우진메탈(테스트)')
WHERE guest_email = 'partner-test@woojinmetal.test' AND org_id IS NULL;

UPDATE invitation
SET status = 'ACCEPTED',
    accepted_org_id = (SELECT org_id FROM organization WHERE org_name = '우진메탈(테스트)'),
    accepted_at = now()
WHERE invitee_email = 'partner-test@woojinmetal.test' AND status = 'SENT';

-- 확인용 조회
SELECT u.email, u.org_id, o.org_name, o.org_type,
       (SELECT count(*) FROM dpp_participant p WHERE p.org_id = o.org_id) AS linked_participations
FROM user_account u
JOIN organization o ON o.org_id = u.org_id
WHERE u.email = 'partner-test@woojinmetal.test';
