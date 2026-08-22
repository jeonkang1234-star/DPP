-- 가입 시 제출한 사업자등록증(또는 기관 증빙서류) 원본과 자동검증 결과를 organization에 남긴다.
--
-- 2026-08-22 강 요청: "수동 심사 시에 '상세 정보'를 누르면 회원가입 때 받은 정보는 다 보이게
-- 하고 얘네가 올린 문서가 그냥 바로 열려서 보이게". 지금까지 가입 화면에서 받은 사업자등록증은
-- parser로 한 번 검증한 뒤 그대로 버려져서, 관리자가 심사할 때 볼 수 있는 게 아무것도 없었다
-- (FE approvalVals.js의 '상세 정보'가 mock docPreview 모달을 띄우던 이유).
--
-- document 테이블을 쓰지 않는 이유: 그쪽은 owner_type='DPP'/'ORG'와 doc_type_code 마스터에
-- 묶여 있고 DPP 문서 슬롯 흐름(document_slot, zkp_proof)에 강하게 엮여 있다. 가입 심사용
-- 첨부는 조직 수명주기에 1:1로 붙는 단일 파일이라 organization에 바로 다는 편이 단순하다.
ALTER TABLE organization
    ADD COLUMN IF NOT EXISTS biz_reg_cert_uri          VARCHAR(500),
    ADD COLUMN IF NOT EXISTS biz_reg_cert_name         VARCHAR(255),
    ADD COLUMN IF NOT EXISTS biz_reg_cert_mime         VARCHAR(100),
    ADD COLUMN IF NOT EXISTS biz_reg_cert_size         BIGINT,
    ADD COLUMN IF NOT EXISTS biz_reg_cert_uploaded_at  TIMESTAMPTZ,
    -- parser /verify-biz-cert 판정 요약. auto_approvable=false일 때 reasons를 그대로 이어붙여
    -- 넣는다(관리자 상세 화면에서 "왜 수동 심사로 왔는지"를 바로 보여주기 위함).
    ADD COLUMN IF NOT EXISTS verify_auto_approvable    BOOLEAN,
    ADD COLUMN IF NOT EXISTS verify_reasons            VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS verify_checked_at         TIMESTAMPTZ;

COMMENT ON COLUMN organization.biz_reg_cert_uri IS '가입 시 제출한 사업자등록증/증빙서류 저장 경로(document.upload-dir 기준)';
COMMENT ON COLUMN organization.verify_reasons IS 'parser /verify-biz-cert가 돌려준 자동승인 불가 사유(줄바꿈 구분)';
