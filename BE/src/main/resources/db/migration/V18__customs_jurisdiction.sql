-- =====================================================================
-- 세관 관할(jurisdiction) 지원 - 2026-08-19 강 요청
--   "세관 마다 확인해야 할 DPP가 달라야 함" + "수출국도 봐야하고 수입도 봐야하는거
--   아닌가?" - 세관 계정의 관할은 그 세관이 속한 country_code(organization.country_code)
--   기준으로, 해당 DPP의 export_country_code(수출국) 또는 import_country_code(수입국) 중
--   하나라도 일치하면 그 세관의 심사 대상이 된다. 수출측/수입측은 실제로 서로 다른
--   행정기관(다른 나라 세관)이 각각 심사하는 별개의 실무 이벤트이므로, 매칭되는 세관마다
--   customs_clearance 행을 하나씩 만든다(같은 DPP라도 수출세관용 1행 + 수입세관용 1행이
--   따로 생길 수 있음) - clearance_side로 구분.
-- =====================================================================

ALTER TABLE customs_clearance
    ADD COLUMN clearance_side VARCHAR(10)
        CHECK (clearance_side IN ('EXPORT', 'IMPORT')),
    ADD COLUMN export_country_code CHAR(2),
    ADD COLUMN import_country_code CHAR(2),
    ADD COLUMN importer_name VARCHAR(200),
    ADD COLUMN importer_address VARCHAR(300),
    ADD COLUMN importer_eori VARCHAR(30),
    ADD COLUMN requested_by_org_id BIGINT REFERENCES organization(org_id);

COMMENT ON COLUMN customs_clearance.clearance_side IS
    'EXPORT = 수출국 세관 심사 건, IMPORT = 수입국 세관 심사 건. 같은 신청(request)에서 매칭되는 세관마다 별도 행이 생긴다';
COMMENT ON COLUMN customs_clearance.export_country_code IS
    '수출국 - 신청 시점 DPP owner_org.country_code 스냅샷(추후 조직 정보가 바뀌어도 이 값은 고정)';
COMMENT ON COLUMN customs_clearance.import_country_code IS
    '수입국(도착국) - 신청자가 직접 입력';
COMMENT ON COLUMN customs_clearance.customs_org_id IS
    '이 행을 심사할 세관 조직. clearance_side=EXPORT면 country_code=export_country_code인 CUSTOMS 조직, IMPORT면 import_country_code인 CUSTOMS 조직과 매칭됨(CustomsClearanceService.createRequest)';
COMMENT ON COLUMN customs_clearance.importer_eori IS
    '수입업체가 신고한 EORI 번호. 실제 EU EORI 데이터베이스 조회 연동은 없음 - 형식만 확인함(CustomsClearanceService.checkEoriFormat)';
COMMENT ON COLUMN customs_clearance.requested_by_org_id IS
    '통관 신청을 제출한 조직(대개 DPP owner_org 자신, 물류사가 대리 신청하는 경우도 있을 수 있어 별도 컬럼으로 둠)';
COMMENT ON COLUMN customs_clearance.hs_code IS
    '신청 시 신고한 HS 코드(기존 컬럼 재사용) - product_model.hs_code(제품 등록 시 입력한 실제 HS 코드)와 대조해 정합성을 확인함(CustomsClearanceService)';

-- 매칭되는 세관이 없어 customs_org_id가 비는 행도 나올 수 있다(해당 국가에 아직 세관
-- 계정이 없는 경우) - 그런 행은 어느 세관 큐에도 보이지 않고 관리자 화면에서만 확인 가능.
CREATE INDEX ix_clearance_org_queue ON customs_clearance (customs_org_id, decision, created_at)
    WHERE customs_org_id IS NOT NULL;
CREATE INDEX ix_clearance_dpp ON customs_clearance (dpp_id);
