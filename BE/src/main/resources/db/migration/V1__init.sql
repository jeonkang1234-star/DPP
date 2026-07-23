-- 회원(users) 테이블
-- 주의: 주민등록번호 원본은 어떤 컬럼에도 저장하지 않는다. 본인인증 결과인 ci_hash만 저장.
CREATE TABLE users (
    id UUID PRIMARY KEY,
    role VARCHAR(20) NOT NULL,                 -- INDIVIDUAL / MANUFACTURER / CORPORATE
    tier VARCHAR(20) NOT NULL DEFAULT 'UNASSIGNED', -- 개인=TIER1 자동, 기업=UNASSIGNED(추후 마이페이지에서 신청)
    username VARCHAR(50),
    email VARCHAR(255),
    password_hash VARCHAR(255),
    company_name VARCHAR(255),
    phone_number VARCHAR(20),
    ci_hash VARCHAR(255),                      -- 본인인증(PASS/NICE) CI 해시. 주민번호 원본 아님.
    sns_provider VARCHAR(20),
    sns_id VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_users_username ON users (username) WHERE username IS NOT NULL;
CREATE UNIQUE INDEX ux_users_email ON users (email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX ux_users_ci_hash ON users (ci_hash) WHERE ci_hash IS NOT NULL;
CREATE UNIQUE INDEX ux_users_sns ON users (sns_provider, sns_id) WHERE sns_provider IS NOT NULL;
