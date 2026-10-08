-- =====================================================================
-- 철강·섬유: 회수·재활용 실적은 발급 이후에 받는다 (2026-10-08 강 요청)
--
-- 배터리는 V37에서 재활용 처리 결과를 12단계(재활용·폐기)로 보내 발급을 막지 않게
-- 했지만, 철강·섬유는 lifecycle_stage가 전부 NULL(=제조 단계)이라 "발급 전에 모든
-- 데이터를 받아야 하는" 구조였다. 그런데 정작 철강·섬유에는 재활용 "실적" 항목이
-- 하나도 없었고, 재활용업체(RECYCLER) 몫은 공통 항목인 '폐기·수거 안내 URL' 하나뿐이었다.
--
--  1. 폐기·수거 안내(URL)·분리배출 안내는 출시 시점에 제조사가 내는 정보다(ESPR
--     Annex III - 수명종료 처리 안내는 제품 정보). 담당을 제조사로 옮겨 발급 전에 받는다.
--  2. 회수·재활용 실적(회수일, 처리업체, 처리 중량, 처리 방식, 재활용률, 처리 확인서)은
--     제품이 수명을 다한 뒤에야 생긴다. 철강·섬유에 새로 만들고 11·12단계로 둔다 -
--     발급 게이트(1~8단계)에서 빠지고 완성도 분모에도 안 들어간다(V36 fn_recalc_completeness).
--  3. 철강·섬유의 11·12단계를 활성화해 생애주기 화면에 '회수·재활용' 단계가 나오게 한다.
--     실적이 다 들어오면 그 단계가 '완료'로 바뀐다(v_dpp_lifecycle_status).
--  4. 발급 이후 데이터가 들어올 때마다 새 스냅샷을 만들어 다시 앵커링한다
--     (FieldFormService/DocumentSlotService). 그 스냅샷의 사유 코드 LIFECYCLE을 추가한다.
-- =====================================================================

-- 1. 출시 시점 안내 정보는 제조사 담당 ----------------------------------
UPDATE requirement_field
   SET responsible_role = 'MANUFACTURER'
 WHERE field_code IN ('DISMANTLING_INFO', 'RECYCLABILITY_NOTE');

-- 2. 재활용 처리 확인서 문서 유형 ----------------------------------------
INSERT INTO document_type (doc_type_code, name_ko, name_en, domain,
                           is_zkp_target, requires_expiry, responsible_role,
                           default_owner, sort_order)
VALUES ('EOL_TREATMENT_CERT', '재활용 처리 확인서', 'End-of-life Treatment Certificate', 'COMMON',
        FALSE, FALSE, 'RECYCLER', 'DPP', 120)
ON CONFLICT (doc_type_code) DO NOTHING;

-- 3. 회수·재활용 실적 항목 (발급 이후 단계) ------------------------------
INSERT INTO requirement_field
 (field_code, domain, section, label_ko, label_en, field_kind, storage_target,
  data_type, unit, linked_doc_type, is_required, is_auto, responsible_role, sort_order,
  tier, binding_strength, legal_basis, disclosure_scope, data_source, is_mvp, lifecycle_stage)
VALUES
-- 철강
('STEEL_EOL_COLLECTED_DATE', 'STEEL', 'CIRCULAR', '회수일', 'Collection date',
 'DATA', 'FIELD_VALUE', 'DATE', NULL, NULL, TRUE, FALSE, 'RECYCLER', 14601,
 'T3', '없음', 'ESPR (EU) 2024/1781 Art.7 정보 요건(수명종료)', 'PUBLIC', 'MANUAL', TRUE, 11),
('STEEL_EOL_RECYCLER_NAME', 'STEEL', 'CIRCULAR', '재활용 처리업체', 'Recycler',
 'DATA', 'FIELD_VALUE', 'STRING', NULL, NULL, TRUE, FALSE, 'RECYCLER', 14602,
 'T3', '없음', 'ESPR (EU) 2024/1781 Art.7 정보 요건(수명종료)', 'RESTRICTED', 'MANUAL', TRUE, 12),
('STEEL_EOL_PROCESSED_QTY', 'STEEL', 'CIRCULAR', '처리 중량', 'Processed quantity',
 'DATA', 'FIELD_VALUE', 'NUMBER', 't', NULL, TRUE, FALSE, 'RECYCLER', 14603,
 'T3', '없음', 'ESPR (EU) 2024/1781 Art.7 정보 요건(수명종료)', 'RESTRICTED', 'MANUAL', TRUE, 12),
('STEEL_EOL_TREATMENT', 'STEEL', 'CIRCULAR', '처리 방식', 'Treatment method',
 'DATA', 'FIELD_VALUE', 'STRING', NULL, NULL, FALSE, FALSE, 'RECYCLER', 14604,
 'T3', '없음', 'ESPR (EU) 2024/1781 Art.7 정보 요건(수명종료)', 'PUBLIC', 'MANUAL', TRUE, 12),
('STEEL_EOL_RECYCLING_RATE', 'STEEL', 'CIRCULAR', '재활용률', 'Recycling rate',
 'DATA', 'FIELD_VALUE', 'NUMBER', '%', NULL, TRUE, FALSE, 'RECYCLER', 14605,
 'T3', '없음', 'ESPR (EU) 2024/1781 Art.7 정보 요건(수명종료)', 'PUBLIC', 'MANUAL', TRUE, 12),
('DOC_STEEL_EOL_TREATMENT_CERT', 'STEEL', 'DOCUMENT', '재활용 처리 확인서', 'End-of-life Treatment Certificate',
 'DOCUMENT', 'DOCUMENT', 'STRING', NULL, 'EOL_TREATMENT_CERT', TRUE, FALSE, 'RECYCLER', 19601,
 'T3', '없음', 'ESPR (EU) 2024/1781 Art.7 정보 요건(수명종료)', 'RESTRICTED', 'MANUAL', TRUE, 12),
-- 섬유
('TEXTILE_EOL_COLLECTED_DATE', 'TEXTILE', 'CIRCULAR', '회수일', 'Collection date',
 'DATA', 'FIELD_VALUE', 'DATE', NULL, NULL, TRUE, FALSE, 'RECYCLER', 14601,
 'T3', '없음', 'ESPR (EU) 2024/1781 Art.7 정보 요건(수명종료)', 'PUBLIC', 'MANUAL', TRUE, 11),
('TEXTILE_EOL_RECYCLER_NAME', 'TEXTILE', 'CIRCULAR', '재활용 처리업체', 'Recycler',
 'DATA', 'FIELD_VALUE', 'STRING', NULL, NULL, TRUE, FALSE, 'RECYCLER', 14602,
 'T3', '없음', 'ESPR (EU) 2024/1781 Art.7 정보 요건(수명종료)', 'RESTRICTED', 'MANUAL', TRUE, 12),
('TEXTILE_EOL_PROCESSED_QTY', 'TEXTILE', 'CIRCULAR', '처리 중량', 'Processed quantity',
 'DATA', 'FIELD_VALUE', 'NUMBER', 'kg', NULL, TRUE, FALSE, 'RECYCLER', 14603,
 'T3', '없음', 'ESPR (EU) 2024/1781 Art.7 정보 요건(수명종료)', 'RESTRICTED', 'MANUAL', TRUE, 12),
('TEXTILE_EOL_TREATMENT', 'TEXTILE', 'CIRCULAR', '처리 방식', 'Treatment method',
 'DATA', 'FIELD_VALUE', 'STRING', NULL, NULL, FALSE, FALSE, 'RECYCLER', 14604,
 'T3', '없음', 'ESPR (EU) 2024/1781 Art.7 정보 요건(수명종료)', 'PUBLIC', 'MANUAL', TRUE, 12),
('TEXTILE_EOL_RECYCLING_RATE', 'TEXTILE', 'CIRCULAR', '재활용률', 'Recycling rate',
 'DATA', 'FIELD_VALUE', 'NUMBER', '%', NULL, TRUE, FALSE, 'RECYCLER', 14605,
 'T3', '없음', 'ESPR (EU) 2024/1781 Art.7 정보 요건(수명종료)', 'PUBLIC', 'MANUAL', TRUE, 12),
('DOC_TEXTILE_EOL_TREATMENT_CERT', 'TEXTILE', 'DOCUMENT', '재활용 처리 확인서', 'End-of-life Treatment Certificate',
 'DOCUMENT', 'DOCUMENT', 'STRING', NULL, 'EOL_TREATMENT_CERT', TRUE, FALSE, 'RECYCLER', 19601,
 'T3', '없음', 'ESPR (EU) 2024/1781 Art.7 정보 요건(수명종료)', 'RESTRICTED', 'MANUAL', TRUE, 12)
ON CONFLICT (field_code) DO UPDATE SET
    label_ko         = EXCLUDED.label_ko,
    is_required      = EXCLUDED.is_required,
    responsible_role = EXCLUDED.responsible_role,
    sort_order       = EXCLUDED.sort_order,
    lifecycle_stage  = EXCLUDED.lifecycle_stage;

-- 노출: 1=일반 소비자, 2=인증 사업자, 3=당국·세관 (배터리 재활용 항목과 같은 기준)
INSERT INTO field_visibility (field_code, tier_level, visibility)
SELECT f.code, t.tier, CASE
         WHEN f.scope = 'PUBLIC' THEN 'FULL'
         WHEN t.tier = 3 THEN 'FULL'
         WHEN t.tier = 2 THEN (CASE WHEN f.code LIKE 'DOC_%' THEN 'MASKED' ELSE 'FULL' END)
         ELSE 'HIDDEN' END
  FROM (VALUES
        ('STEEL_EOL_COLLECTED_DATE', 'PUBLIC'), ('STEEL_EOL_RECYCLER_NAME', 'RESTRICTED'),
        ('STEEL_EOL_PROCESSED_QTY', 'RESTRICTED'), ('STEEL_EOL_TREATMENT', 'PUBLIC'),
        ('STEEL_EOL_RECYCLING_RATE', 'PUBLIC'), ('DOC_STEEL_EOL_TREATMENT_CERT', 'RESTRICTED'),
        ('TEXTILE_EOL_COLLECTED_DATE', 'PUBLIC'), ('TEXTILE_EOL_RECYCLER_NAME', 'RESTRICTED'),
        ('TEXTILE_EOL_PROCESSED_QTY', 'RESTRICTED'), ('TEXTILE_EOL_TREATMENT', 'PUBLIC'),
        ('TEXTILE_EOL_RECYCLING_RATE', 'PUBLIC'), ('DOC_TEXTILE_EOL_TREATMENT_CERT', 'RESTRICTED')
       ) AS f(code, scope)
 CROSS JOIN (VALUES (1), (2), (3)) AS t(tier)
ON CONFLICT (field_code, tier_level) DO UPDATE SET visibility = EXCLUDED.visibility;

-- 4. 철강·섬유도 회수·재활용 단계를 추적한다 ------------------------------
UPDATE lifecycle_stage_def
   SET is_active = TRUE,
       requires_anchor = (stage_no = 12)
 WHERE domain IN ('STEEL', 'TEXTILE')
   AND stage_no IN (11, 12);

-- 5. 발급 이후 데이터 반영 스냅샷 사유 -----------------------------------
ALTER TABLE dpp_snapshot DROP CONSTRAINT IF EXISTS dpp_snapshot_trigger_reason_check;
ALTER TABLE dpp_snapshot ADD CONSTRAINT dpp_snapshot_trigger_reason_check
    CHECK (trigger_reason IN ('ISSUE','DOC_APPROVED','CUSTOMS','OWNER_CHANGE','EOL','MANUAL','LIFECYCLE'));
COMMENT ON COLUMN dpp_snapshot.trigger_reason IS
    'ISSUE=발급, LIFECYCLE=발급 이후 단계(사용·회수·재활용) 데이터 반영. 이전 버전은 그대로 두고 새 버전을 쌓는다';
