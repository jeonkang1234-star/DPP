-- =====================================================================
-- SNS 로그인(OAuth 2.0 / OIDC) 1차 편입 마이그레이션
-- 실행 전제: 01~04 스크립트 완료
--
-- 변경 요약
--   1) user_account.email 을 NULL 허용으로 (카카오 이메일 미제공 대응)
--   2) SNS 연결 정보를 user_sns_link 테이블로 분리 (계정당 여러 SNS 가능)
--   3) oauth_state 추가 (CSRF·PKCE 방어용 임시 저장소)
--   4) login_history 에 로그인 수단 구분 추가
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. SNS 연결 테이블
--    한 계정에 카카오·네이버·구글을 각각 연결할 수 있음
-- ---------------------------------------------------------------------
CREATE TABLE user_sns_link (
    link_id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id           BIGINT       NOT NULL REFERENCES user_account(user_id) ON DELETE CASCADE,
    provider          VARCHAR(20)  NOT NULL
                      CHECK (provider IN ('KAKAO','NAVER','GOOGLE')),
    subject           VARCHAR(200) NOT NULL,
    provider_email    VARCHAR(200),
    provider_nickname VARCHAR(100),
    profile_image_url TEXT,
    is_primary        BOOLEAN      NOT NULL DEFAULT FALSE,
    scopes            VARCHAR(300),
    linked_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    last_login_at     TIMESTAMPTZ,
    unlinked_at       TIMESTAMPTZ,
    CONSTRAINT ux_sns_identity UNIQUE (provider, subject)
);

COMMENT ON TABLE  user_sns_link IS 'OAuth 제공자별 연결 정보. 계정 하나에 여러 SNS 연결 가능';
COMMENT ON COLUMN user_sns_link.subject IS
    'OIDC sub 클레임. 제공자가 발급한 불변 회원번호. 이메일로 식별하면 안 됨';
COMMENT ON COLUMN user_sns_link.provider_email IS
    '제공자가 알려준 이메일. 계정 이메일과 다를 수 있어 따로 보관';
COMMENT ON COLUMN user_sns_link.is_primary IS '마이페이지에 대표로 표시할 연결';

-- 같은 사람이 같은 제공자를 두 번 연결하지 못하도록
CREATE UNIQUE INDEX ux_sns_user_provider
    ON user_sns_link (user_id, provider) WHERE unlinked_at IS NULL;
CREATE INDEX ix_sns_user ON user_sns_link (user_id) WHERE unlinked_at IS NULL;


-- ---------------------------------------------------------------------
-- 2. 기존 데이터 이관 (user_account -> user_sns_link)
-- ---------------------------------------------------------------------
INSERT INTO user_sns_link (user_id, provider, subject, provider_email, is_primary)
SELECT user_id, sns_provider, sns_subject, email, TRUE
  FROM user_account
 WHERE sns_provider IS NOT NULL AND sns_subject IS NOT NULL;


-- ---------------------------------------------------------------------
-- 3. user_account 정리
--    - 자격증명 CHECK 제약은 다른 테이블을 참조할 수 없어 제거
--      (비밀번호 또는 SNS 연결 중 하나는 있어야 한다는 규칙은 애플리케이션에서 검증)
--    - 이메일 NULL 허용
--    - 옮긴 SNS 컬럼 제거
-- ---------------------------------------------------------------------
ALTER TABLE user_account DROP CONSTRAINT IF EXISTS ck_user_credential;

DROP INDEX IF EXISTS ux_user_sns;

ALTER TABLE user_account
    ALTER COLUMN email DROP NOT NULL,
    DROP COLUMN IF EXISTS sns_provider,
    DROP COLUMN IF EXISTS sns_subject;

-- 로그인 수단 구분 (SNS 전용 계정은 비밀번호 로그인 시도를 아예 차단)
ALTER TABLE user_account
    ADD COLUMN IF NOT EXISTS credential_type VARCHAR(20) NOT NULL DEFAULT 'PASSWORD'
        CHECK (credential_type IN ('PASSWORD','SNS','BOTH'));

UPDATE user_account ua
   SET credential_type = CASE
        WHEN ua.password_hash IS NULL THEN 'SNS'
        WHEN EXISTS (SELECT 1 FROM user_sns_link l
                      WHERE l.user_id = ua.user_id AND l.unlinked_at IS NULL) THEN 'BOTH'
        ELSE 'PASSWORD' END;

COMMENT ON COLUMN user_account.email IS
    '카카오 등에서 이메일 미제공 시 NULL. 서비스 알림이 필요하면 별도 수집';
COMMENT ON COLUMN user_account.credential_type IS
    'SNS = 비밀번호 로그인 불가. 비밀번호 재설정 요청도 거부해야 함';


-- ---------------------------------------------------------------------
-- 4. OAuth 진행 상태 임시 저장소
--    로그인 버튼을 누른 시점과 제공자가 되돌아오는 시점 사이를 이어주는 표.
--    위조 요청(CSRF)과 인가코드 탈취(PKCE)를 막는 용도.
-- ---------------------------------------------------------------------
CREATE TABLE oauth_state (
    state_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    state         VARCHAR(128) NOT NULL UNIQUE,
    provider      VARCHAR(20)  NOT NULL
                  CHECK (provider IN ('KAKAO','NAVER','GOOGLE')),
    nonce         VARCHAR(128),
    code_verifier VARCHAR(128),
    redirect_uri  VARCHAR(500),
    purpose       VARCHAR(20)  NOT NULL DEFAULT 'LOGIN'
                  CHECK (purpose IN ('LOGIN','LINK')),
    link_user_id  BIGINT       REFERENCES user_account(user_id),
    ip_address    INET,
    user_agent    VARCHAR(400),
    expires_at    TIMESTAMPTZ  NOT NULL,
    used_at       TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  oauth_state IS 'OAuth 왕복 검증용. 수명 10분 권장. 사용 즉시 used_at 기록';
COMMENT ON COLUMN oauth_state.state IS 'CSRF 방어. 돌아온 값이 발급값과 다르면 거부';
COMMENT ON COLUMN oauth_state.nonce IS 'OIDC ID 토큰 재사용 공격 방어';
COMMENT ON COLUMN oauth_state.code_verifier IS 'PKCE. 인가코드를 가로채도 토큰 교환 불가';
COMMENT ON COLUMN oauth_state.purpose IS 'LOGIN=신규·기존 로그인, LINK=이미 로그인한 계정에 추가 연결';

CREATE INDEX ix_oauth_state_lookup ON oauth_state (state) WHERE used_at IS NULL;


-- ---------------------------------------------------------------------
-- 5. 로그인 이력에 수단 구분 추가
-- ---------------------------------------------------------------------
ALTER TABLE login_history
    ADD COLUMN IF NOT EXISTS login_method VARCHAR(20) NOT NULL DEFAULT 'PASSWORD'
        CHECK (login_method IN ('PASSWORD','SNS','OTP')),
    ADD COLUMN IF NOT EXISTS provider VARCHAR(20);

ALTER TABLE login_history DROP CONSTRAINT IF EXISTS login_history_result_check;
ALTER TABLE login_history ADD CONSTRAINT login_history_result_check
    CHECK (result IN ('SUCCESS','BAD_PASSWORD','LOCKED','MFA_FAIL','NO_ACCOUNT',
                      'SNS_DENIED','SNS_STATE_MISMATCH','SNS_LINK_CONFLICT'));

COMMENT ON COLUMN login_history.provider IS 'login_method=SNS 일 때 제공자';


-- ---------------------------------------------------------------------
-- 6. 만료된 OAuth state 정리 함수 (10분 주기 배치 또는 로그인 시 호출)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_purge_oauth_state()
RETURNS INT AS $$
DECLARE v_count INT;
BEGIN
    DELETE FROM oauth_state
     WHERE expires_at < now() - INTERVAL '1 hour'
        OR used_at    < now() - INTERVAL '1 hour';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------
-- 7. 계정의 로그인 수단 조회 뷰 (마이페이지 "연결된 계정" 화면)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_user_credential AS
SELECT
    u.user_id,
    u.display_name,
    u.email,
    u.credential_type,
    (u.password_hash IS NOT NULL) AS has_password,
    COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
                    'provider',   l.provider,
                    'nickname',   l.provider_nickname,
                    'is_primary', l.is_primary,
                    'linked_at',  l.linked_at))
           FROM user_sns_link l
          WHERE l.user_id = u.user_id AND l.unlinked_at IS NULL),
        '[]'::jsonb) AS sns_links
FROM user_account u
WHERE u.deleted_at IS NULL;


-- ---------------------------------------------------------------------
-- 8. 확인
-- ---------------------------------------------------------------------
SELECT '테이블(파티션 제외)' AS 항목,
       (SELECT count(*) FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname='public' AND c.relkind IN ('r','p')
           AND NOT EXISTS (SELECT 1 FROM pg_inherits i WHERE i.inhrelid=c.oid)) AS 실제값,
       43 AS 기대값
UNION ALL SELECT '뷰',
       (SELECT count(*) FROM information_schema.views WHERE table_schema='public'), 4
UNION ALL SELECT 'email NULL 허용',
       (SELECT CASE WHEN is_nullable='YES' THEN 1 ELSE 0 END
          FROM information_schema.columns
         WHERE table_name='user_account' AND column_name='email'), 1
UNION ALL SELECT 'sns 컬럼 제거됨',
       (SELECT count(*) FROM information_schema.columns
         WHERE table_name='user_account' AND column_name IN ('sns_provider','sns_subject')), 0;
