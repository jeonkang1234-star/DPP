-- =====================================================================
-- 규정 필드 마스터 - 섬유(TEXTILE) 도메인
-- 실행 전제: V3__seed_master.sql, V4__seed_requirement_steel.sql, V14__partner_role_split.sql
--
-- 철강(V4)과 동일한 구조(식별자/운영자/사양/조성/탄소/순환/문서)를 그대로 따르되, 섬유
-- 도메인 특유의 인증 문서 2종을 ZKP 검증 대상으로 새로 등록한다:
--   - CARE_LABEL(Q1_04 섬유 케어라벨) - 섬유 혼용률 합계 ≈100% 검증(FiberSumCheck 회로).
--     Mill Sheet와 같은 위치(제조사 자기 발행/부착) - responsible_role='MANUFACTURER'.
--   - OEKOTEX_LABEL(Q3_10 OEKO-TEX 라벨) - pH 4.0~7.5 범위 검증(OekotexCheck 회로).
--     실제로는 OEKO-TEX 인증기관(제3자 시험·인증기관)이 발급하는 문서라, 강이 공유했던
--     "데이터 출처 8분류"의 ①제3자 인증·시험기관 범주에 해당한다고 보고 TEST_LAB로
--     배정한다(V14__partner_role_split.sql이 PCF/시험성적서/LCA·EPD에 적용한 것과 동일한
--     분류 기준).
-- GRS_CERTIFICATE(Q1_03 GRS/RCS 거래증명서)는 재생섬유 인증 문서로, 스크랩과 마찬가지로
-- ②원자재·화학 공급사 범주라 RAW_SUPPLIER로 배정한다(ZKP 회로 없음 - judge.py에도
-- Q1_03 판정 로직이 없다, 파서 자동 채움 대상으로만 취급).
-- =====================================================================

INSERT INTO document_type (doc_type_code, name_ko, name_en, domain,
                           is_zkp_target, requires_expiry, responsible_role,
                           default_owner, sort_order) VALUES
('CARE_LABEL',      '섬유 케어라벨',           'Textile Care Label',        'TEXTILE',
    TRUE,  FALSE, 'MANUFACTURER', 'BATCH', 11),
('OEKOTEX_LABEL',   'OEKO-TEX 라벨',           'OEKO-TEX Label',            'TEXTILE',
    TRUE,  TRUE,  'TEST_LAB',     'BATCH', 12),
('GRS_CERTIFICATE', 'GRS/RCS 거래증명서',      'GRS/RCS Transaction Cert.', 'TEXTILE',
    FALSE, TRUE,  'RAW_SUPPLIER', 'BATCH', 13);


INSERT INTO requirement_field
 (field_code, domain, section, label_ko, label_en, field_kind, storage_target,
  data_type, unit, code_group, linked_doc_type, material_entry_kind,
  is_required, is_auto, responsible_role, validation_rule, sort_order)
VALUES

-- ── B. 운영자 / 시설 (COMMON 항목에 이어 섬유 전용 1개 추가) ──────────
('DYEING_FACILITY_ID','TEXTILE','OPERATOR','염색·가공시설 식별','Dyeing/Finishing Facility ID',
 'DATA','FIELD_VALUE','STRING',NULL,NULL,NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,206),

-- ── C. 섬유 사양 ─────────────────────────────────────────────────────
('FABRIC_LOT_NO','TEXTILE','SPEC','원단 Lot 번호','Fabric Lot Number',
 'DATA','FIELD_VALUE','STRING',NULL,NULL,NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,301),
('FABRIC_TYPE','TEXTILE','SPEC','직물 종류(니트/우븐 등)','Fabric Construction',
 'DATA','FIELD_VALUE','CODE',NULL,'FABRIC_TYPE',NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,304),
('TEXTILE_STANDARD','TEXTILE','SPEC','적용 규격','Applied Standard',
 'DATA','FIELD_VALUE','CODE',NULL,'TEXTILE_STANDARD',NULL,NULL, FALSE,FALSE,'MANUFACTURER',NULL,305),
('FABRIC_WEIGHT_GSM','TEXTILE','SPEC','단위면적당중량(GSM)','Fabric Weight (GSM)',
 'DATA','FIELD_VALUE','NUMBER','GSM',NULL,NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,307),
('NET_WEIGHT_KG','TEXTILE','SPEC','중량','Net Weight',
 'DATA','FIELD_VALUE','NUMBER','KG',NULL,NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,308),

-- ── D. 조성 / 인증 수치 ──────────────────────────────────────────────
-- 섬유 혼용률(Q1_04)은 문서 업로드 시점(CareLabelIngestService)에 파서가 자동으로
-- material_composition(entry_kind='MATERIAL')에 채운다 - DocumentIngestService가 철강
-- 화학조성을 CHEM_ELEMENT로 자동 채우는 것과 동일한 패턴. 수기입력 화면은 따로 안 만든다.
('FIBER_COMPOSITION','TEXTILE','MATERIAL','섬유 혼용률','Fiber Composition',
 'DATA','MATERIAL_COMPOSITION','JSON','PERCENT',NULL,NULL,'MATERIAL', TRUE, FALSE,'MANUFACTURER',NULL,401),
('OEKOTEX_CERT_NO','TEXTILE','MATERIAL','OEKO-TEX 인증번호','OEKO-TEX Certificate No.',
 'DATA','FIELD_VALUE','STRING',NULL,NULL,NULL,NULL, TRUE, FALSE,'TEST_LAB',NULL,402),

-- ── F. 순환 / 재생 ───────────────────────────────────────────────────
('RECYCLED_FIBER_RATE','TEXTILE','CIRCULAR','재생 섬유 함유율','Recycled Fiber Content',
 'DATA','FIELD_VALUE','NUMBER','PERCENT',NULL,NULL,NULL, TRUE, FALSE,'RAW_SUPPLIER','^([0-9]|[1-9][0-9]|100)(\.[0-9]+)?$',601),
('RECYCLED_FIBER_SOURCE','TEXTILE','CIRCULAR','재생 섬유 출처','Recycled Fiber Source',
 'DATA','FIELD_VALUE','STRING',NULL,NULL,NULL,NULL, TRUE, FALSE,'RAW_SUPPLIER',NULL,602),

-- ── G. 필수 문서 ─────────────────────────────────────────────────────
('DOC_CARE_LABEL','TEXTILE','DOCUMENT','섬유 케어라벨(혼용률표)','Textile Care Label',
 'DOCUMENT','DOCUMENT','STRING',NULL,NULL,'CARE_LABEL',NULL, TRUE, FALSE,'MANUFACTURER',NULL,701),
('DOC_OEKOTEX_LABEL','TEXTILE','DOCUMENT','OEKO-TEX 인증 라벨','OEKO-TEX Certified Label',
 'DOCUMENT','DOCUMENT','STRING',NULL,NULL,'OEKOTEX_LABEL',NULL, TRUE, FALSE,'TEST_LAB',NULL,702),
('DOC_GRS_CERTIFICATE','TEXTILE','DOCUMENT','GRS/RCS 거래증명서','GRS/RCS Transaction Certificate',
 'DOCUMENT','DOCUMENT','STRING',NULL,NULL,'GRS_CERTIFICATE',NULL, TRUE, FALSE,'RAW_SUPPLIER',NULL,703);


-- =====================================================================
-- Tier별 노출 매트릭스 (V4__seed_requirement_steel.sql과 동일한 3단계 원칙)
-- =====================================================================

INSERT INTO field_visibility (field_code, tier_level, visibility)
SELECT field_code, 3, 'FULL'
  FROM requirement_field
 WHERE domain = 'TEXTILE';

INSERT INTO field_visibility (field_code, tier_level, visibility)
SELECT field_code, 2,
       CASE WHEN field_code IN ('RECYCLED_FIBER_SOURCE','DYEING_FACILITY_ID')
            THEN 'HIDDEN' ELSE 'FULL' END
  FROM requirement_field
 WHERE domain = 'TEXTILE';

INSERT INTO field_visibility (field_code, tier_level, visibility)
SELECT field_code, 1,
       CASE
         WHEN field_code IN (
              'FABRIC_TYPE','FABRIC_WEIGHT_GSM','NET_WEIGHT_KG',
              'FIBER_COMPOSITION','RECYCLED_FIBER_RATE','OEKOTEX_CERT_NO')
           THEN 'FULL'
         WHEN field_code IN ('FABRIC_LOT_NO','DYEING_FACILITY_ID')
           THEN 'MASKED'
         ELSE 'HIDDEN'
       END
  FROM requirement_field
 WHERE domain = 'TEXTILE';


-- =====================================================================
-- 검증 쿼리 : 섬유 DPP 1건의 완성도 분모가 몇인지 확인
-- =====================================================================
-- SELECT count(*) AS 완성도_분모
--   FROM requirement_field
--  WHERE domain IN ('COMMON','TEXTILE')
--    AND is_required AND NOT is_auto AND is_active;
