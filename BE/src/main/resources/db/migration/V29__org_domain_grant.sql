-- 제조사 도메인 확장 - 신청 -> 관리자 심사 -> 승인된 도메인으로 DPP 발급.
--
-- 2026-08-22 강 요청: "제조사마다 도메인을 확장할 수 있게 마이페이지에서 도메인 확장신청
-- 버튼을 누르고 문서를 업로드하면, 관리자가 회원관리 탭에서 문서를 리더기로 확인하고
-- 승인하면 DPP 생성 탭에서 허용된 도메인을 고를 수 있게".
--
-- 왜 organization.domain을 늘리지 않는가: 그 컬럼은 "이 회사의 주력 도메인" 하나만 담는
-- 단일 값이고 가입 시점에 확정된다. 확장은 여러 건이 쌓이고 각각 심사 상태·증빙서류·
-- 심사자를 따로 가져야 해서 별도 테이블이 맞다. organization.domain은 그대로 두고,
-- "허용 도메인 = organization.domain + 이 표의 APPROVED"로 계산한다.
CREATE TABLE org_domain_grant (
    grant_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    org_id         BIGINT       NOT NULL REFERENCES organization(org_id),
    domain         VARCHAR(20)  NOT NULL
                   CHECK (domain IN ('STEEL','TEXTILE','BATTERY')),
    status         VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                   CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    -- 신청 사유(제조사가 직접 적는다) / 반려 사유(관리자가 적는다)
    request_reason VARCHAR(500),
    reject_reason  VARCHAR(500),
    -- 증빙서류 원본. organization.biz_reg_cert_* 와 같은 방식으로 파일 경로만 들고 있는다
    -- (V28__org_biz_reg_cert.sql 주석 참고).
    evidence_uri   VARCHAR(500),
    evidence_name  VARCHAR(255),
    evidence_mime  VARCHAR(100),
    evidence_size  BIGINT,
    requested_by   BIGINT,
    requested_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    decided_by     BIGINT,
    decided_at     TIMESTAMPTZ,
    -- 같은 조직이 같은 도메인을 두 번 신청하지 못하게. 반려된 건을 다시 신청하려면
    -- 그 행의 status를 PENDING으로 되돌린다(DomainGrantService.request가 그렇게 한다).
    CONSTRAINT ux_org_domain_grant UNIQUE (org_id, domain)
);

CREATE INDEX ix_org_domain_grant_status ON org_domain_grant (status, requested_at DESC);

COMMENT ON TABLE  org_domain_grant IS '제조사 도메인 확장 신청/승인 이력';
COMMENT ON COLUMN org_domain_grant.evidence_uri IS '신청 시 제출한 증빙서류 저장 경로(document.upload-dir 기준)';

-- 기존 조직의 주력 도메인을 승인된 것으로 backfill.
--
-- 이렇게 하지 않으면 "허용 도메인"을 이 표만 보고 계산하는 화면에서 기존 제조사가 자기
-- 도메인조차 못 고르게 된다. organization.domain도 계속 허용 도메인 계산에 포함되지만,
-- 표에도 남겨 두면 마이페이지에서 "보유 도메인" 목록을 한 곳에서 읽을 수 있다.
INSERT INTO org_domain_grant (org_id, domain, status, request_reason, decided_at, requested_at)
SELECT o.org_id, o.domain, 'APPROVED', '가입 시 확정된 주력 도메인', o.created_at, o.created_at
  FROM organization o
 WHERE o.domain IS NOT NULL
   AND o.domain IN ('STEEL','TEXTILE','BATTERY')
   AND o.deleted_at IS NULL
   AND NOT EXISTS (SELECT 1 FROM org_domain_grant g
                    WHERE g.org_id = o.org_id AND g.domain = o.domain);
