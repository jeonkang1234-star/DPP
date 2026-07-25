-- =====================================================================
-- 마스터 초기 데이터 (Phase 1)
-- 실행 전제: 01_schema.sql, 02_functions.sql 완료
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. 역할
--    is_phase1 = TRUE  : 1차에서 전용 화면 제공
--    has_login = FALSE : 게스트 업로드 링크로만 참여
-- ---------------------------------------------------------------------
INSERT INTO role (role_code, role_name_ko, role_name_en, default_tier,
                  dashboard_route, has_login, is_phase1, sort_order) VALUES
('ADMIN',         '플랫폼 관리자',   'Platform Admin',      3, '/admin',        TRUE,  TRUE,  10),
('MANUFACTURER',  '제조사',         'Manufacturer',        2, '/manufacturer', TRUE,  TRUE,  20),
('EU_AUTHORITY',  'EU 집행위',      'EU Commission',       3, '/authority',    TRUE,  TRUE,  30),
('CUSTOMS',       '세관',           'Customs',             3, '/customs',      TRUE,  TRUE,  40),
('CONSUMER',      '소비자',         'Consumer',            1, '/consumer',     TRUE,  TRUE,  50),
('RAW_SUPPLIER',  '원자재 공급사',   'Raw Material Supplier', 2, NULL,          FALSE, FALSE, 60),
('LOGISTICS',     '물류사',         'Logistics Provider',  2, NULL,            FALSE, FALSE, 70),
('DISTRIBUTOR',   '유통사',         'Distributor',         2, NULL,            FALSE, FALSE, 80),
('RECYCLER',      '재활용업체',      'Recycler',            2, NULL,            FALSE, FALSE, 90),
('TEST_LAB',      '시험·인증기관',   'Testing Body',        2, NULL,            FALSE, FALSE, 100);


-- ---------------------------------------------------------------------
-- 2. 권한
-- ---------------------------------------------------------------------
INSERT INTO permission (permission_code, resource, action, description) VALUES
('DPP_READ',        'DPP',        'READ',    'DPP 조회'),
('DPP_WRITE',       'DPP',        'WRITE',   'DPP 생성·수정'),
('DPP_DELETE',      'DPP',        'DELETE',  'DPP 논리 삭제'),
('DOC_READ',        'DOCUMENT',   'READ',    '문서 조회'),
('DOC_WRITE',       'DOCUMENT',   'WRITE',   '문서 업로드'),
('DOC_APPROVE',     'DOCUMENT',   'APPROVE', '문서 승인·반려'),
('ORG_READ',        'ORG',        'READ',    '조직 조회'),
('ORG_APPROVE',     'ORG',        'APPROVE', '가입 승인'),
('TIER_APPROVE',    'TIER',       'APPROVE', 'Tier 심사'),
('CUSTOMS_DECIDE',  'CUSTOMS',    'APPROVE', '통관 결정'),
('REGISTRY_READ',   'REGISTRY',   'READ',    'EU 레지스트리 조회'),
('AUDIT_READ',      'AUDIT',      'READ',    '감사 로그 조회'),
('REPORT_EXPORT',   'REPORT',     'EXPORT',  '보고서 내보내기');

INSERT INTO role_permission (role_code, permission_code) VALUES
('ADMIN','DPP_READ'),('ADMIN','ORG_READ'),('ADMIN','ORG_APPROVE'),
('ADMIN','TIER_APPROVE'),('ADMIN','DOC_READ'),('ADMIN','DOC_APPROVE'),
('ADMIN','AUDIT_READ'),('ADMIN','REPORT_EXPORT'),
('MANUFACTURER','DPP_READ'),('MANUFACTURER','DPP_WRITE'),('MANUFACTURER','DPP_DELETE'),
('MANUFACTURER','DOC_READ'),('MANUFACTURER','DOC_WRITE'),('MANUFACTURER','REPORT_EXPORT'),
('EU_AUTHORITY','DPP_READ'),('EU_AUTHORITY','REGISTRY_READ'),
('EU_AUTHORITY','DOC_READ'),('EU_AUTHORITY','AUDIT_READ'),
('CUSTOMS','DPP_READ'),('CUSTOMS','DOC_READ'),('CUSTOMS','CUSTOMS_DECIDE'),
('CONSUMER','DPP_READ'),
('RAW_SUPPLIER','DOC_WRITE'),
('TEST_LAB','DOC_WRITE'),
('RECYCLER','DPP_READ'),('RECYCLER','DOC_WRITE');


-- ---------------------------------------------------------------------
-- 3. 코드 마스터
-- ---------------------------------------------------------------------
INSERT INTO code_master (code_group, code, name_ko, name_en, sort_order) VALUES
('DOMAIN','STEEL','철강','Steel',10),
('DOMAIN','TEXTILE','섬유','Textile',20),
('DOMAIN','BATTERY','배터리','Battery',30),

('COUNTRY','KR','대한민국','Republic of Korea',10),
('COUNTRY','DE','독일','Germany',20),
('COUNTRY','NL','네덜란드','Netherlands',30),
('COUNTRY','BE','벨기에','Belgium',40),
('COUNTRY','FR','프랑스','France',50),
('COUNTRY','IT','이탈리아','Italy',60),
('COUNTRY','PL','폴란드','Poland',70),
('COUNTRY','CN','중국','China',80),
('COUNTRY','JP','일본','Japan',90),
('COUNTRY','US','미국','United States',100),

('HS_CODE','7208','열간압연 평판압연제품','Hot-rolled flat products',10),
('HS_CODE','7209','냉간압연 평판압연제품','Cold-rolled flat products',20),
('HS_CODE','7210','도금 평판압연제품','Clad or coated flat products',30),
('HS_CODE','7213','열간압연 봉강','Hot-rolled bars and rods',40),
('HS_CODE','7214','기타 봉강','Other bars and rods',50),
('HS_CODE','7216','형강','Angles, shapes and sections',60),
('HS_CODE','7219','스테인리스 평판압연제품','Stainless flat-rolled',70),
('HS_CODE','7225','기타 합금강 평판압연제품','Other alloy steel flat-rolled',80),

('PRODUCT_FORM','PLATE','후판','Plate',10),
('PRODUCT_FORM','HR_COIL','열연코일','Hot-rolled coil',20),
('PRODUCT_FORM','CR_COIL','냉연코일','Cold-rolled coil',30),
('PRODUCT_FORM','BAR','봉강','Bar',40),
('PRODUCT_FORM','SECTION','형강','Section',50),
('PRODUCT_FORM','WIRE_ROD','선재','Wire rod',60),

('STEEL_STANDARD','KS','한국산업표준','KS',10),
('STEEL_STANDARD','EN','유럽표준','EN',20),
('STEEL_STANDARD','ASTM','미국재료시험협회','ASTM',30),
('STEEL_STANDARD','JIS','일본공업규격','JIS',40),
('STEEL_STANDARD','ISO','국제표준','ISO',50),

('UNIT','T','톤','tonne',10),
('UNIT','KG','킬로그램','kilogram',20),
('UNIT','PERCENT','퍼센트','percent',30),
('UNIT','KGCO2E_T','톤당 이산화탄소환산kg','kgCO2e/t',40),
('UNIT','MM','밀리미터','millimetre',50),

('REJECT_REASON','MISSING_FIELD','필수 데이터 누락','Missing required data',10),
('REJECT_REASON','INVALID_FORMAT','데이터 형식 오류','Invalid format',20),
('REJECT_REASON','INCONSISTENT','데이터 정합성 오류','Inconsistent data',30),
('REJECT_REASON','EXPIRED_DOC','증빙 유효기간 만료','Expired document',40),
('REJECT_REASON','ILLEGIBLE','문서 판독 불가','Illegible document',50),
('REJECT_REASON','WRONG_TYPE','문서 종류 불일치','Wrong document type',60),

('TERMS','SERVICE','서비스 이용약관','Terms of Service',10),
('TERMS','PRIVACY','개인정보 수집·이용 동의','Privacy Policy',20),
('TERMS','MARKETING','마케팅 정보 수신 동의','Marketing Consent',30);


-- ---------------------------------------------------------------------
-- 4. ESPR 생애주기 12단계
--    ※ 12단계의 공식 명칭이 자료에 없어 일반적 순환경제 단계로 구성함.
--      팀 확정 후 stage_name_ko만 수정하면 됨.
--    철강: 다른 제품군에 편입되는 순간 추적 종료 -> 9~12 비활성
--    섬유: 소비자 유통 전까지 -> 9~12 비활성
--    배터리: 원자재~폐기 전 구간 활성
-- ---------------------------------------------------------------------
INSERT INTO lifecycle_stage_def
    (domain, stage_no, stage_code, stage_name_ko, stage_name_en, is_active, requires_anchor) VALUES
('STEEL', 1,'RAW_MATERIAL','원자재 조달','Raw material sourcing',TRUE, FALSE),
('STEEL', 2,'MATERIAL_PROD','소재 생산(제강)','Material production',TRUE, TRUE),
('STEEL', 3,'COMPONENT','중간재 가공','Component processing',TRUE, FALSE),
('STEEL', 4,'ASSEMBLY','완제품 제조','Product manufacturing',TRUE, TRUE),
('STEEL', 5,'PACKAGING','포장','Packaging',TRUE, FALSE),
('STEEL', 6,'TRANSPORT','운송·물류','Transport and logistics',TRUE, TRUE),
('STEEL', 7,'STORAGE','보관','Storage',TRUE, FALSE),
('STEEL', 8,'DISTRIBUTION','유통·판매','Distribution and sale',TRUE, TRUE),
('STEEL', 9,'USE','사용','Use',FALSE,FALSE),
('STEEL',10,'MAINTENANCE','유지보수·수리','Maintenance and repair',FALSE,FALSE),
('STEEL',11,'COLLECTION','회수·수명종료','Collection and end-of-life',FALSE,FALSE),
('STEEL',12,'RECYCLING','재활용·폐기','Recycling and disposal',FALSE,FALSE),

('TEXTILE', 1,'RAW_MATERIAL','원료 조달','Raw material sourcing',TRUE, FALSE),
('TEXTILE', 2,'MATERIAL_PROD','방적·제직','Spinning and weaving',TRUE, TRUE),
('TEXTILE', 3,'COMPONENT','염색·가공','Dyeing and finishing',TRUE, FALSE),
('TEXTILE', 4,'ASSEMBLY','봉제·완제품','Garment manufacturing',TRUE, TRUE),
('TEXTILE', 5,'PACKAGING','포장','Packaging',TRUE, FALSE),
('TEXTILE', 6,'TRANSPORT','운송·물류','Transport and logistics',TRUE, TRUE),
('TEXTILE', 7,'STORAGE','보관','Storage',TRUE, FALSE),
('TEXTILE', 8,'DISTRIBUTION','유통·판매','Distribution and sale',TRUE, TRUE),
('TEXTILE', 9,'USE','사용','Use',FALSE,FALSE),
('TEXTILE',10,'MAINTENANCE','수선','Repair',FALSE,FALSE),
('TEXTILE',11,'COLLECTION','회수','Collection',FALSE,FALSE),
('TEXTILE',12,'RECYCLING','재활용·폐기','Recycling and disposal',FALSE,FALSE),

('BATTERY', 1,'RAW_MATERIAL','원자재 조달','Raw material sourcing',TRUE, FALSE),
('BATTERY', 2,'MATERIAL_PROD','활물질 생산','Active material production',TRUE, TRUE),
('BATTERY', 3,'COMPONENT','셀 제조','Cell manufacturing',TRUE, FALSE),
('BATTERY', 4,'ASSEMBLY','팩 조립','Pack assembly',TRUE, TRUE),
('BATTERY', 5,'PACKAGING','포장','Packaging',TRUE, FALSE),
('BATTERY', 6,'TRANSPORT','운송·물류','Transport and logistics',TRUE, TRUE),
('BATTERY', 7,'STORAGE','보관','Storage',TRUE, FALSE),
('BATTERY', 8,'DISTRIBUTION','유통·판매','Distribution and sale',TRUE, TRUE),
('BATTERY', 9,'USE','사용','Use',TRUE, FALSE),
('BATTERY',10,'MAINTENANCE','유지보수·재사용','Maintenance and reuse',TRUE, FALSE),
('BATTERY',11,'COLLECTION','회수·수명종료','Collection and end-of-life',TRUE, TRUE),
('BATTERY',12,'RECYCLING','재활용·폐기','Recycling and disposal',TRUE, TRUE);


-- ---------------------------------------------------------------------
-- 5. 문서 종류
--    default_owner : 이 문서를 어느 단위에 붙일지
--                    BATCH = 배치 1건에 올리면 소속 DPP 전체가 상속
--    is_zkp_target : 영지식증명 검증 대상 여부
-- ---------------------------------------------------------------------
INSERT INTO document_type (doc_type_code, name_ko, name_en, domain,
                           is_zkp_target, requires_expiry, responsible_role,
                           default_owner, sort_order) VALUES
('MILL_SHEET',   '제강 성적서(Mill Sheet)','Mill Test Certificate','STEEL',
    FALSE, FALSE, 'MANUFACTURER', 'BATCH', 10),
('TECH_FILE',    '기술문서','Technical Documentation','COMMON',
    TRUE,  FALSE, 'MANUFACTURER', 'MODEL', 20),
('PCF_REPORT',   '탄소발자국 산정보고서','Carbon Footprint Report','COMMON',
    FALSE, TRUE,  'MANUFACTURER', 'BATCH', 30),
('LCA_EPD',      'LCA / EPD','LCA / EPD','COMMON',
    TRUE,  TRUE,  'MANUFACTURER', 'MODEL', 40),
('SCRAP_PROOF',  '스크랩 매입증빙·재생원료 확인서','Recycled Content Proof','STEEL',
    TRUE,  TRUE,  'RAW_SUPPLIER', 'BATCH', 50),
('SOC_SDS',      '우려물질 정보 / SDS','Substance of Concern / SDS','COMMON',
    TRUE,  FALSE, 'MANUFACTURER', 'MODEL', 60),
('EU_DOC',       'EU 적합성선언서','EU Declaration of Conformity','COMMON',
    FALSE, TRUE,  'MANUFACTURER', 'MODEL', 70),
('TEST_REPORT',  '시험성적서','Test Report','COMMON',
    FALSE, TRUE,  'MANUFACTURER', 'BATCH', 80),
('COO',          '원산지증명서','Certificate of Origin','COMMON',
    FALSE, FALSE, 'MANUFACTURER', 'BATCH', 90),
('LABEL',        '라벨','Product Label','COMMON',
    FALSE, FALSE, 'MANUFACTURER', 'MODEL', 100),
('MANUAL',       '사용설명서·안전정보','User Manual and Safety Info','COMMON',
    FALSE, FALSE, 'MANUFACTURER', 'MODEL', 110),
('BIZ_LICENSE',  '사업자등록증','Business Registration','COMMON',
    FALSE, FALSE, 'MANUFACTURER', 'ORGANIZATION', 200);


-- ---------------------------------------------------------------------
-- 6. 규정 준수 규칙
--    expression 은 1차에서는 참고용 문자열. 실제 판정은 애플리케이션에서 수행
-- ---------------------------------------------------------------------
INSERT INTO compliance_rule (rule_code, regulation, domain, description, expression, severity) VALUES
('REACH_SVHC_01','REACH','COMMON',
 'SVHC 물질이 0.1 중량% 초과 포함되면 신고 의무',
 'material_composition.svhc_flag AND content_rate > 0.1', 'HIGH'),
('ROHS_01','RoHS','COMMON',
 'RoHS 제한물질 6종 허용 농도 준수',
 'material_composition.is_hazardous AND content_rate > threshold', 'HIGH'),
('ESPR_COMPLETE_01','ESPR','COMMON',
 'DPP 필수 항목 100% 충족',
 'dpp.completeness = 100', 'CRITICAL'),
('ESPR_CARRIER_01','ESPR','COMMON',
 '데이터 캐리어(QR) 발급 완료',
 'exists(data_carrier)', 'CRITICAL'),
('ESPR_REGISTRY_01','ESPR','COMMON',
 'EU DPP 레지스트리 등록 완료',
 'exists(registry_entry where status=REGISTERED)', 'HIGH'),
('CBAM_01','CBAM','STEEL',
 'CBAM 대상 품목은 내재배출량 신고 필요',
 'CBAM_APPLICABLE = true AND PCF_VALUE is not null', 'MEDIUM'),
('CE_01','CE','COMMON',
 'EU 적합성선언서 유효',
 'document(EU_DOC).review_status = APPROVED', 'HIGH'),
('WEEE_01','WEEE','COMMON',
 '수명종료 회수·처리 정보 제공',
 'DISMANTLING_INFO is not null', 'LOW');
