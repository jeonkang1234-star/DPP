-- CBAM(Q2_06) 탄소보고서 문서 유형 + 그 유형을 가리키는 "필수 문서" 항목.
-- MILL_SHEET와 마찬가지로 파서+ZKP(cbam-check, 수입량 de minimis 초과 여부)를 거치는
-- 전용 업로드 경로(/document/upload/cbam, com.dpp.document.service.CbamIngestService)를
-- 쓴다 - 그래서 is_zkp_target=TRUE. 조건부 의무(항상 필요한 게 아니라 EU 수입량이 있는
-- 경우만)라서 is_required=FALSE로 둔다(COO 등 기존 조건부 문서와 같은 취급).
INSERT INTO document_type (doc_type_code, name_ko, name_en, domain,
                           is_zkp_target, requires_expiry, responsible_role,
                           default_owner, sort_order) VALUES
('CBAM_REPORT', 'CBAM 탄소보고서', 'CBAM Carbon Report', 'STEEL',
    TRUE, FALSE, 'MANUFACTURER', 'DPP', 15);

INSERT INTO requirement_field
 (field_code, domain, section, label_ko, label_en, field_kind, storage_target,
  data_type, unit, code_group, linked_doc_type, material_entry_kind,
  is_required, is_auto, responsible_role, validation_rule, sort_order)
VALUES
('DOC_CBAM_REPORT','STEEL','DOCUMENT','CBAM 탄소보고서','CBAM Carbon Report',
 'DOCUMENT','DOCUMENT','STRING',NULL,NULL,'CBAM_REPORT',NULL, FALSE,FALSE,'MANUFACTURER',NULL,712);
