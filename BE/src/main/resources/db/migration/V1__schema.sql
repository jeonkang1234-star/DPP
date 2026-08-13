-- =====================================================================
-- DPP 플랫폼 스키마 (Phase 1)
-- PostgreSQL 15+ / 대상 DB: dpp_db
-- 실행 순서: 01_schema.sql -> 02_functions.sql -> 03_seed_master.sql
--            -> 04_seed_requirement_steel.sql
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- 공통 트리거 함수: updated_at 자동 갱신 + 낙관적 잠금 version 증가
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_bump_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    NEW.version    := OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =====================================================================
-- 1. 코드 마스터
-- =====================================================================
CREATE TABLE code_master (
    code_group    VARCHAR(40)  NOT NULL,
    code          VARCHAR(40)  NOT NULL,
    name_ko       VARCHAR(200) NOT NULL,
    name_en       VARCHAR(200),
    extra         JSONB        NOT NULL DEFAULT '{}',
    sort_order    INT          NOT NULL DEFAULT 0,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_code_master PRIMARY KEY (code_group, code)
);
COMMENT ON TABLE code_master IS '국가/HS코드/업종/단위 등 모든 코드값 통합 마스터';

CREATE TRIGGER trg_code_master_touch BEFORE UPDATE ON code_master
    FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();


-- =====================================================================
-- 2. 권한 체계
-- =====================================================================
CREATE TABLE role (
    role_code       VARCHAR(30)  PRIMARY KEY,
    role_name_ko    VARCHAR(100) NOT NULL,
    role_name_en    VARCHAR(100),
    default_tier    SMALLINT     NOT NULL DEFAULT 1
                    CHECK (default_tier BETWEEN 1 AND 3),
    dashboard_route VARCHAR(100),
    has_login       BOOLEAN      NOT NULL DEFAULT TRUE,
    is_phase1       BOOLEAN      NOT NULL DEFAULT FALSE,
    sort_order      INT          NOT NULL DEFAULT 0
);
COMMENT ON COLUMN role.has_login IS 'FALSE = 게스트 업로드 링크로만 참여하는 역할';
COMMENT ON COLUMN role.is_phase1 IS 'TRUE = 1차 개발에서 전용 화면을 제공하는 역할';

CREATE TABLE permission (
    permission_code VARCHAR(60)  PRIMARY KEY,
    resource        VARCHAR(40)  NOT NULL,
    action          VARCHAR(20)  NOT NULL
                    CHECK (action IN ('READ','WRITE','DELETE','APPROVE','EXPORT')),
    description     VARCHAR(200)
);

CREATE TABLE role_permission (
    role_code       VARCHAR(30) NOT NULL REFERENCES role(role_code) ON DELETE CASCADE,
    permission_code VARCHAR(60) NOT NULL REFERENCES permission(permission_code) ON DELETE CASCADE,
    CONSTRAINT pk_role_permission PRIMARY KEY (role_code, permission_code)
);


-- =====================================================================
-- 3. 조직 / 계정
-- =====================================================================
CREATE TABLE organization (
    org_id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    org_name          VARCHAR(200) NOT NULL,
    org_type          VARCHAR(30)  REFERENCES role(role_code),
    domain            VARCHAR(20)
                      CHECK (domain IN ('STEEL','TEXTILE','BATTERY')),
    country_code      CHAR(2),
    biz_reg_no        VARCHAR(30),
    lei_code          VARCHAR(20),
    eori_code         VARCHAR(20),
    uoi               VARCHAR(50),
    postal_code       VARCHAR(20),
    address_line1     VARCHAR(300),
    address_line2     VARCHAR(300),
    city              VARCHAR(100),
    contact_name      VARCHAR(100),
    contact_dept      VARCHAR(100),
    contact_phone     VARCHAR(30),
    contact_email     VARCHAR(200),
    tier_level        SMALLINT     NOT NULL DEFAULT 1
                      CHECK (tier_level BETWEEN 1 AND 3),
    profile_status    VARCHAR(20)  NOT NULL DEFAULT 'INCOMPLETE'
                      CHECK (profile_status IN ('INCOMPLETE','SUBMITTED','APPROVED')),
    approval_status   VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                      CHECK (approval_status IN ('PENDING','ACTIVE','REJECTED','SUSPENDED')),
    reject_reason     VARCHAR(500),
    approved_by       BIGINT,
    approved_at       TIMESTAMPTZ,
    version           INT          NOT NULL DEFAULT 1,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by        BIGINT,
    updated_by        BIGINT,
    deleted_at        TIMESTAMPTZ
);
COMMENT ON COLUMN organization.org_type IS '가입 직후에는 NULL. 마이페이지에서 확정';
COMMENT ON COLUMN organization.profile_status IS '점진적 온보딩 상태';

CREATE UNIQUE INDEX ux_org_biz_reg_no
    ON organization (country_code, biz_reg_no)
    WHERE deleted_at IS NULL AND biz_reg_no IS NOT NULL;
CREATE INDEX ix_org_approval ON organization (approval_status) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_org_version BEFORE UPDATE ON organization
    FOR EACH ROW EXECUTE FUNCTION fn_bump_version();


CREATE TABLE user_account (
    user_id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_uuid       UUID         NOT NULL DEFAULT gen_random_uuid(),
    org_id            BIGINT       REFERENCES organization(org_id),
    account_type      VARCHAR(20)  NOT NULL DEFAULT 'BUSINESS'
                      CHECK (account_type IN ('PERSONAL','BUSINESS','ADMIN')),
    login_id          VARCHAR(60),
    email             VARCHAR(200) NOT NULL,
    email_verified    BOOLEAN      NOT NULL DEFAULT FALSE,
    password_hash     VARCHAR(200),
    phone             VARCHAR(30),
    phone_verified    BOOLEAN      NOT NULL DEFAULT FALSE,
    ci_value          VARCHAR(200),
    sns_provider      VARCHAR(20)
                      CHECK (sns_provider IN ('KAKAO','NAVER','GOOGLE')),
    sns_subject       VARCHAR(200),
    display_name      VARCHAR(100),
    onboarding_step   VARCHAR(30)  NOT NULL DEFAULT 'SIGNED_UP'
                      CHECK (onboarding_step IN
                             ('SIGNED_UP','PROFILE_INPUT','DOC_SUBMITTED','COMPLETED')),
    status            VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                      CHECK (status IN ('ACTIVE','LOCKED','SUSPENDED','WITHDRAWN')),
    failed_login_count SMALLINT    NOT NULL DEFAULT 0,
    locked_until      TIMESTAMPTZ,
    last_login_at     TIMESTAMPTZ,
    locale            VARCHAR(10)  NOT NULL DEFAULT 'ko',
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by        BIGINT,
    updated_by        BIGINT,
    deleted_at        TIMESTAMPTZ,
    CONSTRAINT ck_user_credential
        CHECK (password_hash IS NOT NULL OR sns_provider IS NOT NULL)
);
COMMENT ON COLUMN user_account.ci_value IS '휴대폰 본인인증 연계정보. 주민등록번호는 수집하지 않음';

CREATE UNIQUE INDEX ux_user_login_id ON user_account (login_id)
    WHERE deleted_at IS NULL AND login_id IS NOT NULL;
CREATE UNIQUE INDEX ux_user_email ON user_account (email)
    WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX ux_user_sns ON user_account (sns_provider, sns_subject)
    WHERE deleted_at IS NULL AND sns_provider IS NOT NULL;
CREATE INDEX ix_user_org ON user_account (org_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_user_touch BEFORE UPDATE ON user_account
    FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

ALTER TABLE organization
    ADD CONSTRAINT fk_org_approved_by FOREIGN KEY (approved_by)
    REFERENCES user_account(user_id);


CREATE TABLE user_role (
    user_id    BIGINT      NOT NULL REFERENCES user_account(user_id) ON DELETE CASCADE,
    role_code  VARCHAR(30) NOT NULL REFERENCES role(role_code),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    granted_by BIGINT      REFERENCES user_account(user_id),
    CONSTRAINT pk_user_role PRIMARY KEY (user_id, role_code)
);


CREATE TABLE auth_token (
    token_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT      REFERENCES user_account(user_id) ON DELETE CASCADE,
    target      VARCHAR(200) NOT NULL,
    token_type  VARCHAR(30)  NOT NULL
                CHECK (token_type IN ('PWD_RESET','EMAIL_VERIFY','PHONE_OTP','MFA_OTP')),
    token_hash  VARCHAR(200) NOT NULL,
    expires_at  TIMESTAMPTZ  NOT NULL,
    used_at     TIMESTAMPTZ,
    attempt_cnt SMALLINT     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON COLUMN auth_token.target IS '이메일 또는 휴대폰 번호. 계정 생성 전에도 발급 가능';
CREATE INDEX ix_auth_token_lookup ON auth_token (token_hash, token_type)
    WHERE used_at IS NULL;


CREATE TABLE user_session (
    session_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         BIGINT      NOT NULL REFERENCES user_account(user_id) ON DELETE CASCADE,
    refresh_hash    VARCHAR(200) NOT NULL,
    ip_address      INET,
    user_agent      VARCHAR(400),
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    revoke_reason   VARCHAR(50)
);
CREATE INDEX ix_session_user ON user_session (user_id) WHERE revoked_at IS NULL;


CREATE TABLE login_history (
    history_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT      REFERENCES user_account(user_id),
    login_id    VARCHAR(60),
    result      VARCHAR(20) NOT NULL
                CHECK (result IN ('SUCCESS','BAD_PASSWORD','LOCKED','MFA_FAIL','NO_ACCOUNT')),
    ip_address  INET,
    user_agent  VARCHAR(400),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_login_history_user ON login_history (user_id, created_at DESC);


CREATE TABLE user_agreement (
    agreement_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id       BIGINT      NOT NULL REFERENCES user_account(user_id) ON DELETE CASCADE,
    terms_code    VARCHAR(40) NOT NULL,
    terms_version VARCHAR(20) NOT NULL,
    is_required   BOOLEAN     NOT NULL,
    agreed        BOOLEAN     NOT NULL,
    agreed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address    INET
);
COMMENT ON TABLE user_agreement IS '약관/개인정보 동의 이력. 법적 증빙이므로 수정·삭제 금지';
CREATE INDEX ix_agreement_user ON user_agreement (user_id);


CREATE TABLE attachment (
    attachment_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_type        VARCHAR(30)  NOT NULL
                      CHECK (owner_type IN ('ORGANIZATION','TIER_APPLICATION','USER')),
    owner_id          BIGINT       NOT NULL,
    purpose           VARCHAR(40)  NOT NULL
                      CHECK (purpose IN ('BIZ_LICENSE','TIER_EVIDENCE','AGENCY_LETTER','LOGO','ETC')),
    file_name         VARCHAR(300) NOT NULL,
    file_uri          TEXT         NOT NULL,
    content_hash      CHAR(64)     NOT NULL,
    mime_type         VARCHAR(100),
    file_size         BIGINT,
    virus_scan_status VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                      CHECK (virus_scan_status IN ('PENDING','CLEAN','INFECTED','SKIPPED')),
    uploaded_by       BIGINT       REFERENCES user_account(user_id),
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ
);
COMMENT ON TABLE attachment IS 'DPP에 속하지 않는 파일(사업자등록증 등). 파일 실체는 오브젝트 스토리지';
CREATE INDEX ix_attachment_owner ON attachment (owner_type, owner_id) WHERE deleted_at IS NULL;


CREATE TABLE tier_application (
    application_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    org_id                  BIGINT      NOT NULL REFERENCES organization(org_id),
    requested_tier          SMALLINT    NOT NULL CHECK (requested_tier BETWEEN 1 AND 3),
    reason                  VARCHAR(1000),
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING','AUTO_PASS','EXCEPTION','APPROVED','REJECTED')),
    auto_review_result      VARCHAR(20),
    auto_review_fail_reason VARCHAR(500),
    reject_reason           VARCHAR(500),
    reviewed_by             BIGINT      REFERENCES user_account(user_id),
    reviewed_at             TIMESTAMPTZ,
    applied_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by              BIGINT,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON COLUMN tier_application.auto_review_result IS '1차에서는 항상 NULL. 자동심사 도입 시 사용';
CREATE INDEX ix_tier_app_status ON tier_application (status, applied_at);


CREATE TABLE invitation (
    invitation_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    inviter_org_id  BIGINT       NOT NULL REFERENCES organization(org_id),
    invitee_email   VARCHAR(200) NOT NULL,
    role_code       VARCHAR(30)  NOT NULL REFERENCES role(role_code),
    token           VARCHAR(100) NOT NULL UNIQUE,
    status          VARCHAR(20)  NOT NULL DEFAULT 'SENT'
                    CHECK (status IN ('SENT','ACCEPTED','EXPIRED','REVOKED')),
    accepted_org_id BIGINT       REFERENCES organization(org_id),
    expires_at      TIMESTAMPTZ  NOT NULL,
    accepted_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by      BIGINT       REFERENCES user_account(user_id)
);


-- =====================================================================
-- 4. 시설 / 생애주기 마스터
-- =====================================================================
CREATE TABLE facility (
    facility_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    org_id        BIGINT       NOT NULL REFERENCES organization(org_id),
    ufi           VARCHAR(50),
    facility_name VARCHAR(200) NOT NULL,
    facility_type VARCHAR(40),
    country_code  CHAR(2),
    address_line1 VARCHAR(300),
    latitude      NUMERIC(9,6),
    longitude     NUMERIC(9,6),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);
CREATE UNIQUE INDEX ux_facility_ufi ON facility (ufi)
    WHERE deleted_at IS NULL AND ufi IS NOT NULL;


CREATE TABLE lifecycle_stage_def (
    domain         VARCHAR(20) NOT NULL
                   CHECK (domain IN ('STEEL','TEXTILE','BATTERY')),
    stage_no       SMALLINT    NOT NULL CHECK (stage_no BETWEEN 1 AND 12),
    stage_code     VARCHAR(40) NOT NULL,
    stage_name_ko  VARCHAR(100) NOT NULL,
    stage_name_en  VARCHAR(100),
    is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
    requires_anchor BOOLEAN    NOT NULL DEFAULT FALSE,
    CONSTRAINT pk_lifecycle_stage_def PRIMARY KEY (domain, stage_no)
);
COMMENT ON COLUMN lifecycle_stage_def.is_active IS 'FALSE = 이 도메인에서는 추적하지 않는 단계';


-- =====================================================================
-- 5. 블록체인 앵커 (다른 테이블보다 먼저 생성 - 참조 대상)
-- =====================================================================
CREATE TABLE blockchain_anchor (
    anchor_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    target_type   VARCHAR(20) NOT NULL
                  CHECK (target_type IN ('DPP_SNAPSHOT','DOCUMENT','EVENT')),
    target_id     BIGINT      NOT NULL,
    content_hash  CHAR(64)    NOT NULL,
    channel_name  VARCHAR(60),
    chaincode     VARCHAR(60),
    tx_id         VARCHAR(120),
    block_no      BIGINT,
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING','MOCK','CONFIRMED','FAILED')),
    retry_count   SMALLINT    NOT NULL DEFAULT 0,
    error_message VARCHAR(500),
    anchored_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE blockchain_anchor IS 'append-only. UPDATE는 status/tx_id 확정 시에만 허용';
COMMENT ON COLUMN blockchain_anchor.status IS 'MOCK = 1차 프로토타입(해시는 실제, tx_id는 가상)';
CREATE INDEX ix_anchor_target ON blockchain_anchor (target_type, target_id);
CREATE INDEX ix_anchor_status ON blockchain_anchor (status) WHERE status IN ('PENDING','FAILED');


-- =====================================================================
-- 6. 제품 / DPP
-- =====================================================================
CREATE TABLE product_model (
    model_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    org_id          BIGINT       NOT NULL REFERENCES organization(org_id),
    internal_sku    VARCHAR(60)  NOT NULL,
    gtin            VARCHAR(14),
    model_name      VARCHAR(200) NOT NULL,
    brand           VARCHAR(100),
    category_code   VARCHAR(40),
    hs_code         VARCHAR(12),
    origin_country  CHAR(2),
    domain          VARCHAR(20)  NOT NULL
                    CHECK (domain IN ('STEEL','TEXTILE','BATTERY')),
    granularity     VARCHAR(10)  NOT NULL DEFAULT 'BATCH'
                    CHECK (granularity IN ('MODEL','BATCH','ITEM')),
    repair_grade    VARCHAR(5),
    warranty_months SMALLINT,
    spare_part_years SMALLINT,
    status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('DRAFT','ACTIVE','ARCHIVED')),
    version         INT          NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by      BIGINT,
    updated_by      BIGINT,
    deleted_at      TIMESTAMPTZ
);
COMMENT ON COLUMN product_model.gtin IS 'GS1 실발급이 어려우면 NULL. internal_sku가 필수 식별자';
COMMENT ON COLUMN product_model.granularity IS 'STEEL=BATCH, TEXTILE=BATCH, BATTERY=ITEM';

CREATE UNIQUE INDEX ux_model_sku ON product_model (org_id, internal_sku)
    WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX ux_model_gtin ON product_model (gtin)
    WHERE deleted_at IS NULL AND gtin IS NOT NULL;

CREATE TRIGGER trg_model_version BEFORE UPDATE ON product_model
    FOR EACH ROW EXECUTE FUNCTION fn_bump_version();


CREATE TABLE batch (
    batch_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    model_id       BIGINT      NOT NULL REFERENCES product_model(model_id),
    facility_id    BIGINT      REFERENCES facility(facility_id),
    batch_key_type VARCHAR(10) NOT NULL DEFAULT 'HEAT'
                   CHECK (batch_key_type IN ('HEAT','CAST','LOT')),
    heat_no        VARCHAR(60),
    cast_no        VARCHAR(60),
    lot_no         VARCHAR(60),
    quantity       NUMERIC(14,3),
    quantity_unit  VARCHAR(10),
    produced_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at     TIMESTAMPTZ,
    CONSTRAINT ck_batch_key CHECK (
        (batch_key_type = 'HEAT' AND heat_no IS NOT NULL) OR
        (batch_key_type = 'CAST' AND cast_no IS NOT NULL) OR
        (batch_key_type = 'LOT'  AND lot_no  IS NOT NULL)
    )
);
CREATE UNIQUE INDEX ux_batch_heat ON batch (model_id, heat_no)
    WHERE deleted_at IS NULL AND heat_no IS NOT NULL;


CREATE TABLE dpp (
    dpp_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_uuid     UUID         NOT NULL DEFAULT gen_random_uuid(),
    model_id        BIGINT       NOT NULL REFERENCES product_model(model_id),
    batch_id        BIGINT       REFERENCES batch(batch_id),
    owner_org_id    BIGINT       NOT NULL REFERENCES organization(org_id),
    serial_number   VARCHAR(100),
    domain          VARCHAR(20)  NOT NULL
                    CHECK (domain IN ('STEEL','TEXTILE','BATTERY')),
    lifecycle_stage SMALLINT     NOT NULL DEFAULT 1
                    CHECK (lifecycle_stage BETWEEN 1 AND 12),
    status          VARCHAR(20)  NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT','PENDING','ACTIVE','SUSPENDED','EOL')),
    attributes      JSONB        NOT NULL DEFAULT '{}',
    completeness    NUMERIC(5,2) NOT NULL DEFAULT 0,
    filled_count    SMALLINT     NOT NULL DEFAULT 0,
    required_count  SMALLINT     NOT NULL DEFAULT 0,
    issued_at       TIMESTAMPTZ,
    version         INT          NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by      BIGINT,
    updated_by      BIGINT,
    deleted_at      TIMESTAMPTZ
);
COMMENT ON COLUMN dpp.attributes IS 'dpp_field_value에서 파생된 조회용 캐시. 원천 아님';
COMMENT ON COLUMN dpp.completeness IS 'filled_count / required_count * 100';

CREATE UNIQUE INDEX ux_dpp_public_uuid ON dpp (public_uuid);
CREATE UNIQUE INDEX ux_dpp_serial ON dpp (model_id, serial_number)
    WHERE deleted_at IS NULL AND serial_number IS NOT NULL;
CREATE INDEX ix_dpp_owner ON dpp (owner_org_id, status) WHERE deleted_at IS NULL;
CREATE INDEX ix_dpp_batch ON dpp (batch_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_dpp_attributes ON dpp USING GIN (attributes);

CREATE TRIGGER trg_dpp_version BEFORE UPDATE ON dpp
    FOR EACH ROW EXECUTE FUNCTION fn_bump_version();


CREATE TABLE dpp_snapshot (
    snapshot_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dpp_id         BIGINT      NOT NULL REFERENCES dpp(dpp_id),
    version_no     INT         NOT NULL,
    payload        JSONB       NOT NULL,
    content_hash   CHAR(64)    NOT NULL,
    anchor_id      BIGINT      REFERENCES blockchain_anchor(anchor_id),
    trigger_reason VARCHAR(30) NOT NULL
                   CHECK (trigger_reason IN
                          ('ISSUE','DOC_APPROVED','CUSTOMS','OWNER_CHANGE','EOL','MANUAL')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by     BIGINT,
    CONSTRAINT ux_snapshot_version UNIQUE (dpp_id, version_no)
);
COMMENT ON TABLE dpp_snapshot IS 'append-only. 앵커 시점의 DPP 전체를 동결. 수정·삭제 금지';
CREATE INDEX ix_snapshot_hash ON dpp_snapshot (content_hash);


CREATE TABLE data_carrier (
    carrier_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dpp_id           BIGINT      NOT NULL REFERENCES dpp(dpp_id),
    carrier_type     VARCHAR(10) NOT NULL DEFAULT 'QR'
                     CHECK (carrier_type IN ('QR','NFC','RFID','BARCODE')),
    digital_link_uri TEXT        NOT NULL,
    image_uri        TEXT,
    is_primary       BOOLEAN     NOT NULL DEFAULT TRUE,
    generated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_carrier_dpp ON data_carrier (dpp_id);


CREATE TABLE dpp_participant (
    participant_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dpp_id         BIGINT      NOT NULL REFERENCES dpp(dpp_id),
    org_id         BIGINT      REFERENCES organization(org_id),
    guest_email    VARCHAR(200),
    role_code      VARCHAR(30) NOT NULL REFERENCES role(role_code),
    submit_status  VARCHAR(20) NOT NULL DEFAULT 'INVITED'
                   CHECK (submit_status IN ('INVITED','IN_PROGRESS','SUBMITTED','COMPLETED')),
    invited_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at   TIMESTAMPTZ,
    CONSTRAINT ck_participant_identity
        CHECK (org_id IS NOT NULL OR guest_email IS NOT NULL)
);
COMMENT ON TABLE dpp_participant IS '직접 제출 원칙. 계정 없는 협력사는 guest_email로 참여';
CREATE UNIQUE INDEX ux_participant ON dpp_participant (dpp_id, org_id, role_code)
    WHERE org_id IS NOT NULL;


-- =====================================================================
-- 7. 규정 메타
-- =====================================================================
CREATE TABLE requirement_field (
    field_code          VARCHAR(60)  PRIMARY KEY,
    domain              VARCHAR(20)  NOT NULL
                        CHECK (domain IN ('COMMON','STEEL','TEXTILE','BATTERY')),
    section             VARCHAR(40)  NOT NULL,
    label_ko            VARCHAR(200) NOT NULL,
    label_en            VARCHAR(200),
    field_kind          VARCHAR(20)  NOT NULL DEFAULT 'DATA'
                        CHECK (field_kind IN ('DATA','DOCUMENT')),
    storage_target      VARCHAR(30)  NOT NULL DEFAULT 'FIELD_VALUE'
                        CHECK (storage_target IN ('FIELD_VALUE','MATERIAL_COMPOSITION','DOCUMENT')),
    data_type           VARCHAR(20)  NOT NULL DEFAULT 'STRING'
                        CHECK (data_type IN ('STRING','NUMBER','BOOLEAN','DATE','CODE','TEXT','JSON')),
    unit                VARCHAR(20),
    code_group          VARCHAR(40),
    linked_doc_type     VARCHAR(40),
    material_entry_kind VARCHAR(20)
                        CHECK (material_entry_kind IN ('MATERIAL','CHEM_ELEMENT','SOC')),
    is_required         BOOLEAN      NOT NULL DEFAULT FALSE,
    is_auto             BOOLEAN      NOT NULL DEFAULT FALSE,
    responsible_role    VARCHAR(30)  REFERENCES role(role_code),
    validation_rule     VARCHAR(300),
    help_text           VARCHAR(500),
    sort_order          INT          NOT NULL DEFAULT 0,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE
);
COMMENT ON COLUMN requirement_field.is_auto IS 'TRUE = 시스템 자동 생성. 완성도 분모에서 제외';
COMMENT ON COLUMN requirement_field.storage_target IS '실제 값이 저장되는 테이블';


CREATE TABLE field_visibility (
    field_code  VARCHAR(60) NOT NULL REFERENCES requirement_field(field_code) ON DELETE CASCADE,
    tier_level  SMALLINT    NOT NULL CHECK (tier_level BETWEEN 1 AND 3),
    visibility  VARCHAR(10) NOT NULL DEFAULT 'HIDDEN'
                CHECK (visibility IN ('FULL','MASKED','HIDDEN')),
    CONSTRAINT pk_field_visibility PRIMARY KEY (field_code, tier_level)
);


CREATE TABLE dpp_field_value (
    value_id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dpp_id             BIGINT       NOT NULL REFERENCES dpp(dpp_id),
    field_code         VARCHAR(60)  NOT NULL REFERENCES requirement_field(field_code),
    value_text         TEXT,
    value_num          NUMERIC(20,6),
    value_bool         BOOLEAN,
    value_date         DATE,
    value_json         JSONB,
    submitted_by_org   BIGINT       REFERENCES organization(org_id),
    submitted_by_user  BIGINT       REFERENCES user_account(user_id),
    guest_email        VARCHAR(200),
    signature          VARCHAR(500),
    source_document_id BIGINT,
    submitted_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ux_dpp_field UNIQUE (dpp_id, field_code)
);
COMMENT ON COLUMN dpp_field_value.signature IS '제출 증적 해시. 1차는 토큰+이메일+시각+파일해시 조합';
CREATE INDEX ix_field_value_dpp ON dpp_field_value (dpp_id);


-- =====================================================================
-- 8. 문서
-- =====================================================================
CREATE TABLE document_type (
    doc_type_code    VARCHAR(40)  PRIMARY KEY,
    name_ko          VARCHAR(200) NOT NULL,
    name_en          VARCHAR(200),
    domain           VARCHAR(20)  NOT NULL DEFAULT 'COMMON'
                     CHECK (domain IN ('COMMON','STEEL','TEXTILE','BATTERY')),
    is_zkp_target    BOOLEAN      NOT NULL DEFAULT FALSE,
    requires_expiry  BOOLEAN      NOT NULL DEFAULT FALSE,
    responsible_role VARCHAR(30)  REFERENCES role(role_code),
    default_owner    VARCHAR(20)  NOT NULL DEFAULT 'DPP'
                     CHECK (default_owner IN ('MODEL','BATCH','DPP','ORGANIZATION')),
    allowed_mime     VARCHAR(300) NOT NULL DEFAULT 'application/pdf',
    sort_order       INT          NOT NULL DEFAULT 0,
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE
);
COMMENT ON COLUMN document_type.default_owner IS '문서를 어느 단위에 붙일지. Mill Sheet=BATCH';


CREATE TABLE document (
    document_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doc_type_code     VARCHAR(40)  NOT NULL REFERENCES document_type(doc_type_code),
    owner_type        VARCHAR(20)  NOT NULL
                      CHECK (owner_type IN ('MODEL','BATCH','DPP','ORGANIZATION')),
    owner_id          BIGINT       NOT NULL,
    submitted_by_org  BIGINT       REFERENCES organization(org_id),
    guest_email       VARCHAR(200),
    file_name         VARCHAR(300) NOT NULL,
    file_uri          TEXT         NOT NULL,
    content_hash      CHAR(64)     NOT NULL,
    mime_type         VARCHAR(100),
    file_size         BIGINT,
    virus_scan_status VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                      CHECK (virus_scan_status IN ('PENDING','CLEAN','INFECTED','SKIPPED')),
    issuer            VARCHAR(200),
    issued_at         TIMESTAMPTZ,
    expires_at        TIMESTAMPTZ,
    review_status     VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                      CHECK (review_status IN ('PENDING','APPROVED','REJECTED','EXPIRED')),
    parsed_at         TIMESTAMPTZ,
    version           INT          NOT NULL DEFAULT 1,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by        BIGINT,
    deleted_at        TIMESTAMPTZ
);
COMMENT ON COLUMN document.owner_type IS '배치 단위 문서 1건이 DPP 다수에 상속됨';
CREATE INDEX ix_document_owner ON document (owner_type, owner_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_document_expiry ON document (expires_at)
    WHERE deleted_at IS NULL AND expires_at IS NOT NULL;
CREATE UNIQUE INDEX ux_document_dedup ON document (owner_type, owner_id, doc_type_code, content_hash)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_document_version BEFORE UPDATE ON document
    FOR EACH ROW EXECUTE FUNCTION fn_bump_version();

ALTER TABLE dpp_field_value
    ADD CONSTRAINT fk_field_value_document FOREIGN KEY (source_document_id)
    REFERENCES document(document_id);


CREATE TABLE document_link (
    link_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_id BIGINT      NOT NULL REFERENCES document(document_id) ON DELETE CASCADE,
    dpp_id      BIGINT      NOT NULL REFERENCES dpp(dpp_id) ON DELETE CASCADE,
    link_type   VARCHAR(20) NOT NULL DEFAULT 'DIRECT'
                CHECK (link_type IN ('DIRECT','INHERITED')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ux_document_link UNIQUE (document_id, dpp_id)
);
COMMENT ON TABLE document_link IS '문서 1건 : DPP 다수. 배치 문서 상속을 표현';
CREATE INDEX ix_doc_link_dpp ON document_link (dpp_id);


CREATE TABLE document_review (
    review_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_id        BIGINT      NOT NULL REFERENCES document(document_id),
    reviewer_user_id   BIGINT      REFERENCES user_account(user_id),
    action             VARCHAR(20) NOT NULL
                       CHECK (action IN ('APPROVE','REJECT','REQUEST_FIX')),
    reject_reason_code VARCHAR(40),
    reason_detail      VARCHAR(1000),
    reviewed_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON COLUMN document_review.reject_reason_code IS '반려 사유 자동 문구 생성용 코드';
CREATE INDEX ix_doc_review_doc ON document_review (document_id, reviewed_at DESC);


CREATE TABLE document_request (
    request_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dpp_id           BIGINT       REFERENCES dpp(dpp_id),
    batch_id         BIGINT       REFERENCES batch(batch_id),
    doc_type_code    VARCHAR(40)  NOT NULL REFERENCES document_type(doc_type_code),
    field_code       VARCHAR(60)  REFERENCES requirement_field(field_code),
    target_org_id    BIGINT       REFERENCES organization(org_id),
    target_email     VARCHAR(200) NOT NULL,
    token            VARCHAR(100) NOT NULL UNIQUE,
    token_expires_at TIMESTAMPTZ  NOT NULL,
    used_at          TIMESTAMPTZ,
    status           VARCHAR(20)  NOT NULL DEFAULT 'SENT'
                     CHECK (status IN ('SENT','OPENED','SUBMITTED','EXPIRED','CANCELLED')),
    due_at           TIMESTAMPTZ,
    reminder_count   SMALLINT     NOT NULL DEFAULT 0,
    last_reminded_at TIMESTAMPTZ,
    requested_by     BIGINT       REFERENCES user_account(user_id),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_request_target CHECK (dpp_id IS NOT NULL OR batch_id IS NOT NULL)
);
COMMENT ON TABLE document_request IS '게스트 업로드 링크. 계정 없는 협력사도 제출 가능';
CREATE INDEX ix_doc_request_due ON document_request (due_at) WHERE status IN ('SENT','OPENED');


CREATE TABLE material_composition (
    composition_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dpp_id             BIGINT       NOT NULL REFERENCES dpp(dpp_id) ON DELETE CASCADE,
    entry_kind         VARCHAR(20)  NOT NULL DEFAULT 'MATERIAL'
                       CHECK (entry_kind IN ('MATERIAL','CHEM_ELEMENT','SOC')),
    material_name      VARCHAR(200) NOT NULL,
    cas_number         VARCHAR(20),
    content_rate       NUMERIC(9,4),
    content_unit       VARCHAR(10)  NOT NULL DEFAULT 'PERCENT',
    is_hazardous       BOOLEAN      NOT NULL DEFAULT FALSE,
    svhc_flag          BOOLEAN      NOT NULL DEFAULT FALSE,
    recycled_rate      NUMERIC(5,2),
    part_location      VARCHAR(200),
    source_document_id BIGINT       REFERENCES document(document_id),
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE material_composition IS '화학조성/우려물질/재생함량. 문서 자동 파싱 결과 매핑 대상';
CREATE INDEX ix_material_dpp ON material_composition (dpp_id, entry_kind);
CREATE INDEX ix_material_cas ON material_composition (cas_number) WHERE cas_number IS NOT NULL;


-- =====================================================================
-- 9. 이벤트 / 검증
-- =====================================================================
CREATE TABLE lifecycle_event (
    event_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dpp_id          BIGINT      NOT NULL REFERENCES dpp(dpp_id),
    event_type      VARCHAR(40) NOT NULL,
    lifecycle_stage SMALLINT    CHECK (lifecycle_stage BETWEEN 1 AND 12),
    actor_org_id    BIGINT      REFERENCES organization(org_id),
    actor_user_id   BIGINT      REFERENCES user_account(user_id),
    payload         JSONB       NOT NULL DEFAULT '{}',
    is_anchored     BOOLEAN     NOT NULL DEFAULT FALSE,
    anchor_id       BIGINT      REFERENCES blockchain_anchor(anchor_id),
    occurred_at     TIMESTAMPTZ NOT NULL,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE lifecycle_event IS 'append-only. UPDATE/DELETE 금지';
CREATE INDEX ix_event_dpp ON lifecycle_event (dpp_id, occurred_at DESC);
CREATE INDEX ix_event_payload ON lifecycle_event USING GIN (payload);


CREATE TABLE zkp_proof (
    proof_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dpp_id         BIGINT       NOT NULL REFERENCES dpp(dpp_id),
    target_type    VARCHAR(20)  NOT NULL DEFAULT 'DOCUMENT'
                   CHECK (target_type IN ('DOCUMENT','FIELD','DPP')),
    document_id    BIGINT       REFERENCES document(document_id),
    field_code     VARCHAR(60)  REFERENCES requirement_field(field_code),
    claim_type     VARCHAR(30)  NOT NULL
                   CHECK (claim_type IN ('ORIGIN','CERT_VALID','RECYCLED_RATE','CUSTOMS_FIT','CARBON_LIMIT')),
    circuit_name   VARCHAR(100),
    proof_data     TEXT,
    public_signals JSONB,
    status         VARCHAR(20)  NOT NULL DEFAULT 'REQUESTED'
                   CHECK (status IN ('REQUESTED','GENERATED','VERIFIED','REJECTED','MOCK')),
    verified_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_zkp_dpp ON zkp_proof (dpp_id, status);


CREATE TABLE compliance_rule (
    rule_code   VARCHAR(40)  PRIMARY KEY,
    regulation  VARCHAR(30)  NOT NULL
                CHECK (regulation IN ('RoHS','REACH','ESPR','WEEE','BASEL','CE','CBAM')),
    domain      VARCHAR(20)  NOT NULL DEFAULT 'COMMON',
    description VARCHAR(500) NOT NULL,
    expression  VARCHAR(500),
    severity    VARCHAR(10)  NOT NULL DEFAULT 'MEDIUM'
                CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE
);


CREATE TABLE compliance_check (
    check_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dpp_id     BIGINT      NOT NULL REFERENCES dpp(dpp_id),
    rule_code  VARCHAR(40) NOT NULL REFERENCES compliance_rule(rule_code),
    result     VARCHAR(10) NOT NULL CHECK (result IN ('PASS','FAIL','NA','UNKNOWN')),
    detail     JSONB       NOT NULL DEFAULT '{}',
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ux_compliance_check UNIQUE (dpp_id, rule_code)
);


CREATE TABLE customs_clearance (
    clearance_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dpp_id           BIGINT      NOT NULL REFERENCES dpp(dpp_id),
    shipment_id      BIGINT,
    snapshot_id      BIGINT      REFERENCES dpp_snapshot(snapshot_id),
    customs_org_id   BIGINT      REFERENCES organization(org_id),
    hs_code          VARCHAR(12),
    decision         VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                     CHECK (decision IN ('PENDING','APPROVE','HOLD','REJECT')),
    reason           VARCHAR(1000),
    integrity_result VARCHAR(20)
                     CHECK (integrity_result IN ('MATCH','MISMATCH','NOT_ANCHORED')),
    decided_by       BIGINT      REFERENCES user_account(user_id),
    decided_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON COLUMN customs_clearance.shipment_id IS 'Phase 2 물류 모듈용 자리. 1차 미사용';
COMMENT ON COLUMN customs_clearance.snapshot_id IS '심사 대상이 된 DPP 시점 스냅샷';
CREATE INDEX ix_clearance_decision ON customs_clearance (decision, created_at);


CREATE TABLE registry_entry (
    entry_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dpp_id        BIGINT       NOT NULL REFERENCES dpp(dpp_id),
    registry_uid  VARCHAR(100) NOT NULL UNIQUE,
    hs_code       VARCHAR(12),
    product_name  VARCHAR(200),
    org_name      VARCHAR(200),
    status        VARCHAR(20)  NOT NULL DEFAULT 'REGISTERED'
                  CHECK (status IN ('REGISTERED','UPDATED','WITHDRAWN')),
    registered_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE registry_entry IS 'EU DPP 레지스트리 자체 구현본. ESPR 제13조';


-- =====================================================================
-- 10. 알림 / 감사
-- =====================================================================
CREATE TABLE notification (
    notification_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recipient_user_id   BIGINT       REFERENCES user_account(user_id),
    recipient_org_id    BIGINT       REFERENCES organization(org_id),
    recipient_role_code VARCHAR(30)  REFERENCES role(role_code),
    category            VARCHAR(30)  NOT NULL
                        CHECK (category IN ('CERT','TIER','SYSTEM','ZKP','CUSTOMS','ACCOUNT','SECURITY','INQUIRY')),
    sub_type            VARCHAR(40),
    title               VARCHAR(200) NOT NULL,
    body                VARCHAR(1000),
    link_url            VARCHAR(500),
    channel             VARCHAR(20)  NOT NULL DEFAULT 'IN_APP'
                        CHECK (channel IN ('IN_APP','EMAIL','PUSH')),
    is_read             BOOLEAN      NOT NULL DEFAULT FALSE,
    read_at             TIMESTAMPTZ,
    sent_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_notification_recipient CHECK (
        recipient_user_id IS NOT NULL OR
        recipient_org_id  IS NOT NULL OR
        recipient_role_code IS NOT NULL
    )
);
CREATE INDEX ix_notification_user ON notification (recipient_user_id, is_read, created_at DESC);


CREATE TABLE notification_setting (
    user_id    BIGINT      NOT NULL REFERENCES user_account(user_id) ON DELETE CASCADE,
    category   VARCHAR(30) NOT NULL,
    channel    VARCHAR(20) NOT NULL,
    enabled    BOOLEAN     NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_notification_setting PRIMARY KEY (user_id, category, channel)
);


CREATE TABLE audit_log (
    log_id        BIGINT GENERATED ALWAYS AS IDENTITY,
    actor_user_id BIGINT       REFERENCES user_account(user_id),
    actor_org_id  BIGINT       REFERENCES organization(org_id),
    action        VARCHAR(20)  NOT NULL
                  CHECK (action IN ('CREATE','UPDATE','DELETE','APPROVE','REJECT','LOGIN','EXPORT')),
    target_type   VARCHAR(40)  NOT NULL,
    target_id     BIGINT,
    before_value  JSONB,
    after_value   JSONB,
    ip_address    INET,
    user_agent    VARCHAR(400),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_audit_log PRIMARY KEY (log_id, created_at)
) PARTITION BY RANGE (created_at);

COMMENT ON TABLE audit_log IS 'append-only. 월 단위 파티션. 조회(READ)는 기록하지 않음';

CREATE TABLE audit_log_2026_01 PARTITION OF audit_log
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE audit_log_2026_02 PARTITION OF audit_log
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE audit_log_2026_03 PARTITION OF audit_log
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE audit_log_2026_04 PARTITION OF audit_log
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE audit_log_2026_05 PARTITION OF audit_log
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE audit_log_2026_06 PARTITION OF audit_log
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE audit_log_2026_07 PARTITION OF audit_log
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE audit_log_2026_08 PARTITION OF audit_log
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE audit_log_2026_09 PARTITION OF audit_log
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE audit_log_2026_10 PARTITION OF audit_log
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE audit_log_2026_11 PARTITION OF audit_log
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE audit_log_2026_12 PARTITION OF audit_log
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
CREATE TABLE audit_log_default PARTITION OF audit_log DEFAULT;

CREATE INDEX ix_audit_target ON audit_log (target_type, target_id, created_at DESC);
CREATE INDEX ix_audit_actor  ON audit_log (actor_user_id, created_at DESC);
