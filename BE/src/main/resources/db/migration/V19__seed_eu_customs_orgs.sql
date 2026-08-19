-- =====================================================================
-- 유럽 4개국 세관 데모 계정 시드 - 2026-08-19 강 요청
--   "유럽의 각기 다른 국가로 계정을 4개 정도 더 파서, 세관마다 확인해야 할 DPP가
--   달라야 함" - V18의 수출/수입국 관할 매칭이 실제로 동작하는 걸 보여주려면 최소
--   여러 EU 국가에 세관 조직이 있어야 한다. 기존 mock 데이터(customsVals.js)의
--   importerAddr에 등장하던 나라들(독일/프랑스)에 네덜란드(로테르담 - EU 최대
--   컨테이너항)·이탈리아를 더해 4개국으로 구성했다.
--
--   이 4개 계정은 다른 조직과 달리 회원가입(BusinessSignupService)을 거치지 않고
--   바로 시드로 만들어서 approval_status를 즉시 ACTIVE로 둔다 - 실제 정부기관 심사를
--   대체하는 게 아니라, "특정 국가 세관으로 로그인하면 그 나라가 걸린 DPP만 보인다"를
--   시연하기 위한 데모/테스트 계정이다. 로그인 비밀번호는 전부 동일하게
--   "Customs!2026" (BCrypt 해시, 아래 값들). 실제 운영 반영 전 반드시 교체할 것.
-- =====================================================================

INSERT INTO organization (
    org_name, org_type, domain, country_code, biz_reg_no,
    postal_code, address_line1, city,
    contact_name, contact_dept, contact_phone, contact_email,
    profile_status, approval_status, approved_at
) VALUES
    ('Zoll Duisburg', 'CUSTOMS', NULL, 'DE', NULL,
     '47059', 'Hafenstraße 22', '뒤스부르크',
     'Hans Weber', 'Zollabfertigung', '+49-203-555-0142', 'officer@zoll-duisburg.de',
     'APPROVED', 'ACTIVE', now()),
    ('Douane Lyon', 'CUSTOMS', NULL, 'FR', NULL,
     '69003', 'Rue Garibaldi 148', '리옹',
     'Camille Dubois', 'Service des douanes', '+33-4-72-55-01-42', 'agent@douane-lyon.fr',
     'APPROVED', 'ACTIVE', now()),
    ('Douane Rotterdam', 'CUSTOMS', NULL, 'NL', NULL,
     '3011', 'Wilhelminakade 87', '로테르담',
     'Sanne de Vries', 'Douane', '+31-10-555-0142', 'officer@douane-rotterdam.nl',
     'APPROVED', 'ACTIVE', now()),
    ('Agenzia delle Dogane Milano', 'CUSTOMS', NULL, 'IT', NULL,
     '20122', 'Via Larga 12', '밀라노',
     'Marco Rossi', 'Dogana', '+39-02-555-0142', 'agente@dogane-milano.it',
     'APPROVED', 'ACTIVE', now());

-- BCrypt("Customs!2026") - 4계정 공통 데모 비밀번호.
INSERT INTO user_account (
    org_id, account_type, email, email_verified, password_hash,
    phone, phone_verified, display_name, onboarding_step, status, last_login_at
)
SELECT o.org_id, 'BUSINESS', o.contact_email, TRUE,
       '$2b$10$Ib90lPm6vB5nezQlyvdNbOf.lo5dMg8Ve.21jjz2tjnAijoGlG7T2',
       o.contact_phone, TRUE, o.org_name, 'COMPLETED', 'ACTIVE', NULL
FROM organization o
WHERE o.org_type = 'CUSTOMS'
  AND o.country_code IN ('DE', 'FR', 'NL', 'IT')
  AND o.contact_email IN (
      'officer@zoll-duisburg.de', 'agent@douane-lyon.fr',
      'officer@douane-rotterdam.nl', 'agente@dogane-milano.it'
  );

INSERT INTO user_role (user_id, role_code)
SELECT u.user_id, 'CUSTOMS'
FROM user_account u
JOIN organization o ON o.org_id = u.org_id
WHERE o.org_type = 'CUSTOMS'
  AND o.country_code IN ('DE', 'FR', 'NL', 'IT')
  AND o.contact_email IN (
      'officer@zoll-duisburg.de', 'agent@douane-lyon.fr',
      'officer@douane-rotterdam.nl', 'agente@dogane-milano.it'
  );
