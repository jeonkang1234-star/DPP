-- =====================================================================
-- 기업(BUSINESS) 회원가입 이메일 인증 (6자리 코드)
-- 실행 전제: 01~05 스크립트 완료
-- =====================================================================

CREATE TABLE email_verification (
    verification_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email            VARCHAR(200) NOT NULL,
    purpose          VARCHAR(30)  NOT NULL DEFAULT 'BUSINESS_SIGNUP'
                     CHECK (purpose IN ('BUSINESS_SIGNUP')),
    -- 코드 원문은 저장하지 않는다 (SHA-256 해시만 저장, EmailVerificationService 참고)
    code_hash        VARCHAR(64)  NOT NULL,
    attempt_count    SMALLINT     NOT NULL DEFAULT 0,
    verified_at      TIMESTAMPTZ,
    expires_at       TIMESTAMPTZ  NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE email_verification IS
    '기업 회원가입 시 이메일 인증코드 발급/검증 이력. 계정 생성 전 단계라 user_account와 FK로 안 묶음';
COMMENT ON COLUMN email_verification.attempt_count IS
    '오답 시도 횟수. 5회 넘으면 재발송 요구 (EmailVerificationService.MAX_ATTEMPTS)';

-- 같은 이메일로 여러 번 요청할 수 있으므로 유니크 제약은 걸지 않고,
-- "가장 최근 요청"을 빠르게 찾기 위한 인덱스만 둔다.
CREATE INDEX ix_email_verification_lookup
    ON email_verification (email, purpose, created_at DESC);
