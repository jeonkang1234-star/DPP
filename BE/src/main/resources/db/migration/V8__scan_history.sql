-- =====================================================================
-- REQ-MYPAGE(개인): 제품 조회(스캔) 이력.
-- dpp_id는 FK가 아니라 nullable 참고용 컬럼이다 - product/dpp 발급 도메인이 아직
-- Java로 구현되지 않아 dpp 테이블에 실 데이터가 없는 상태에서도, "무엇을 스캔했는지"
-- 스냅샷(passport_code/product_name/brand_name/status)만으로 이력을 남길 수 있어야
-- 하기 때문. 나중에 dpp 도메인이 생기면 이 컬럼으로 조인해서 최신 정보를 보강하면 된다.
-- =====================================================================

CREATE TABLE scan_history (
    scan_id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id             BIGINT       NOT NULL REFERENCES user_account(user_id) ON DELETE CASCADE,
    dpp_id              BIGINT       REFERENCES dpp(dpp_id),
    passport_code       VARCHAR(100) NOT NULL,
    product_name        VARCHAR(200) NOT NULL,
    brand_name          VARCHAR(200),
    status              VARCHAR(20)  NOT NULL DEFAULT 'VERIFIED'
                        CHECK (status IN ('VERIFIED', 'UPDATED', 'FAILED')),
    scanned_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    passport_updated_at TIMESTAMPTZ,
    removed_at          TIMESTAMPTZ
);

COMMENT ON COLUMN scan_history.status IS 'VERIFIED=검증됨, UPDATED=정보 갱신됨, FAILED=검증 실패';
COMMENT ON COLUMN scan_history.removed_at IS '사용자가 "기록 삭제"한 시각 - 소프트 삭제, 여권 자체는 안 지움';

CREATE INDEX ix_scan_history_user ON scan_history (user_id, removed_at, scanned_at DESC);
