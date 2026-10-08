-- =====================================================================
-- 1. 일반 소비자 화면의 식별자 마스킹 (2026-10-08 강 요청 - 개발보고서 "역할군별 노출 제어")
--
-- 보고서: 일반 소비자에게 Heat 번호·시설 식별자·제조자 정보는 MASKED(앞 두 글자만 남김).
-- 그동안 공개 여권(PublicPassportService)은 disclosure_scope만 봐서, PUBLIC 항목인
-- Heat 번호(HEAT_NO) 등이 QR만 찍으면 전부 보였다. field_visibility 의 tier_level 1(일반
-- 소비자·비로그인) 행을 MASKED 로 바꾸고, 공개 여권이 이 값을 읽어 앞 두 글자만 남긴다.
-- 세관·시장감시당국·운영자·발급 조직 본인은 그대로 전부 본다.
--
-- 배터리 항목은 넣지 않는다 - EU 배터리규정 Annex XIII 1 은 제조 장소·배치 정보를
-- 일반 공개 항목으로 정하고 있어서, 가리면 오히려 규정 위반이 된다.
-- =====================================================================
INSERT INTO field_visibility (field_code, tier_level, visibility)
SELECT f.code, 1, 'MASKED'
  FROM (VALUES
        ('HEAT_NO'),                          -- 철강 Heat 번호
        ('FABRIC_LOT_NO'),                    -- 섬유 배치·로트 번호
        ('CBAM_INSTALLATION_ID'),             -- 시설 식별자
        ('PRODUCTION_FACILITY_ADDRESS'),      -- 시설 식별자(주소)
        ('FACILITY_GPS_LATITUDE'),            -- 시설 식별자(좌표)
        ('FACILITY_GPS_LONGITUDE'),
        ('MANUFACTURER_BUSINESS_REG_NUMBER')  -- 제조자 정보
       ) AS f(code)
 WHERE EXISTS (SELECT 1 FROM requirement_field rf WHERE rf.field_code = f.code)
ON CONFLICT (field_code, tier_level) DO UPDATE SET visibility = EXCLUDED.visibility;

-- =====================================================================
-- 2. 로그인 5회 실패 잠금 → 이메일 인증으로 해제 (보고서 "보안 설계 - 인증과 세션")
--
-- 예전엔 15분 뒤 저절로 풀렸다. 이제 user_account.status = LOCKED 로 잠그고, 계정
-- 이메일로 받은 인증코드를 입력해야 풀린다. 코드 발급·검증은 회원가입 이메일 인증과
-- 같은 email_verification 테이블을 purpose 로 구분해 쓴다.
-- =====================================================================
ALTER TABLE email_verification DROP CONSTRAINT IF EXISTS email_verification_purpose_check;
ALTER TABLE email_verification ADD CONSTRAINT email_verification_purpose_check
    CHECK (purpose IN ('BUSINESS_SIGNUP', 'ACCOUNT_UNLOCK'));
