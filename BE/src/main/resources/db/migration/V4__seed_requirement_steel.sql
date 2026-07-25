-- =====================================================================
-- 규정 필드 마스터 - 공통 + 철강 (Phase 1)
-- 실행 전제: 03_seed_master.sql 완료
--
-- 이 표가 곧
--   (1) DPP 완성도의 분모
--   (2) 철강 입력 폼의 화면 구성
--   (3) 미충족 시 독촉 알림 대상
--   (4) Tier별 노출 제어의 기준
-- =====================================================================

INSERT INTO requirement_field
 (field_code, domain, section, label_ko, label_en, field_kind, storage_target,
  data_type, unit, code_group, linked_doc_type, material_entry_kind,
  is_required, is_auto, responsible_role, validation_rule, sort_order)
VALUES

-- ── A. 식별자 ────────────────────────────────────────────────────────
('UPI','COMMON','IDENTIFIER','고유제품식별자(UPI)','Unique Product Identifier',
 'DATA','FIELD_VALUE','STRING',NULL,NULL,NULL,NULL, TRUE, TRUE, NULL,NULL,101),
('INTERNAL_SKU','COMMON','IDENTIFIER','내부 품목코드','Internal SKU',
 'DATA','FIELD_VALUE','STRING',NULL,NULL,NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,102),
('GTIN','COMMON','IDENTIFIER','GS1 상품코드(GTIN)','GTIN',
 'DATA','FIELD_VALUE','STRING',NULL,NULL,NULL,NULL, FALSE,FALSE,'MANUFACTURER','^[0-9]{8}$|^[0-9]{13,14}$',103),
('HS_CODE','COMMON','IDENTIFIER','품목분류코드(HS)','HS Code',
 'DATA','FIELD_VALUE','CODE',NULL,'HS_CODE',NULL,NULL, TRUE, FALSE,'MANUFACTURER','^[0-9]{4,10}$',104),
('MODEL_NAME','COMMON','IDENTIFIER','제품명','Product Name',
 'DATA','FIELD_VALUE','STRING',NULL,NULL,NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,105),
('ORIGIN_COUNTRY','COMMON','IDENTIFIER','원산지','Country of Origin',
 'DATA','FIELD_VALUE','CODE',NULL,'COUNTRY',NULL,NULL, TRUE, FALSE,'MANUFACTURER','^[A-Z]{2}$',106),

-- ── B. 경제운영자 / 시설 ─────────────────────────────────────────────
('UOI_MANUFACTURER','COMMON','OPERATOR','고유 운영자 식별자(UOI)','Unique Operator Identifier',
 'DATA','FIELD_VALUE','STRING',NULL,NULL,NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,201),
('OPERATOR_MANUFACTURER','COMMON','OPERATOR','제조자 정보','Manufacturer Info',
 'DATA','FIELD_VALUE','JSON',NULL,NULL,NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,202),
('OPERATOR_IMPORTER','COMMON','OPERATOR','수입자 정보','Importer Info',
 'DATA','FIELD_VALUE','JSON',NULL,NULL,NULL,NULL, FALSE,FALSE,'MANUFACTURER',NULL,203),
('OPERATOR_EU_REP','COMMON','OPERATOR','EU 대리인 정보','EU Authorised Representative',
 'DATA','FIELD_VALUE','JSON',NULL,NULL,NULL,NULL, FALSE,FALSE,'MANUFACTURER',NULL,204),
('UFI_PLANT','COMMON','OPERATOR','고유 시설 식별자(UFI)','Unique Facility Identifier',
 'DATA','FIELD_VALUE','STRING',NULL,NULL,NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,205),
('FURNACE_ID','STEEL','OPERATOR','용광로·전기로 식별','Furnace Identifier',
 'DATA','FIELD_VALUE','STRING',NULL,NULL,NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,206),
('PRODUCTION_DATE','COMMON','OPERATOR','생산일자','Production Date',
 'DATA','FIELD_VALUE','DATE',NULL,NULL,NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,207),

-- ── C. 철강 사양 ─────────────────────────────────────────────────────
('HEAT_NO','STEEL','SPEC','Heat 번호','Heat Number',
 'DATA','FIELD_VALUE','STRING',NULL,NULL,NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,301),
('CAST_NO','STEEL','SPEC','Cast 번호','Cast Number',
 'DATA','FIELD_VALUE','STRING',NULL,NULL,NULL,NULL, FALSE,FALSE,'MANUFACTURER',NULL,302),
('LOT_NO','STEEL','SPEC','Lot 번호','Lot Number',
 'DATA','FIELD_VALUE','STRING',NULL,NULL,NULL,NULL, FALSE,FALSE,'MANUFACTURER',NULL,303),
('STEEL_GRADE','STEEL','SPEC','강종','Steel Grade',
 'DATA','FIELD_VALUE','STRING',NULL,NULL,NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,304),
('STEEL_STANDARD','STEEL','SPEC','규격','Standard',
 'DATA','FIELD_VALUE','CODE',NULL,'STEEL_STANDARD',NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,305),
('PRODUCT_FORM','STEEL','SPEC','제품 형태','Product Form',
 'DATA','FIELD_VALUE','CODE',NULL,'PRODUCT_FORM',NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,306),
('DIMENSION','STEEL','SPEC','치수(두께·폭·길이)','Dimensions',
 'DATA','FIELD_VALUE','JSON','MM',NULL,NULL,NULL, FALSE,FALSE,'MANUFACTURER',NULL,307),
('NET_WEIGHT_T','STEEL','SPEC','중량','Net Weight',
 'DATA','FIELD_VALUE','NUMBER','T',NULL,NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,308),

-- ── D. 화학조성 / 물질 ───────────────────────────────────────────────
('CHEM_COMPOSITION','STEEL','MATERIAL','화학 조성','Chemical Composition',
 'DATA','MATERIAL_COMPOSITION','JSON','PERCENT',NULL,NULL,'CHEM_ELEMENT', TRUE, FALSE,'MANUFACTURER',NULL,401),
('SOC_PRESENT','COMMON','MATERIAL','우려물질 포함 여부','SoC Present',
 'DATA','FIELD_VALUE','BOOLEAN',NULL,NULL,NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,402),
('SOC_LIST','COMMON','MATERIAL','우려물질 목록','SoC List',
 'DATA','MATERIAL_COMPOSITION','JSON','PERCENT',NULL,NULL,'SOC', FALSE,FALSE,'MANUFACTURER',NULL,403),
('SVHC_OVER_THRESHOLD','COMMON','MATERIAL','SVHC 0.1% 초과 여부','SVHC Over Threshold',
 'DATA','FIELD_VALUE','BOOLEAN',NULL,NULL,NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,404),

-- ── E. 탄소 / 환경 ───────────────────────────────────────────────────
('PCF_VALUE','COMMON','CARBON','탄소발자국','Product Carbon Footprint',
 'DATA','FIELD_VALUE','NUMBER','KGCO2E_T',NULL,NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,501),
('PCF_METHOD','COMMON','CARBON','산정 기준','Calculation Method',
 'DATA','FIELD_VALUE','STRING',NULL,NULL,NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,502),
('PCF_SCOPE_BREAKDOWN','COMMON','CARBON','Scope 1/2/3 구분','Scope Breakdown',
 'DATA','FIELD_VALUE','JSON','KGCO2E_T',NULL,NULL,NULL, FALSE,FALSE,'MANUFACTURER',NULL,503),
('CBAM_APPLICABLE','STEEL','CARBON','CBAM 대상 여부','CBAM Applicable',
 'DATA','FIELD_VALUE','BOOLEAN',NULL,NULL,NULL,NULL, FALSE,FALSE,'MANUFACTURER',NULL,504),

-- ── F. 순환 / 재생 ───────────────────────────────────────────────────
('RECYCLED_SCRAP_RATE','STEEL','CIRCULAR','재생 스크랩 함유율','Recycled Scrap Content',
 'DATA','FIELD_VALUE','NUMBER','PERCENT',NULL,NULL,NULL, TRUE, FALSE,'RAW_SUPPLIER','^([0-9]|[1-9][0-9]|100)(\.[0-9]+)?$',601),
('SCRAP_SOURCE','STEEL','CIRCULAR','스크랩 출처','Scrap Source',
 'DATA','FIELD_VALUE','STRING',NULL,NULL,NULL,NULL, TRUE, FALSE,'RAW_SUPPLIER',NULL,602),
('RECYCLABILITY_NOTE','COMMON','CIRCULAR','재활용성 정보','Recyclability Info',
 'DATA','FIELD_VALUE','TEXT',NULL,NULL,NULL,NULL, TRUE, FALSE,'MANUFACTURER',NULL,603),
('DISMANTLING_INFO','COMMON','CIRCULAR','소재 분리 지침','Dismantling Guidance',
 'DATA','FIELD_VALUE','TEXT',NULL,NULL,NULL,NULL, FALSE,FALSE,'MANUFACTURER',NULL,604),

-- ── G. 필수 문서 ─────────────────────────────────────────────────────
('DOC_MILL_SHEET','STEEL','DOCUMENT','제강 성적서(Mill Sheet)','Mill Test Certificate',
 'DOCUMENT','DOCUMENT','STRING',NULL,NULL,'MILL_SHEET',NULL, TRUE, FALSE,'MANUFACTURER',NULL,701),
('DOC_TECH_FILE','COMMON','DOCUMENT','기술문서','Technical Documentation',
 'DOCUMENT','DOCUMENT','STRING',NULL,NULL,'TECH_FILE',NULL, TRUE, FALSE,'MANUFACTURER',NULL,702),
('DOC_PCF_REPORT','COMMON','DOCUMENT','탄소발자국 산정보고서','Carbon Footprint Report',
 'DOCUMENT','DOCUMENT','STRING',NULL,NULL,'PCF_REPORT',NULL, TRUE, FALSE,'MANUFACTURER',NULL,703),
('DOC_LCA_EPD','COMMON','DOCUMENT','LCA / EPD','LCA / EPD',
 'DOCUMENT','DOCUMENT','STRING',NULL,NULL,'LCA_EPD',NULL, TRUE, FALSE,'MANUFACTURER',NULL,704),
('DOC_SCRAP_PROOF','STEEL','DOCUMENT','스크랩 매입증빙·재생원료 확인서','Recycled Content Proof',
 'DOCUMENT','DOCUMENT','STRING',NULL,NULL,'SCRAP_PROOF',NULL, TRUE, FALSE,'RAW_SUPPLIER',NULL,705),
('DOC_SOC_SDS','COMMON','DOCUMENT','우려물질 정보 / SDS','SoC Information / SDS',
 'DOCUMENT','DOCUMENT','STRING',NULL,NULL,'SOC_SDS',NULL, TRUE, FALSE,'MANUFACTURER',NULL,706),
('DOC_EU_DOC','COMMON','DOCUMENT','EU 적합성선언서','EU Declaration of Conformity',
 'DOCUMENT','DOCUMENT','STRING',NULL,NULL,'EU_DOC',NULL, TRUE, FALSE,'MANUFACTURER',NULL,707),
('DOC_TEST_REPORT','COMMON','DOCUMENT','시험성적서','Test Report',
 'DOCUMENT','DOCUMENT','STRING',NULL,NULL,'TEST_REPORT',NULL, TRUE, FALSE,'MANUFACTURER',NULL,708),
('DOC_COO','COMMON','DOCUMENT','원산지증명서','Certificate of Origin',
 'DOCUMENT','DOCUMENT','STRING',NULL,NULL,'COO',NULL, FALSE,FALSE,'MANUFACTURER',NULL,709),
('DOC_LABEL','COMMON','DOCUMENT','라벨','Product Label',
 'DOCUMENT','DOCUMENT','STRING',NULL,NULL,'LABEL',NULL, FALSE,FALSE,'MANUFACTURER',NULL,710),
('DOC_MANUAL','COMMON','DOCUMENT','사용설명서·안전정보','User Manual and Safety Info',
 'DOCUMENT','DOCUMENT','STRING',NULL,NULL,'MANUAL',NULL, FALSE,FALSE,'MANUFACTURER',NULL,711),

-- ── H. 시스템 자동 생성 (완성도 분모 제외) ──────────────────────────
('DATA_CARRIER_TYPE','COMMON','SYSTEM','데이터 캐리어','Data Carrier',
 'DATA','FIELD_VALUE','STRING',NULL,NULL,NULL,NULL, TRUE, TRUE, NULL,NULL,801),
('DPP_URI','COMMON','SYSTEM','DPP 접근 URI','DPP URI',
 'DATA','FIELD_VALUE','STRING',NULL,NULL,NULL,NULL, TRUE, TRUE, NULL,NULL,802),
('REGISTRY_UID','COMMON','SYSTEM','레지스트리 등록번호','Registry UID',
 'DATA','FIELD_VALUE','STRING',NULL,NULL,NULL,NULL, TRUE, TRUE, NULL,NULL,803),
('BACKUP_KEY','COMMON','SYSTEM','백업 참조키','Backup Reference Key',
 'DATA','FIELD_VALUE','STRING',NULL,NULL,NULL,NULL, TRUE, TRUE, NULL,NULL,804);


-- =====================================================================
-- Tier별 노출 매트릭스
--   Tier 3 (당국·세관)   : 전부 공개
--   Tier 2 (인증 사업자) : 영업비밀성 항목만 비공개
--   Tier 1 (일반 소비자) : 공개 항목만, 일부는 마스킹
-- =====================================================================

-- Tier 3 : 전부 FULL
INSERT INTO field_visibility (field_code, tier_level, visibility)
SELECT field_code, 3, 'FULL'
  FROM requirement_field
 WHERE domain IN ('COMMON','STEEL');

-- Tier 2 : 스크랩 출처·용광로 식별만 비공개
INSERT INTO field_visibility (field_code, tier_level, visibility)
SELECT field_code, 2,
       CASE WHEN field_code IN ('SCRAP_SOURCE','FURNACE_ID')
            THEN 'HIDDEN' ELSE 'FULL' END
  FROM requirement_field
 WHERE domain IN ('COMMON','STEEL');

-- Tier 1 : 공개 항목만
INSERT INTO field_visibility (field_code, tier_level, visibility)
SELECT field_code, 1,
       CASE
         WHEN field_code IN (
              'MODEL_NAME','ORIGIN_COUNTRY','PRODUCT_FORM','STEEL_GRADE',
              'STEEL_STANDARD','NET_WEIGHT_T','PCF_VALUE','RECYCLED_SCRAP_RATE',
              'RECYCLABILITY_NOTE','SOC_PRESENT','SVHC_OVER_THRESHOLD',
              'GTIN','DPP_URI','DATA_CARRIER_TYPE','PRODUCTION_DATE')
           THEN 'FULL'
         WHEN field_code IN ('HEAT_NO','UFI_PLANT','OPERATOR_MANUFACTURER')
           THEN 'MASKED'
         ELSE 'HIDDEN'
       END
  FROM requirement_field
 WHERE domain IN ('COMMON','STEEL');


-- =====================================================================
-- 검증 쿼리 : 철강 DPP 1건의 완성도 분모가 몇인지 확인
-- =====================================================================
-- SELECT count(*) AS 완성도_분모
--   FROM requirement_field
--  WHERE domain IN ('COMMON','STEEL')
--    AND is_required AND NOT is_auto AND is_active;
-- 기대값: 30
