# -*- coding: utf-8 -*-
"""목데이터 PDF에 실릴 값 표.

여기 있는 값은 전부 가짜다. 다만 "형식이 그럴듯한 가짜"여야 파서·ZKP 판정이 실제 문서를
받았을 때와 같은 경로를 타므로, CAS 번호·표준 번호·강종명·전해질 염 같은 건 실제로 존재하는
표기를 쓴다. 회사명·문서번호·제품명은 기존 목데이터 세트(2026-08-16)의 것을 그대로 이어서
쓴다 - 화면 캡처나 시연 시나리오가 그 이름들에 맞춰져 있다.

■ 라벨은 여기서 정하지 않는다
문서에 찍히는 항목 라벨은 parser/spec_fields.py(=requirement_field 시드)에서 가져온다.
여기서 라벨을 따로 적으면 시드와 어긋나는 순간 파서가 그 항목을 못 찾는데, 그 어긋남은
조용히 일어나서 아무도 모른다. 이 파일은 field_code -> 값 만 갖는다.

■ PASS/FAIL
ZKP 판정 대상 문서는 판정에 쓰이는 수치만 바꾼 변형을 만든다. 나머지 항목은 전부 같다 -
"뭐가 달라서 반려됐는지"가 한눈에 보여야 하기 때문이다. 변형 정의는 build.py의 VARIANTS에
있고, 여기에는 기준값(PASS_1에 해당하는 값)만 둔다.
"""

# ── 발행 주체 ────────────────────────────────────────────────────────────
ISSUERS = {
    "STEEL": dict(
        name_ko="스트럭타스틸㈜", name_en="Structa Steel Works Co., Ltd.",
        address="701 Saneop-ro, Dong-gu, Pohang-si, Gyeongbuk 37859, KR",
        biz_reg="506-81-11223", eori="KR5068111223", country="KR",
        product="STRUCTA S355 BEAM", gtin="08801234500019",
    ),
    "TEXTILE": dict(
        name_ko="퓨어라인텍스타일㈜", name_en="PureLine Textile Co., Ltd.",
        address="44 Fashion-ro, Daegu 41585, KR",
        biz_reg="514-81-33445", eori="KR5148133445", country="KR",
        product="PURELINE COTTON TEE", gtin="08809123000065",
    ),
    "BATTERY": dict(
        name_ko="벡터에너지솔루션㈜", name_en="Vector Energy Solutions Co., Ltd.",
        address="129 Samsung-ro, Yeongtong-gu, Suwon-si, Gyeonggi-do 16677, KR",
        biz_reg="124-81-00517", eori="KR1248100517", country="KR",
        product="VECTOR SS2 BATTERY", gtin="08806094500017",
    ),
}

ISSUE_DATE = "2026-02-02"
PRODUCTION_DATE = "2026-02-01"

# ── 도메인별 DPP 데이터 항목 값 ────────────────────────────────────────────
# key = requirement_field.field_code (parser/spec_fields.py와 같은 코드)
VALUES = {}

# ---------------------------------------------------------------- 철강
VALUES["STEEL"] = {
    # 식별 - 제강 성적서 본문 표기와 반드시 같은 값을 쓴다. 본문(위치기반 파서)과
    # 부속서(라벨 파서) 두 경로가 서로 다른 값을 주면 어느 쪽을 믿을지 알 수 없다.
    "HEAT_NO": "H260201",
    "LOT_NO": "LOT-2026-0201-A",
    "STEEL_GRADE": "S355JR",
    "STEEL_STANDARD": "EN 10025-2:2019",
    "NET_WEIGHT_T": "62.4 kg",          # 성적서는 kg로 적는다. 파서가 t로 환산한다.
    "PRODUCTION_DATE": PRODUCTION_DATE,

    # 화학 성분 - 본문 화학성분표(C/Si/Mn/P/S/N/Cu/CEV)와 별개로, 분류표가 T0·T1로 잡은
    # 미량원소까지 부속서에 싣는다. Mn은 본문 표와 같은 값(1.40)을 쓴다.
    "CHEMICAL_ANALYSIS_TYPE": "LADLE",
    "CHEMICAL_TEST_STANDARD": "ASTM E415-21",
    "CHEM_MN_ACTUAL_PCT": "1.40 %",
    "CHEM_CR_ACTUAL_PCT": "0.08 %",
    "CHEM_NI_ACTUAL_PCT": "0.06 %",
    "CHEM_MO_ACTUAL_PCT": "0.012 %",
    "CHEM_ZR_ACTUAL_PCT": "0.002 %",
    "CHEM_CE_ACTUAL_PCT": "0.001 %",
    "CHEM_W_ACTUAL_PCT": "0.004 %",
    "CHEM_CO_ACTUAL_PCT": "0.007 %",
    "CHEM_SB_ACTUAL_PCT": "0.003 %",
    "CHEM_ZN_ACTUAL_PCT": "0.005 %",

    # 기계적 물성 - 본문 기계성질표(ReH 382 / Rm 524 / A 26 / KV 48)와 같은 값.
    "TENSILE_TEST_STANDARD": "ISO 6892-1:2019 Method B",
    "TEST_DIRECTION": "T",
    "YIELD_STRENGTH_ACTUAL_MPA": "382 MPa",
    "YIELD_STRENGTH_MIN_MPA": "355 MPa",
    "TENSILE_STRENGTH_ACTUAL_MPA": "524 MPa",
    "TENSILE_STRENGTH_MIN_MPA": "470 MPa",
    "TENSILE_STRENGTH_MAX_MPA": "630 MPa",
    "ELONGATION_ACTUAL_PCT": "26 %",
    "ELONGATION_MIN_PCT": "22 %",
    "GAUGE_LENGTH_MM": "80 mm",

    "SURFACE_TREATMENT_TYPE": "NONE",
    "MILL_TEST_CERTIFICATE_TYPE": "EN10204_3_1",
    "MILL_TEST_CERTIFICATE_DOCUMENT_URL": "https://docs.structasteel.example.kr/mtc/MTC-STRUCTA-20260201.pdf",

    # 탄소·CBAM - 본문 내재배출량(직접 1.108 / 간접 0.312 / 총 1.420)과 같은 값.
    "CBAM_DIRECT_EMISSIONS_TCO2E_PER_T": "1.108 tCO2e/t",
    "CBAM_INDIRECT_EMISSIONS_TCO2E_PER_T": "0.312 tCO2e/t",
    "PCF_VALUE": "1.420 tCO2e/t",
    "CBAM_ACTUAL_DATA_USED_RATIO_PCT": "86.0 %",
    "CBAM_DEFAULT_VALUE_USED_RATIO_PCT": "14.0 %",
    "ELECTRICITY_EMISSION_FACTOR_TCO2E_PER_MWH": "0.412 tCO2e/MWh",
    "ELECTRICITY_SOURCE": "GRID",
    "PRECURSOR_1_NAME": "용선 (Hot Metal)",
    "PRECURSOR_1_QUANTITY_T_PER_T": "0.842 t/t",
    "PRECURSOR_1_SPECIFIC_EMISSIONS": "1.684",
    "PRECURSOR_2_NAME": "철스크랩 (Steel Scrap)",
    "PRECURSOR_2_QUANTITY_T_PER_T": "0.213 t/t",
    "PRECURSOR_2_SPECIFIC_EMISSIONS": "0.021",
    "PRECURSOR_3_NAME": "생석회 (Burnt Lime)",
    "PRECURSOR_3_QUANTITY_T_PER_T": "0.048 t/t",
    "PRECURSOR_3_SPECIFIC_EMISSIONS": "1.192",
    "CBAM_EMISSIONS_VERIFIED_BY_THIRD_PARTY": "예",
    "CBAM_VERIFICATION_BODY_NAME": "TÜV SÜD Korea Ltd.",
    "CBAM_VERIFICATION_REPORT_URL": "https://verify.tuvsud.example.eu/cbam/2026Q1/STRUCTA-001",

    # 유해물질
    "SVHC_PRESENCE_IN_COATING": "아니오",
    "SVHC_SUBSTANCE_NAME": "해당 없음",
    "SVHC_CAS_NUMBER": "해당 없음",
    "SVHC_CONCENTRATION_PCT": "0.00 %",
    "ROHS_COMPLIANT_STATUS": "예",
    "HEXAVALENT_CHROMIUM_CR6_PRESENCE": "아니오",

    "CERTIFICATE_OF_ORIGIN_URL": "https://coo.chamber.example.kr/2026/KR-C-2026-0201-STR.pdf",
}

# ---------------------------------------------------------------- 섬유
# 겉감/안감/충전재 혼용률은 케어라벨 본문의 섬유 조성(메리노 울 80 / 재생 폴리아미드 15 /
# 엘라스테인 5)과 같은 값이어야 한다 - 본문 합계 100%가 ZKP 판정 대상이고, 부속서가 다른
# 숫자를 말하면 문서 자체가 앞뒤가 안 맞는다.
VALUES["TEXTILE"] = {
    "PRODUCTION_DATE": PRODUCTION_DATE,
    "SHELL_COMPONENT_NAME": "겉감 (Body Shell)",
    "SHELL_MATERIAL_1_TYPE": "WOOL",
    "SHELL_MATERIAL_1_PERCENTAGE_PCT": "80 %",
    "SHELL_MATERIAL_2_TYPE": "RECYCLED_POLYESTER",
    "SHELL_MATERIAL_2_PERCENTAGE_PCT": "15 %",
    "SHELL_MATERIAL_3_TYPE": "ELASTANE",
    "SHELL_MATERIAL_3_PERCENTAGE_PCT": "5 %",
    "LINING_COMPONENT_NAME": "안감 (Neck Tape Lining)",
    "LINING_MATERIAL_1_TYPE": "COTTON",
    "LINING_MATERIAL_1_PERCENTAGE_PCT": "95 %",
    "LINING_MATERIAL_2_TYPE": "ELASTANE",
    "LINING_MATERIAL_2_PERCENTAGE_PCT": "5 %",
    "PADDING_COMPONENT_NAME": "해당 없음 (충전재 미적용)",
    "PADDING_MATERIAL_TYPE": "COTTON",
    "PADDING_PERCENTAGE_PCT": "0 %",
    "PADDING_ANIMAL_WELFARE_CERT": "해당 없음",

    # SVHC - 실제 REACH 후보목록 물질과 CAS 번호를 쓴다. 농도는 전부 0.1 wt% 미만이라
    # 신고 의무가 발생하지 않는 수준으로 잡았다(Art.33 통보 대상이 되면 문서가 하나 더
    # 필요해지는데, 그건 이 목데이터 세트 범위 밖이다).
    "SVHC_1_SUBSTANCE_NAME": "DEHP (Bis(2-ethylhexyl) phthalate)",
    "SVHC_1_CAS_NUMBER": "117-81-7",
    "SVHC_1_CONCENTRATION_PCT": "0.008 %",
    "SVHC_1_LOCATION_IN_PRODUCT": "프린트 잉크층",
    "SVHC_1_TEST_REPORT_URL": "https://reports.intertek.example.eu/2026/TX-0201-01.pdf",
    "SVHC_2_SUBSTANCE_NAME": "DBP (Dibutyl phthalate)",
    "SVHC_2_CAS_NUMBER": "84-74-2",
    "SVHC_2_CONCENTRATION_PCT": "0.004 %",
    "SVHC_2_LOCATION_IN_PRODUCT": "프린트 잉크층",
    "SVHC_2_TEST_REPORT_URL": "https://reports.intertek.example.eu/2026/TX-0201-02.pdf",
    "SVHC_3_SUBSTANCE_NAME": "Nonylphenol ethoxylates (NPEO)",
    "SVHC_3_CAS_NUMBER": "9016-45-9",
    "SVHC_4_SUBSTANCE_NAME": "Formaldehyde",
    "SVHC_4_CAS_NUMBER": "50-00-0",
    "SVHC_4_CONCENTRATION_PCT": "0.001 %",
    "SVHC_4_LOCATION_IN_PRODUCT": "봉제사 가공층",
    "SVHC_5_SUBSTANCE_NAME": "Boric acid",
    "SVHC_5_CAS_NUMBER": "10043-35-3",
    "SVHC_5_CONCENTRATION_PCT": "0.002 %",
    "SVHC_5_LOCATION_IN_PRODUCT": "라벨 접착층",
    "SVHC_6_SUBSTANCE_NAME": "Lead chromate",
    "SVHC_6_CAS_NUMBER": "7758-97-6",
    "SVHC_6_CONCENTRATION_PCT": "0.000 %",
    "SVHC_7_SUBSTANCE_NAME": "Cadmium sulphide",
    "SVHC_7_CAS_NUMBER": "1306-23-6",
    "SVHC_7_CONCENTRATION_PCT": "0.000 %",
    "SVHC_8_SUBSTANCE_NAME": "1,4-Dioxane",
    "SVHC_8_CAS_NUMBER": "123-91-1",
    "SVHC_8_CONCENTRATION_PCT": "0.001 %",
    "SVHC_9_SUBSTANCE_NAME": "Diisohexyl phthalate",
    "SVHC_9_CAS_NUMBER": "71850-09-4",
    "SVHC_9_CONCENTRATION_PCT": "0.000 %",
    "SVHC_10_SUBSTANCE_NAME": "Perfluorohexanoic acid (PFHxA)",
    "SVHC_10_CAS_NUMBER": "307-24-4",
    "SVHC_10_CONCENTRATION_PCT": "0.000 %",
    "PFAS_PRESENCE": "아니오",
    "AZO_DYES_PRESENCE": "아니오",
    "PHTHALATES_PRESENCE": "예",
    "FORMALDEHYDE_PRESENCE": "예",

    "PACKAGING_HEAVY_METAL_TESTED": "예",
    "PACKAGING_LEAD_PB_CONCENTRATION_PPM": "12 ppm",
    "PACKAGING_CADMIUM_CD_CONCENTRATION_PPM": "3 ppm",

    "DECLARATION_OF_CONFORMITY_URL": "https://doc.pureline.example.kr/2026/DoC-PL-TEE-180.pdf",
    "PCF_VALUE": "8.4",
}

# ---------------------------------------------------------------- 배터리
# CRM 함유중량 합계는 총 중량(31.5 kg)을 넘지 않아야 한다 - 넘으면 문서 자체가 말이 안 된다.
VALUES["BATTERY"] = {
    "PRODUCTION_DATE": PRODUCTION_DATE,
    "BATTERY_NET_WEIGHT_KG": "31.5 kg",
    "EU_DECLARATION_OF_CONFORMITY_ID": "DoC-VEC-2026-0201",

    "BATTERY_CHEMISTRY": "NMC",
    "NUMBER_OF_CELLS": "96",
    "NUMBER_OF_MODULES": "8",
    "CATHODE_ACTIVE_MATERIAL_FAMILY": "Li(NiMnCo)O2",
    "CATHODE_COMPOSITION_DETAILS": "NMC622 (Ni 60 / Mn 20 / Co 20)",
    "CATHODE_BINDER_MATERIAL": "PVDF",
    "CATHODE_CONDUCTIVE_ADDITIVE": "Carbon black (Super P)",
    "ANODE_ACTIVE_MATERIAL_FAMILY": "Graphite",
    "ANODE_COMPOSITION_DETAILS": "천연흑연 85 / 인조흑연 12 / SiOx 3",
    "ANODE_BINDER_MATERIAL": "SBR + CMC",
    "ANODE_CONDUCTIVE_ADDITIVE": "Carbon nanotube (0.5 wt%)",
    "ELECTROLYTE_TYPE": "LIQUID",
    "ELECTROLYTE_SOLVENT": "EC / EMC / DMC (3:5:2)",
    "ELECTROLYTE_SALT": "LiPF6 1.0 M",
    "SEPARATOR_MATERIAL": "PE 기재 + 세라믹 코팅 (16 µm)",
    "PACK_ENCLOSURE_PROTECTION_RATING": "IP67",

    "RATED_CAPACITY_AH": "100 Ah",
    "RATED_CAPACITY_MEASUREMENT_METHOD": "IEC 62660-1 0.33C 방전 (25℃)",
    "NOMINAL_ENERGY_WH": "4800 Wh",
    "NOMINAL_VOLTAGE_V": "48.0 V",
    "MAXIMUM_VOLTAGE_V": "54.6 V",
    "MINIMUM_VOLTAGE_V": "39.6 V",
    "MAXIMUM_ALLOWED_DISCHARGE_POWER_W": "9600 W",
    "MAXIMUM_ALLOWED_CHARGE_POWER_W": "4800 W",
    "OPERATING_TEMPERATURE_MAX_C": "55 ℃",
    "OPERATING_TEMPERATURE_MIN_C": "-20 ℃",
    "STORAGE_TEMPERATURE_MAX_C": "45 ℃",
    "STORAGE_TEMPERATURE_MIN_C": "-30 ℃",
    "INITIAL_INTERNAL_RESISTANCE_MOHM": "1.8 mΩ",
    "INTERNAL_RESISTANCE_MEASUREMENT_METHOD": "IEC 62660-1 DCIR 10s / 1C",
    "EXPECTED_CYCLE_LIFE_COUNT": "3500 회",
    "REFERENCE_TEST_CONDITIONS_FOR_CYCLE_LIFE": "25℃ · 1C/1C · DoD 80%",
    "CAPACITY_FADE_THRESHOLD_PCT": "20 %",
    "MAXIMUM_CONTINUOUS_DISCHARGE_CURRENT_A": "200 A",
    "MAXIMUM_PULSE_DISCHARGE_CURRENT_A": "400 A",
    "RECOMMENDED_CUT_OFF_VOLTAGE_V": "40.0 V",
    "ENERGY_EFFICIENCY_ROUND_TRIP_PCT": "94.5 %",
    "CALENDAR_LIFE_EXPECTANCY_YEARS": "12 년",
    "VIBRATION_TEST_STANDARD_UN38_3_PASSED": "예",
    "MECHANICAL_SHOCK_TEST_PASSED": "예",

    "CRM_COBALT_WEIGHT_KG": "1.26 kg",
    "CRM_COBALT_PERCENTAGE": "4.0",
    "CRM_LITHIUM_WEIGHT_KG": "0.63 kg",
    "CRM_LITHIUM_PERCENTAGE": "2.0",
    "CRM_NICKEL_WEIGHT_KG": "3.78 kg",
    "CRM_NICKEL_PERCENTAGE": "12.0",
    "CRM_MANGANESE_WEIGHT_KG": "1.26 kg",
    "CRM_MANGANESE_PERCENTAGE": "4.0",
    "CRM_NATURAL_GRAPHITE_WEIGHT_KG": "5.04 kg",
    "CRM_NATURAL_GRAPHITE_PERCENTAGE": "16.0",
    "CRM_LEAD_WEIGHT_KG": "0.00 kg",
    "CRM_LEAD_PERCENTAGE": "0.0",
    "CRM_COPPER_WEIGHT_KG": "3.15 kg",
    "CRM_ALUMINUM_WEIGHT_KG": "4.41 kg",
    "CRM_IRON_WEIGHT_KG": "2.52 kg",
    "CRM_PHOSPHORUS_WEIGHT_KG": "0.16 kg",
    "CRM_TANTALUM_WEIGHT_KG": "0.00 kg",
    "CRM_SILICON_WEIGHT_KG": "0.09 kg",

    "SVHC_PRESENT": "예",
    "SVHC_SUBSTANCE_NAME_1": "Cobalt dichloride",
    "SVHC_SUBSTANCE_CAS_NUMBER_1": "7646-79-9",
    "SVHC_CONCENTRATION_PCT_1": "0.04",
    "SVHC_LOCATION_IN_BATTERY_1": "양극 활물질",
    "SVHC_SUBSTANCE_NAME_2": "1,2-Dimethoxyethane",
    "SVHC_SUBSTANCE_CAS_NUMBER_2": "110-71-4",
    "SVHC_CONCENTRATION_PCT_2": "0.02",
    "SVHC_LOCATION_IN_BATTERY_2": "전해액",
    "SVHC_SUBSTANCE_NAME_3": "Lead",
    "SVHC_SUBSTANCE_CAS_NUMBER_3": "7439-92-1",
    "SVHC_CONCENTRATION_PCT_3": "0.00",

    "TOXIC_GAS_RELEASE_RISK_ASSESSMENT_URL": "https://safety.vector.example.kr/2026/HF-risk-VSS2.pdf",
    "SUPPLY_CHAIN_AUDIT_BODY_NAME": "RCS Global Group",
    "SUPPLY_CHAIN_AUDIT_DATE": "2026-01-15",
    "TEST_REPORT_UN38_3_TRANSPORTATION": "https://reports.vector.example.kr/un383/VSS2-2026-0201.pdf",
    "PCF_VALUE": "2.8",
}
