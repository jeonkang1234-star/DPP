-- 전화번호 인증(SMS 6자리 코드). email_verification과 완전히 동일한 구조.
-- 코드 원문은 저장하지 않고 SHA-256 해시만 저장한다 (PhoneVerificationService 참고).
CREATE TABLE phone_verification (
    verification_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    phone            VARCHAR(30)  NOT NULL,
    purpose          VARCHAR(30)  NOT NULL DEFAULT 'BUSINESS_SIGNUP' CHECK (purpose IN ('BUSINESS_SIGNUP')),
    code_hash        VARCHAR(64)  NOT NULL,
    attempt_count    SMALLINT     NOT NULL DEFAULT 0,
    verified_at      TIMESTAMPTZ,
    expires_at       TIMESTAMPTZ  NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX ix_phone_verification_lookup ON phone_verification (phone, purpose, created_at DESC);
