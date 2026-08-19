-- =====================================================================
-- Enum 타입 필드의 선택지(code_master) 시딩 + requirement_field.code_group 연결
--
-- 분류표에서 데이터 타입이 Enum 인 항목이 26개다. 지금까지 code_group 컬럼은 존재만 하고
-- 아무 데도 안 읽혔고(코드마스터 조회 API 자체가 없었다), V16/V17 이 FABRIC_TYPE·
-- BATTERY_CHEMISTRY·BATTERY_CATEGORY 같은 그룹명을 적어뒀지만 정작 그 그룹에 값이 한 줄도
-- 없어서 FE 는 전부 자유 텍스트로 받고 있었다. "코일"과 "Coil"과 "coil"이 다 들어온다.
--
-- 여기서 선택지를 실제로 심고, 대응하는 requirement_field 행에 code_group 을 걸어준다.
-- 열거값이 명확한 것만 다룬다 - 물질명·표준명처럼 사실상 자유입력인 Enum(예: Cathode_
-- Active_Material_Family)은 건드리지 않는다. 잘못된 선택지 목록은 자유입력보다 나쁘다.
-- =====================================================================

INSERT INTO code_master (code_group, code, name_ko, name_en, sort_order) VALUES
-- 철강 ────────────────────────────────────────────────────────────────
('CHEM_ANALYSIS_TYPE','LADLE','레이들 분석','Ladle Analysis',10),
('CHEM_ANALYSIS_TYPE','PRODUCT','제품 분석','Product Analysis',20),

('TEST_DIRECTION','L','압연 방향(L)','Longitudinal',10),
('TEST_DIRECTION','T','폭 방향(T)','Transverse',20),
('TEST_DIRECTION','Z','두께 방향(Z)','Through-thickness',30),

('PRODUCTION_ROUTE','BF_BOF','고로-전로(BF-BOF)','Blast Furnace - Basic Oxygen Furnace',10),
('PRODUCTION_ROUTE','EAF','전기로(EAF)','Electric Arc Furnace',20),
('PRODUCTION_ROUTE','DRI_EAF','직접환원철-전기로(DRI-EAF)','Direct Reduced Iron - EAF',30),
('PRODUCTION_ROUTE','SR_BOF','용융환원-전로(SR-BOF)','Smelting Reduction - BOF',40),

('IRONMAKING_PROCESS','BLAST_FURNACE','고로','Blast Furnace',10),
('IRONMAKING_PROCESS','DRI','직접환원(DRI)','Direct Reduction',20),
('IRONMAKING_PROCESS','SMELTING_REDUCTION','용융환원','Smelting Reduction',30),
('IRONMAKING_PROCESS','NONE','해당 없음(스크랩 전량)','Not Applicable',90),

('STEELMAKING_PROCESS','BOF','전로(BOF)','Basic Oxygen Furnace',10),
('STEELMAKING_PROCESS','EAF','전기로(EAF)','Electric Arc Furnace',20),
('STEELMAKING_PROCESS','OHF','평로(OHF)','Open Hearth Furnace',30),

('SURFACE_TREATMENT','NONE','미처리','None',10),
('SURFACE_TREATMENT','HDG','용융아연도금(HDG)','Hot-Dip Galvanised',20),
('SURFACE_TREATMENT','EG','전기아연도금(EG)','Electro-Galvanised',30),
('SURFACE_TREATMENT','ALZN','알루미늄-아연 도금','Aluminium-Zinc Coated',40),
('SURFACE_TREATMENT','PAINTED','도장','Painted / Pre-coated',50),

('ELECTRICITY_SOURCE','GRID','계통 전력','Grid',10),
('ELECTRICITY_SOURCE','PPA','재생에너지 PPA','Renewable PPA',20),
('ELECTRICITY_SOURCE','ONSITE','자체 발전','On-site Generation',30),

('MTC_TYPE','EN10204_2_1','EN 10204 2.1 (적합선언)','EN 10204 Type 2.1',10),
('MTC_TYPE','EN10204_2_2','EN 10204 2.2 (시험보고서)','EN 10204 Type 2.2',20),
('MTC_TYPE','EN10204_3_1','EN 10204 3.1 (검사증명서)','EN 10204 Type 3.1',30),
('MTC_TYPE','EN10204_3_2','EN 10204 3.2 (제3자 입회)','EN 10204 Type 3.2',40),

-- 배터리 ──────────────────────────────────────────────────────────────
('BATTERY_CATEGORY','EV','전기차용(EV)','Electric Vehicle Battery',10),
('BATTERY_CATEGORY','LMT','경형 이동수단용(LMT)','Light Means of Transport',20),
('BATTERY_CATEGORY','INDUSTRIAL','산업용(2kWh 초과)','Industrial (>2kWh)',30),
('BATTERY_CATEGORY','SLI','시동·조명·점화용(SLI)','Starting, Lighting, Ignition',40),
('BATTERY_CATEGORY','PORTABLE','휴대용','Portable',50),

('BATTERY_CHEMISTRY','NMC','리튬 니켈망간코발트(NMC)','Li-NMC',10),
('BATTERY_CHEMISTRY','NCA','리튬 니켈코발트알루미늄(NCA)','Li-NCA',20),
('BATTERY_CHEMISTRY','LFP','리튬 인산철(LFP)','LiFePO4',30),
('BATTERY_CHEMISTRY','LMO','리튬 망간산화물(LMO)','Li-Mn2O4',40),
('BATTERY_CHEMISTRY','LTO','리튬 티타네이트(LTO)','Li4Ti5O12',50),
('BATTERY_CHEMISTRY','NIMH','니켈수소(NiMH)','Nickel-Metal Hydride',60),
('BATTERY_CHEMISTRY','LEAD_ACID','납축전지','Lead-Acid',70),

('BATTERY_STATUS','ORIGINAL','신품(Original)','Original',10),
('BATTERY_STATUS','REPURPOSED','재목적화(Repurposed)','Repurposed',20),
('BATTERY_STATUS','REUSED','재사용(Reused)','Reused',30),
('BATTERY_STATUS','REMANUFACTURED','재제조(Remanufactured)','Remanufactured',40),
('BATTERY_STATUS','WASTE','폐배터리','Waste',50),

('ELECTROLYTE_TYPE','LIQUID','액체 전해질','Liquid',10),
('ELECTROLYTE_TYPE','GEL','겔 전해질','Gel',20),
('ELECTROLYTE_TYPE','POLYMER','폴리머 전해질','Polymer',30),
('ELECTROLYTE_TYPE','SOLID','전고체','Solid-state',40),

('CASING_MATERIAL','ALUMINIUM','알루미늄','Aluminium',10),
('CASING_MATERIAL','STEEL','스틸','Steel',20),
('CASING_MATERIAL','PLASTIC','플라스틱','Plastic',30),
('CASING_MATERIAL','COMPOSITE','복합소재','Composite',40),

-- 섬유 ────────────────────────────────────────────────────────────────
('FIBER_TYPE','COTTON','면','Cotton',10),
('FIBER_TYPE','ORGANIC_COTTON','유기농 면','Organic Cotton',15),
('FIBER_TYPE','POLYESTER','폴리에스터','Polyester',20),
('FIBER_TYPE','RECYCLED_POLYESTER','재생 폴리에스터','Recycled Polyester',25),
('FIBER_TYPE','NYLON','나일론','Polyamide / Nylon',30),
('FIBER_TYPE','WOOL','울','Wool',40),
('FIBER_TYPE','VISCOSE','비스코스','Viscose',50),
('FIBER_TYPE','LYOCELL','리오셀','Lyocell',55),
('FIBER_TYPE','ELASTANE','엘라스테인','Elastane',60),
('FIBER_TYPE','ACRYLIC','아크릴','Acrylic',70),
('FIBER_TYPE','LINEN','린넨','Linen',80),
('FIBER_TYPE','SILK','실크','Silk',90),
('FIBER_TYPE','DOWN','다운(우모)','Down',95),

('PACKAGING_TYPE','BOX','상자','Box',10),
('PACKAGING_TYPE','POLYBAG','폴리백','Poly Bag',20),
('PACKAGING_TYPE','PAPER_BAG','종이 봉투','Paper Bag',30),
('PACKAGING_TYPE','WRAP','랩·필름','Wrap / Film',40),
('PACKAGING_TYPE','HANGER','행거','Hanger',50),
('PACKAGING_TYPE','PALLET','팔레트','Pallet',60),

('PACKAGING_MATERIAL','PAPER','종이·판지','Paper / Cardboard',10),
('PACKAGING_MATERIAL','PE','폴리에틸렌(PE)','Polyethylene',20),
('PACKAGING_MATERIAL','PP','폴리프로필렌(PP)','Polypropylene',30),
('PACKAGING_MATERIAL','PET','페트(PET)','Polyethylene Terephthalate',40),
('PACKAGING_MATERIAL','ALUMINIUM','알루미늄','Aluminium',50),
('PACKAGING_MATERIAL','WOOD','목재','Wood',60)
ON CONFLICT (code_group, code) DO UPDATE
   SET name_ko = EXCLUDED.name_ko, name_en = EXCLUDED.name_en, sort_order = EXCLUDED.sort_order;

-- ── requirement_field.code_group 연결 ────────────────────────────────
UPDATE requirement_field rf SET code_group = m.grp
  FROM (VALUES
    ('CHEMICAL_ANALYSIS_TYPE','CHEM_ANALYSIS_TYPE'),
    ('TEST_DIRECTION','TEST_DIRECTION'),
    ('MAIN_PRODUCTION_ROUTE','PRODUCTION_ROUTE'),
    ('IRONMAKING_PROCESS','IRONMAKING_PROCESS'),
    ('STEELMAKING_PROCESS','STEELMAKING_PROCESS'),
    ('SURFACE_TREATMENT_TYPE','SURFACE_TREATMENT'),
    ('ELECTRICITY_SOURCE','ELECTRICITY_SOURCE'),
    ('MILL_TEST_CERTIFICATE_TYPE','MTC_TYPE'),
    ('BATTERY_CATEGORY','BATTERY_CATEGORY'),
    ('BATTERY_CHEMISTRY','BATTERY_CHEMISTRY'),
    ('BATTERY_STATUS','BATTERY_STATUS'),
    ('ELECTROLYTE_TYPE','ELECTROLYTE_TYPE'),
    ('BATTERY_CASING_MATERIAL_TYPE','CASING_MATERIAL'),
    ('SHELL_MATERIAL_1_TYPE','FIBER_TYPE'),
    ('SHELL_MATERIAL_2_TYPE','FIBER_TYPE'),
    ('SHELL_MATERIAL_3_TYPE','FIBER_TYPE'),
    ('LINING_MATERIAL_1_TYPE','FIBER_TYPE'),
    ('LINING_MATERIAL_2_TYPE','FIBER_TYPE'),
    ('PADDING_MATERIAL_TYPE','FIBER_TYPE'),
    ('PRIMARY_PACKAGING_TYPE','PACKAGING_TYPE'),
    ('SECONDARY_PACKAGING_TYPE','PACKAGING_TYPE'),
    ('PRIMARY_PACKAGING_MATERIAL_1','PACKAGING_MATERIAL'),
    ('SECONDARY_PACKAGING_MATERIAL_1','PACKAGING_MATERIAL')
  ) AS m(field_code, grp)
 WHERE rf.field_code = m.field_code;

-- 선택지를 심지 못한 Enum 필드는 code_group 을 비워둔다. FE 는 code_group 이 없으면
-- 그냥 텍스트 입력으로 그린다 - 값이 3개뿐인 가짜 드롭다운을 주는 것보다 낫다.
UPDATE requirement_field
   SET code_group = NULL
 WHERE data_type = 'CODE'
   AND code_group IS NOT NULL
   AND code_group NOT IN (SELECT DISTINCT code_group FROM code_master);
