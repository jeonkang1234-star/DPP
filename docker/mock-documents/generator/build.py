# -*- coding: utf-8 -*-
"""도메인별 목데이터 PDF 생성기.

사용법:
    python3 docker/mock-documents/generator/build.py            # docker/mock-documents/ 에 생성
    python3 docker/mock-documents/generator/build.py --out /tmp/x

■ 무엇이 바뀌었나 (2026-08-19)
이전 세트(52건)는 ZKP 판정에 쓰이는 수치와 공통 메타데이터만 담고 있었다. requirement_field
가 T0·T1 기준으로 재구축되면서 문서에서 뽑아야 할 항목이 26개에서 192개가 됐고, 그 항목들이
문서 어디에도 없으면 파서가 아무리 정확해도 화면은 빈 채로 남는다.

그래서 모든 문서에 **부속서 A - 디지털 제품여권 데이터 항목**을 붙였다. 실제 성적서·인증서에도
규제 대응용 데이터 시트가 부록으로 붙는 일이 흔하고, 무엇보다 라벨을 requirement_field 시드
(parser/spec_fields.py)에서 그대로 가져오기 때문에 문서와 파서가 어긋날 수 없다. 라벨을 손으로
적었다면 시드가 바뀌는 순간 조용히 어긋났을 것이다.

본문(성적서 표, 케어라벨 조성, OEKO-TEX 시험표 등)은 이전 세트의 줄 구조를 그대로 지켰다.
parser/extractor.py의 타입별 파서가 줄 오프셋에 의존하기 때문에 한 줄만 어긋나도 ZKP 판정이
통째로 깨진다. verify.py가 실제 파서를 돌려서 그걸 매번 확인한다.

■ PASS / FAIL
ZKP 판정 대상 4종(제강성적서·케어라벨·OEKO-TEX·배터리 탄소발자국·재활용 결과)은 판정에 쓰이는
수치만 바꾼 변형을 만든다. 나머지는 전부 동일하다 - 무엇 때문에 반려됐는지가 한눈에 보여야 한다.
CBAM은 de minimis(50t) 초과 여부가 정보성 플래그라 반려 케이스 자체가 없어서, PASS/FAIL이
아니라 수입량 두 가지 상태로만 나눈다.
"""
import argparse
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(REPO, "parser"))

import mock_data
import render
import spec_fields

LABEL = {f["code"]: f["label_ko"] for f in spec_fields.SPEC_FIELDS}
LABEL_EN = {f["code"]: f["label_en"] for f in spec_fields.SPEC_FIELDS}
SECTION_OF = {f["code"]: f["section"] for f in spec_fields.SPEC_FIELDS}

SECTION_TITLE = {
    "IDENTIFIER": "A.1 식별자", "OPERATOR": "A.2 경제운영자·제조시설",
    "COMPOSITION": "A.3 셀 화학·구성", "MATERIAL": "A.4 재질 구성(BOM)",
    "CHEMISTRY": "A.5 화학 성분", "MECHANICAL": "A.6 기계적 물성",
    "PERFORMANCE": "A.7 성능·내구성", "PROCESS": "A.8 공정 정보",
    "CRM": "A.9 핵심 원자재(CRM)", "CARBON": "A.10 탄소·CBAM",
    "HAZARD": "A.11 유해물질·SVHC", "CIRCULAR": "A.12 순환성·해체",
    "PACKAGING": "A.13 포장재", "DUE_DILIGENCE": "A.14 공급망 실사",
    "TRADE": "A.15 원산지·통관", "DOCUMENT": "A.16 증빙·문서",
}

# ── 어떤 문서가 어떤 섹션을 싣는가 ────────────────────────────────────────
# 문서의 성격과 맞는 항목만 싣는다. 제강 성적서에 배터리 셀 화학을 적을 수는 없다.
# 도메인별로 모든 PARSER 항목이 최소 한 문서에는 실려야 하고(verify.py가 검사한다),
# 그래야 문서를 다 올렸을 때 입력 폼의 자동 채움 칸이 전부 찬다.
DOC_SECTIONS = {
    ("STEEL", "Q2_05_MILL_SHEET"): ["IDENTIFIER", "CHEMISTRY", "MECHANICAL", "PROCESS", "DOCUMENT"],
    ("STEEL", "Q2_06_CBAM_REPORT"): ["CARBON"],
    ("STEEL", "DOC_SOC_SDS"): ["HAZARD"],
    ("STEEL", "DOC_COO"): ["TRADE"],
    ("TEXTILE", "Q1_04_CARE_LABEL"): ["IDENTIFIER", "MATERIAL"],
    ("TEXTILE", "Q3_10_OEKOTEX_LABEL"): ["HAZARD", "PACKAGING"],
    ("TEXTILE", "DOC_EU_DOC"): ["DOCUMENT"],
    ("TEXTILE", "DOC_PCF_REPORT"): ["CARBON"],
    ("BATTERY", "Q2_07_BATTERY_CARBON"): ["IDENTIFIER", "COMPOSITION", "CRM", "CARBON"],
    ("BATTERY", "Q4_15_RECYCLING_REPORT"): ["CIRCULAR"],
    ("BATTERY", "DOC_TECH_FILE"): ["PERFORMANCE"],
    ("BATTERY", "DOC_SOC_SDS"): ["HAZARD"],
    ("BATTERY", "DOC_DUE_DILIGENCE_REPORT"): ["DUE_DILIGENCE"],
    ("BATTERY", "DOC_TEST_REPORT"): ["DOCUMENT"],
}


def annex(doc, domain, sections, values=None):
    """부속서 A - 라벨 : 값. 반드시 한 줄에 라벨과 값이 같이 있어야 한다(render.py 주석 참고)."""
    vals = dict(mock_data.VALUES[domain])
    if values:
        vals.update(values)
    codes_by_section = {}
    for f in spec_fields.SPEC_FIELDS:
        if f["domain"] not in ("COMMON", domain):
            continue
        if f["section"] not in sections:
            continue
        if f["code"] not in vals:
            continue
        codes_by_section.setdefault(f["section"], []).append(f["code"])
    if not codes_by_section:
        return

    doc.space(6)
    doc.rule()
    doc.line("부속서 A — 디지털 제품여권 데이터 항목 (Annex A · DPP Data Attributes)", size=10.5, bold=True, gap=15)
    doc.line("ESPR (EU) 2024/1781 및 제품군별 규정에 따른 여권 기재 항목. 항목명은 여권 데이터 사전을 따른다.",
             size=8, color=(0.42, 0.47, 0.55), gap=14)
    for section in sections:
        codes = codes_by_section.get(section)
        if not codes:
            continue
        doc.band(SECTION_TITLE.get(section, section))
        for code in codes:
            doc.line(doc.pad(LABEL[code], size=9) + ": " + str(vals[code]), size=9, gap=12.2)
            doc.line("    " + LABEL_EN[code], size=7, color=(0.55, 0.60, 0.68), gap=10.5)
        doc.space(3)


def header(doc, domain, doc_no, title_ko, title_en, date_label="발행일"):
    iss = mock_data.ISSUERS[domain]
    doc.line(iss["name_ko"] + "   문서번호 " + doc_no, size=11, bold=True, gap=14)
    doc.line(iss["name_en"], size=8.5, color=(0.35, 0.40, 0.48), gap=11)
    doc.line(iss["address"], size=8.5, color=(0.35, 0.40, 0.48), gap=11)
    doc.line(date_label + " " + mock_data.ISSUE_DATE, size=8.5, color=(0.35, 0.40, 0.48), gap=11)
    doc.line("사업자/법인번호 " + iss["biz_reg"] + " · EORI " + iss["eori"], size=8.5,
             color=(0.35, 0.40, 0.48), gap=16)
    doc.rule()
    doc.line(title_ko, size=15, bold=True, gap=19)
    doc.line(title_en, size=8.5, color=(0.35, 0.40, 0.48), gap=16)


def footer(doc, doc_no):
    doc.space(10)
    doc.rule()
    doc.line("MOCK / DEMONSTRATION DATA - " + doc_no +
             " - Generated for EU Digital Product Passport system - CONFIDENTIAL",
             size=7.5, color=(0.55, 0.60, 0.68), gap=11)


# ══════════════════════════════════════════════════════════════════════════
# ZKP 판정 대상 문서 - 본문 줄 구조를 이전 세트와 똑같이 유지해야 한다.
# parser/extractor.py가 줄 오프셋으로 읽기 때문에 한 줄만 어긋나도 판정이 깨진다.
# ══════════════════════════════════════════════════════════════════════════

X_EL, X_VAL, X_LIM = 0, 150, 300
X_M1, X_M2, X_M3, X_M4 = 0, 170, 260, 350


def build_mill_sheet(path, chem, mech, doc_no="MTC-STRUCTA-20260201", overrides=None):
    """Q2_05 제강 성적서. chem/mech는 {원소: (측정값, 한계표기)} 형태."""
    d = render.Doc(path)
    iss = mock_data.ISSUERS["STEEL"]
    header(d, "STEEL", doc_no, "제 강 성적서 (Mill Test Certificate)",
           "INSPECTION CERTIFICATE · EN 10204:2004 Type 3.1 · 제품표준 EN 10025-2:2019")
    d.line("주문/제품 " + iss["product"] + " (S355JR)   규격 300×150×6500 mm   중량 62.4 kg", gap=13)
    d.line("Heat No. (용해) H260201   Cast/Lot No. (주조) LOT-2026-0201-A", gap=16)

    d.band("화학 성분 분석 (Ladle Analysis, wt%)")
    d.row([(X_EL, "원소"), (X_VAL, "측정값"), (X_LIM, "규격 한계")], bold=True)
    for el in ["C", "Si", "Mn", "P", "S", "N", "Cu", "CEV"]:
        val, lim = chem[el]
        d.row([(X_EL, el), (X_VAL, val), (X_LIM, lim)])
    d.space(6)

    d.band("기계적 성질 (Mechanical Properties)")
    d.row([(X_M1, "시험 항목"), (X_M2, "단위"), (X_M3, "측정값"), (X_M4, "규격")], bold=True)
    for label, unit, val, spec in mech:
        d.row([(X_M1, label), (X_M2, unit), (X_M3, val), (X_M4, spec)])
    d.space(6)

    d.band("판정 및 추가 정보")
    d.line("본 성적서는 EN 10204 Type 3.1에 따라 제조 부문과 독립된 공인 검사원이 발행하며,", gap=12)
    d.line("위 결과는 명시된 Heat No.에 대한 실측값임.", gap=13)

    annex(d, "STEEL", DOC_SECTIONS[("STEEL", "Q2_05_MILL_SHEET")], overrides)
    footer(d, doc_no)
    d.save()


def build_cbam(path, import_qty_t, doc_no="CBAM-2026Q1-STRUCTA-001"):
    d = render.Doc(path)
    iss = mock_data.ISSUERS["STEEL"]
    header(d, "STEEL", doc_no, "CBAM 탄소국경조정 보고서",
           "CARBON BORDER ADJUSTMENT MECHANISM REPORT · Regulation (EU) 2023/956")
    d.line("보고 기간 2026 Q1   신고인 DPP Demo GmbH · EORI DE812345678", gap=13)
    # de minimis 판정이 이 줄의 't' 값을 읽는다(_CBAM_IMPORT_QTY_PAT).
    d.line("상품 분류 (CN Code) 721633 — 철강 제품   수입 수량 " + import_qty_t + " t", gap=13)
    d.line("생산 설비 " + iss["name_en"] + "   설비 소재국 KR", gap=16)
    d.band("내재 배출량 (Embedded Emissions)")
    d.line("직접 배출 (Direct) 1.108 tCO2e/t", gap=12)
    d.line("간접 배출 (Indirect) 0.312 tCO2e/t", gap=12)
    d.line("총 내재 배출량 1.420 tCO2e/t", gap=12)
    d.line("산정 기준 이행규정 부속서 III 방법론 · 실제 데이터 기반", gap=13)
    annex(d, "STEEL", DOC_SECTIONS[("STEEL", "Q2_06_CBAM_REPORT")])
    footer(d, doc_no)
    d.save()


def build_care_label(path, fibers, doc_no="CARE-PURELINE-2026-001", overrides=None):
    """Q1_04 섬유 케어라벨. fibers = [(섬유명, 비율문자열), ...]
    섬유명/비율이 연속 두 줄이어야 파서가 조성으로 읽는다(_FIBER_LINE_PAT)."""
    d = render.Doc(path)
    iss = mock_data.ISSUERS["TEXTILE"]
    header(d, "TEXTILE", doc_no, "섬유 케어라벨 · 섬유 구성",
           "CARE LABEL — ISO 3758 · Regulation (EU) 1007/2011")
    d.line(iss["product"], size=11, bold=True, gap=14)
    d.line("30℃ 세탁 · 표백 금지 · 건조기 가능 · 중온 다림질 · 드라이클리닝", gap=16)
    d.band("섬유 조성 (Fibre Composition)")
    for name, pct in fibers:
        d.row([(X_EL, name), (X_VAL, pct)])
    d.space(6)
    d.line("Made in KR · PL-TEE-180 / LOT-2026-0201-A · GTIN " + iss["gtin"], gap=14)
    annex(d, "TEXTILE", DOC_SECTIONS[("TEXTILE", "Q1_04_CARE_LABEL")], overrides)
    footer(d, doc_no)
    d.save()


def build_oekotex(path, ph, doc_no="OTX-2026-00101", overrides=None):
    """Q3_10 OEKO-TEX. pH는 '항목 / 기준(범위) / 결과' 세 줄 구조로 읽힌다(_OEKOTEX_PH_PAT)."""
    d = render.Doc(path)
    iss = mock_data.ISSUERS["TEXTILE"]
    d.line("OEKO-TEX® Association   인증번호 " + doc_no, size=11, bold=True, gap=14)
    d.line("Test Institute: Hohenstein Institute", size=8.5, color=(0.35, 0.40, 0.48), gap=11)
    d.line("Genferstrasse 23, 8002 Zürich, Switzerland", size=8.5, color=(0.35, 0.40, 0.48), gap=11)
    d.line("발행 " + mock_data.ISSUE_DATE, size=8.5, color=(0.35, 0.40, 0.48), gap=16)
    d.rule()
    d.line("OEKO-TEX® STANDARD 100", size=15, bold=True, gap=19)
    d.line("CONFIDENCE IN TEXTILES · 유해물질 시험 인증", size=8.5, color=(0.35, 0.40, 0.48), gap=16)
    d.line("인증 제품 " + iss["product"] + " — 오가닉 코튼 티셔츠", gap=13)
    d.line("제품 등급 (Product Class) Class II (피부 직접 접촉)", gap=13)
    d.line("인증 보유자 " + iss["name_en"] + "   유효기간 " + mock_data.ISSUE_DATE + " ~ 12개월", gap=16)
    d.band("시험 항목 (제품 등급별로 상이)")
    d.line("항목 기준 결과", bold=True, gap=13)
    d.line("폼알데하이드 ≤ 16 ppm (Class I) 적합", gap=12)
    d.line("아릴아민 (Azo 염료) ≤ 20 mg/kg 적합", gap=12)
    d.line("중금속 (추출성 Pb·Cd) Pb ≤ 0.2 / Cd ≤ 0.1 mg/kg 적합", gap=12)
    d.row([(X_EL, "pH"), (X_VAL, "4.0 – 7.5"), (X_LIM, ph)])
    d.line("PFAS / 총불소 불검출 적합", gap=13)
    annex(d, "TEXTILE", DOC_SECTIONS[("TEXTILE", "Q3_10_OEKOTEX_LABEL")], overrides)
    footer(d, doc_no)
    d.save()


def build_battery_carbon(path, recycled, doc_no="PCF-VECTOR-2026-001", overrides=None):
    """Q2_07 배터리 탄소발자국. recycled = {'Co':'18.0%', 'Li':..., 'Ni':..., 'Pb':...}
    파서가 '재생원료 함유율' 다음 4줄을 라벨(Co/Li/Ni/Pb), 그 다음 4줄을 값으로 읽는다."""
    d = render.Doc(path)
    iss = mock_data.ISSUERS["BATTERY"]
    header(d, "BATTERY", doc_no, "배터리 탄소발자국 산정보고서",
           "CARBON FOOTPRINT DECLARATION · Regulation (EU) 2023/1542 Art.7 · ISO 14067")
    d.line("제품 / 고유 배터리 식별자(UBI) " + iss["product"] + " · UBI-KR-D0C3B2-0001", gap=13)
    d.line("정격 용량 / 화학조성 4.8 kWh · LiCoO2 / Graphite", gap=13)
    d.line("제조 설비 " + iss["name_en"], gap=13)
    d.line("탄소 성능등급 — A 등급", gap=13)
    d.line("총 탄소발자국 13.52 kg CO2e / 제품", gap=13)
    d.row([(X_EL, "기능단위당"), (X_VAL, "2.8")])
    d.space(4)
    d.band("재생원료 함유율 (Recycled Content)")
    d.row([(0, "Co"), (110, "Li"), (220, "Ni"), (330, "Pb")], bold=True)
    d.row([(0, recycled["Co"]), (110, recycled["Li"]), (220, recycled["Ni"]), (330, recycled["Pb"])])
    d.line("※ EU 2023/1542 제8조 재생원료 최소 기준 대비 사전 충족 여부 모니터링용.", size=8,
           color=(0.42, 0.47, 0.55), gap=13)
    annex(d, "BATTERY", DOC_SECTIONS[("BATTERY", "Q2_07_BATTERY_CARBON")], overrides)
    footer(d, doc_no)
    d.save()


def build_recycling(path, overall, materials, doc_no="REC-2026-0101", overrides=None):
    """Q4_15 재활용 처리결과. materials = [(소재명, 투입, 회수, 회수율), ...]
    '소재별 회수 실적' 다음이 4줄 단위(소재명/투입/회수/회수율)로 읽힌다."""
    d = render.Doc(path)
    d.line("DPP Recycle GmbH   보고서 " + doc_no, size=11, bold=True, gap=14)
    d.line("Recycling Result Report", size=8.5, color=(0.35, 0.40, 0.48), gap=11)
    d.line("Hafenstraße 12, 20359 Hamburg, Germany", size=8.5, color=(0.35, 0.40, 0.48), gap=11)
    d.line("처리완료 " + mock_data.ISSUE_DATE, size=8.5, color=(0.35, 0.40, 0.48), gap=16)
    d.rule()
    d.line("재활용 처리 결과 보고서", size=15, bold=True, gap=19)
    d.line("END-OF-LIFE / RECYCLING RESULT REPORT", size=8.5, color=(0.35, 0.40, 0.48), gap=16)
    d.line("대상 제품 (원 DPP) " + mock_data.ISSUERS["BATTERY"]["product"] + " · Serial VSS2-48V100-20260201", gap=13)
    d.line("처리 방법 습식 제련(Hydrometallurgy)", gap=13)
    d.row([(X_EL, "종합 재활용율"), (X_VAL, overall)])
    d.space(4)
    d.band("소재별 회수 실적")
    d.row([(0, "소재"), (150, "투입 (kg)"), (250, "회수 (kg)"), (350, "회수율")], bold=True)
    for name, inp, rec, rate in materials:
        d.row([(0, name), (150, inp), (250, rec), (350, rate)])
    annex(d, "BATTERY", DOC_SECTIONS[("BATTERY", "Q4_15_RECYCLING_REPORT")], overrides)
    footer(d, doc_no)
    d.save()


# ══════════════════════════════════════════════════════════════════════════
# 비-ZKP 문서 - 형식만 갖추면 업로드 즉시 승인되는 10~11종.
# 본문은 이전 세트를 그대로 유지한다. DocumentSlotService가 여기서 PCF/재활용가능성/
# 원산지코드/EORI 등을 뽑아 자동 채움하기 때문에 문구를 바꾸면 그 경로가 조용히 끊긴다.
# ══════════════════════════════════════════════════════════════════════════

PRODUCT_DESC = {
    "STEEL": dict(kind="구조용 H형강", hs="7216.33", qty="1 CARTON", weight="62.4 kg",
                  eur1="EUR1-2026-A000101", ubi="STRUCTA-S355-20260201 · 모델/배치 S355JR / LOT-2026-0201-A",
                  pcr="PCR 철강구조재 2023:01 · 검증기관 TÜV SÜD (독립 제3자 검증)",
                  recyclability="92", repair="B", lab="TÜV SÜD Product Service GmbH (NB 0123)",
                  test_items="EN 10025-2 기계적 성질 / 화학성분", regs="(EU) 2019/1020 시장감시규정, 제품표준 EN 10025-2:2019",
                  pcf_method="ISO 14067 · 배경DB ecoinvent 3.9 · 시스템 경계 Cradle-to-gate"),
    "TEXTILE": dict(kind="오가닉 코튼 티셔츠", hs="6109.10", qty="200 EA", weight="42.0 kg",
                    eur1="EUR1-2026-A000201", ubi="PURELINE-CT-20260201",
                    pcr="PCR 섬유제품 2023:01 · 검증기관 TÜV SÜD",
                    recyclability="88", repair="C", lab="Hohenstein Institute",
                    test_items="색상 견뢰도 / 유해물질", regs="(EU) 1007/2011 섬유제품 명칭 규정",
                    pcf_method="ISO 14067 · 배경DB ecoinvent 3.9"),
    "BATTERY": dict(kind="리튬이온 배터리 모듈", hs="8507.60", qty="1 CARTON", weight="31.6 kg",
                    eur1="EUR1-2026-A000301", ubi="VSS2-48V100-20260201",
                    pcr="PCR 배터리 2023:01 · 검증기관 TÜV SÜD",
                    recyclability="90", repair="B", lab="TÜV SÜD Product Service GmbH (NB 0123)",
                    test_items="EN IEC 62133-2 / EN IEC 62619", regs="(EU) 2023/1542 Battery Regulation",
                    pcf_method="ISO 14067 / EU 배터리규정 부속서 II · 배경DB ecoinvent 3.9"),
}

# 문서 유형별 (문서번호 접두, 한글 제목, 영문 제목)
PLAIN_DOCS = {
    "DOC_TECH_FILE": ("TF", "기술문서 (Technical File)", "TECHNICAL DOCUMENTATION · CE / ESPR"),
    "DOC_PCF_REPORT": ("PCF", "제품 탄소발자국 (PCF) 보고서", "PRODUCT CARBON FOOTPRINT REPORT · ISO 14067"),
    "DOC_LCA_EPD": ("EPD", "환경성적표지 / EPD", "ENVIRONMENTAL PRODUCT DECLARATION · ISO 14025 Type III"),
    "DOC_SOC_SDS": ("SDS", "소재성분표 SDS (Safety Data Sheet)", "MATERIAL SAFETY DATA SHEET"),
    "DOC_EU_DOC": ("DOC", "EU 적합성선언서 (Declaration of Conformity)", "EU DECLARATION OF CONFORMITY"),
    "DOC_TEST_REPORT": ("TR", "시험성적서 (Test Report)", "TEST REPORT · Accredited under EN ISO/IEC 17025"),
    "DOC_LABEL": ("LBL", "제품 라벨 · 데이터 캐리어", "DIGITAL PRODUCT PASSPORT LABEL · GS1 Digital Link"),
    "DOC_MANUAL": ("UM", "사용설명서 · 안전 정보", "USER MANUAL & SAFETY INFORMATION"),
    "DOC_SCRAP_PROOF": ("SCRAP", "스크랩 매입증빙·재생원료 확인서", "SCRAP PURCHASE & RECYCLED CONTENT CERTIFICATE"),
    "DOC_GRS_CERTIFICATE": ("GRS", "GRS/RCS 거래증명서", "GLOBAL RECYCLED STANDARD TRANSACTION CERTIFICATE"),
    "DOC_DUE_DILIGENCE_REPORT": ("DDR", "공급망 실사 보고서", "SUPPLY CHAIN DUE DILIGENCE REPORT · OECD 5단계"),
    # 원산지증명서는 EUR.1 서식이라 아래 build_plain에서 별도 분기로 그린다.
    "DOC_COO": ("EUR1", "EUR.1 이동증명서", "MOVEMENT CERTIFICATE"),
}

BODY = {
    ("STEEL", "DOC_TECH_FILE"): [
        "1. 제품 일반 설명 - 정격 사양 및 의도된 사용 조건은 사용설명서에 정의됨.",
        "2. 설계·제조 도면 및 회로도 - 조립도(DWG)/부품표(BOM) 첨부.",
        "3. 적용 요구사항 및 위험성 평가 - ISO 12100 기반 위험성 평가 수행.",
        "4. 적용 조화표준 목록 - EN 10025-2 등 관련 표준 첨부.",
        "5. 시험·검사 성적서 - 공인시험기관 발급 성적서 첨부."],
    ("TEXTILE", "DOC_TECH_FILE"): [
        "1. 제품 일반 설명 - 오가닉 코튼 티셔츠, 정격 치수 및 사용 조건.",
        "2. 설계·제조 도면 - 패턴/재단 사양서 첨부.",
        "3. 적용 요구사항 - (EU) 1007/2011 섬유 명칭·혼용률 표시 규정.",
        "4. 적용 조화표준 목록 - ISO 3758 관리라벨 기호.",
        "5. 시험·검사 성적서 - OEKO-TEX 인증서 첨부."],
    ("BATTERY", "DOC_TECH_FILE"): [
        "1. 제품 일반 설명 - 리튬이온 배터리 모듈, 정격 사양 및 사용 조건.",
        "2. 설계·제조 도면 - 조립도(DWG)/부품표(BOM) 첨부.",
        "3. 적용 요구사항 - (EU) 2023/1542 Battery Reg., 2011/65/EU RoHS.",
        "4. 적용 조화표준 목록 - EN IEC 62133-2, EN IEC 62619.",
        "5. 시험·검사 성적서 - 공인시험기관 발급 성적서 첨부."],
    ("STEEL", "DOC_SOC_SDS"): [
        "1. 화학제품과 회사에 관한 정보 - 구조용 H형강, 스트럭타스틸㈜ 제조.",
        "2. 유해성·위험성 - 고체 금속, 통상 취급 조건에서 특별한 위험성 없음.",
        "3. 구성성분의 명칭 및 함유량 - Fe(잔부), C/Si/Mn/P/S/Cu 등 합금원소.",
        "9. 물리화학적 특성 - 고체, 은회색, 융점 약 1450℃."],
    ("TEXTILE", "DOC_SOC_SDS"): [
        "1. 화학제품과 회사에 관한 정보 - 오가닉 코튼 티셔츠, 퓨어라인텍스타일㈜ 제조.",
        "3. 구성성분의 명칭 및 함유량 - 유기농 면 95%, 재생 면 5%."],
    ("BATTERY", "DOC_SOC_SDS"): [
        "1. 화학제품과 회사에 관한 정보 - 리튬이온 배터리 모듈, 벡터에너지솔루션㈜ 제조.",
        "3. 구성성분의 명칭 및 함유량 - 양극재/음극재/전해액/분리막."],
    ("BATTERY", "DOC_DUE_DILIGENCE_REPORT"): [
        "1. 경영 시스템 구축 - 공급망 실사 정책 채택, 책임자 지정 완료.",
        "2. 위험 식별·평가 - 광산~제련 단계 CAHRA 스크리닝, 공급사 매핑 완료.",
        "3. 위험 대응 전략 - 고위험 공급사 시정계획(CAP) 부과, 모니터링 진행 중.",
        "4. 제3자 감사 - 제련소 대상 독립 감사 수행(RMAP 기준) 완료.",
        "5. 공개 보고 - 연례 실사 보고서 공개 발행 완료."],
    ("STEEL", "DOC_MANUAL"): [
        "취급·보관 시 낙하·충격에 주의하고 지정 하중 이하로만 적재하십시오.",
        "유지보수 및 수리: 수리 매뉴얼은 제조자 포털에서 제공됩니다."],
    ("TEXTILE", "DOC_MANUAL"): [
        "케어라벨 세탁 기호를 따라 취급하십시오.",
        "유지보수: 전문 세탁업체 이용을 권장합니다."],
    ("BATTERY", "DOC_MANUAL"): [
        "과충전·물리적 손상·단락을 피하십시오. 60℃ 이상 고온·직사광선 노출을 피하십시오.",
        "폐기 및 재활용: 폐전지 전용 회수함에 따라 배출하십시오."],
}


def build_plain(path, domain, key):
    """비-ZKP 문서 1건."""
    iss = mock_data.ISSUERS[domain]
    p = PRODUCT_DESC[domain]

    # 원산지증명서만 EUR.1 서식이라 헤더 구조가 완전히 다르다.
    if key == "DOC_COO":
        d = render.Doc(path)
        doc_no = p["eur1"]
        d.line("EUR.1 No " + doc_no, size=11, bold=True, gap=15)
        d.line("MOVEMENT CERTIFICATE", size=13, bold=True, gap=17)
        d.line("1 Exporter " + iss["name_en"], gap=12)
        d.line(iss["address"] + " · EORI " + iss["eori"], gap=12)
        d.line("2 Certificate used in preferential trade: REPUBLIC OF KOREA - EUROPEAN UNION", gap=12)
        d.line("3 Consignee DPP Demo GmbH, Am Sandtorkai 48, 20457 Hamburg, Germany", gap=12)
        d.line("4 Country of origin REPUBLIC OF KOREA (KR)   5 Destination GERMANY (DE)", gap=12)
        d.line(f"8. {iss['product']} {p['kind']} · HS {p['hs']}   HS {p['hs']}", gap=12)
        d.line(f"9. 수량 {p['qty']}   중량 {p['weight']}", gap=12)
        d.line("11 CUSTOMS ENDORSEMENT — Declaration certified", gap=12)
        d.line("12 DECLARATION BY THE EXPORTER — " + mock_data.ISSUE_DATE + ", " + iss["name_ko"], gap=13)
        annex(d, domain, DOC_SECTIONS.get((domain, key), []))
        footer(d, doc_no)
        d.save()
        return

    prefix, title_ko, title_en = PLAIN_DOCS[key]
    suffix = {"STEEL": "STRUCTA", "TEXTILE": "PURELINE", "BATTERY": "VECTOR"}[domain]
    doc_no = f"{prefix}-{suffix}-2026-001"

    d = render.Doc(path)
    header(d, domain, doc_no, title_ko, title_en)
    d.line("대상 제품 " + iss["product"] + " · GTIN " + iss["gtin"], gap=14)

    for line in BODY.get((domain, key), []):
        d.line(line, gap=12)

    if key == "DOC_PCF_REPORT":
        d.line("산정 방법론 " + p["pcf_method"], gap=13)
        d.row([(X_EL, "총 탄소발자국 (PCF)"), (X_VAL, "1420")])
    elif key == "DOC_LCA_EPD":
        d.line("제품범주규칙(PCR) " + p["pcr"], gap=13)
        if domain == "STEEL":
            d.row([(X_EL, "총 탄소발자국 (PCF)"), (X_VAL, "1420")])
        d.row([(X_EL, "재활용 가능성"), (X_VAL, p["recyclability"] + " %")])
    elif key == "DOC_SCRAP_PROOF":
        d.line("EAF(전기로) 투입 스크랩 매입 계량증빙 및 재생원료 함유율 산정 근거 첨부.", gap=13)
        d.row([(X_EL, "재생 스크랩 함유율"), (X_VAL, "28 %")])
    elif key == "DOC_GRS_CERTIFICATE":
        d.line("Certified material composition", gap=12)
        d.line("Recycled Cotton 5% / Recycled Polyamide 15%", gap=12)
        d.line("Total certified net shipping weight", gap=12)
        d.line("180.0 kg", gap=12)
        d.line("Certified weight of product", gap=12)
        d.line("PureLine Cotton Tee - 180.0 kg", gap=13)
    elif key == "DOC_EU_DOC":
        d.line("본 선언은 제조자의 단독 책임 하에 발행됨.", gap=12)
        d.line("적용 지침/규정: " + p["regs"], gap=12)
        if domain == "STEEL":
            d.line("본 선언 대상 제품은 상기 규정의 관련 요구사항에 적합함.", gap=13)
    elif key == "DOC_TEST_REPORT":
        d.line("시험기관 " + p["lab"], gap=12)
        d.line("시험 항목: " + p["test_items"] + " - 전항목 Pass", gap=12)
        d.row([(X_EL, "종합 판정"), (X_VAL, "적합 (PASS)")])
    elif key == "DOC_LABEL":
        d.line("고유제품식별자(UBI) " + p["ubi"], gap=12)
        d.line("데이터 캐리어(Digital Link URL): https://id.dpp.example/01/" + iss["gtin"] + "/21/20260201", gap=13)
    elif key == "DOC_MANUAL":
        d.row([(X_EL, "수리 가능성 등급"), (X_VAL, p["repair"])])

    annex(d, domain, DOC_SECTIONS.get((domain, key), []))
    footer(d, doc_no)
    d.save()


# ══════════════════════════════════════════════════════════════════════════
# PASS / FAIL 변형 정의
# 판정에 쓰이는 수치만 바꾼다. 나머지는 전부 같아야 "무엇 때문에 반려됐는가"가 보인다.
# ══════════════════════════════════════════════════════════════════════════

# 화학성분 기준값 (측정값, 규격 한계). 한계 표기는 문서에서 그대로 읽어 판정에 쓴다.
CHEM_BASE = {
    "C":   ("0.18", "≤0.24"), "Si": ("0.35", "≤0.55"), "Mn": ("1.40", "≤1.60"),
    "P":   ("0.018", "≤0.035"), "S": ("0.012", "≤0.035"), "N": ("0.008", "≤0.012"),
    "Cu":  ("0.22", "≤0.55"), "CEV": ("0.42", "≤0.47"),
}
MECH_BASE = [
    ("항복강도 ReH", "N/mm²", "382", "≥355"),
    ("인장강도 Rm", "N/mm²", "524", "470–630"),
    ("연신율 A", "%", "26", "≥22"),
    ("충격흡수에너지 KV (20℃)", "J", "48", "≥27"),
]


def _chem(**over):
    c = dict(CHEM_BASE)
    for k, v in over.items():
        c[k] = (v, c[k][1])
    return c


def _mech(**over):
    return [(l, u, over.get(l, v), s) for l, u, v, s in MECH_BASE]


FIBERS_BASE = [("메리노 울", "80 %"), ("재생 폴리아미드", "15 %"), ("엘라스테인", "5 %")]
RECYCLED_BASE = {"Co": "18.0%", "Li": "8.0%", "Ni": "9.0%", "Pb": "0%"}
RECOVERY_BASE = [("리튬코발트산화물", "32.0", "29.44", "92.0%"), ("구리", "8.0", "7.84", "98.0%"),
                 ("흑연", "18.0", "16.02", "89.0%"), ("합계", "58.00", "53.30", "91.9%")]


def build_all(out_dir):
    render.register_fonts()
    made = []

    def p(domain, name):
        d = os.path.join(out_dir, domain.lower())
        os.makedirs(d, exist_ok=True)
        made.append(os.path.join(domain.lower(), name))
        return os.path.join(d, name)

    # ── 철강 ────────────────────────────────────────────────────────────
    build_mill_sheet(p("STEEL", "Q2_05_MILL_SHEET_PASS_1.pdf"), CHEM_BASE, MECH_BASE)
    build_mill_sheet(p("STEEL", "Q2_05_MILL_SHEET_PASS_2.pdf"),
                     _chem(C="0.20", Mn="1.52"), _mech(**{"항복강도 ReH": "398", "연신율 A": "24"}),
                     overrides={"CHEM_MN_ACTUAL_PCT": "1.52 %", "YIELD_STRENGTH_ACTUAL_MPA": "398 MPa",
                                "ELONGATION_ACTUAL_PCT": "24 %"})
    # C 0.28 > 한계 0.24 -> SteelMillCheck 부적합
    build_mill_sheet(p("STEEL", "Q2_05_MILL_SHEET_FAIL_1_탄소초과.pdf"), _chem(C="0.28"), MECH_BASE)
    # Rm 655 > 규격 상한 630 -> 부적합
    build_mill_sheet(p("STEEL", "Q2_05_MILL_SHEET_FAIL_2_인장강도초과.pdf"), CHEM_BASE,
                     _mech(**{"인장강도 Rm": "655"}),
                     overrides={"TENSILE_STRENGTH_ACTUAL_MPA": "655 MPa"})

    # CBAM은 de minimis(50t) 초과 여부가 정보성 플래그라 반려 케이스가 없다.
    build_cbam(p("STEEL", "Q2_06_CBAM_REPORT_승인_수입량초과.pdf"), "62.4")
    build_cbam(p("STEEL", "Q2_06_CBAM_REPORT_승인_수입량미만.pdf"), "38.5")

    for key in ["DOC_TECH_FILE", "DOC_PCF_REPORT", "DOC_LCA_EPD", "DOC_SOC_SDS", "DOC_EU_DOC",
                "DOC_TEST_REPORT", "DOC_COO", "DOC_LABEL", "DOC_MANUAL", "DOC_SCRAP_PROOF"]:
        build_plain(p("STEEL", key + ".pdf"), "STEEL", key)

    # ── 섬유 ────────────────────────────────────────────────────────────
    build_care_label(p("TEXTILE", "Q1_04_CARE_LABEL_PASS_1.pdf"), FIBERS_BASE)
    build_care_label(p("TEXTILE", "Q1_04_CARE_LABEL_PASS_2.pdf"),
                     [("유기농 면", "95 %"), ("엘라스테인", "5 %")],
                     overrides={"SHELL_MATERIAL_1_TYPE": "ORGANIC_COTTON",
                                "SHELL_MATERIAL_1_PERCENTAGE_PCT": "95 %",
                                "SHELL_MATERIAL_2_TYPE": "ELASTANE",
                                "SHELL_MATERIAL_2_PERCENTAGE_PCT": "5 %",
                                "SHELL_MATERIAL_3_TYPE": "해당 없음",
                                "SHELL_MATERIAL_3_PERCENTAGE_PCT": "0 %"})
    # 합계 90% -> FiberSumCheck 부적합
    build_care_label(p("TEXTILE", "Q1_04_CARE_LABEL_FAIL_1_합계90.pdf"),
                     [("메리노 울", "70 %"), ("재생 폴리아미드", "15 %"), ("엘라스테인", "5 %")],
                     overrides={"SHELL_MATERIAL_1_PERCENTAGE_PCT": "70 %"})
    # 합계 110% -> 부적합
    build_care_label(p("TEXTILE", "Q1_04_CARE_LABEL_FAIL_2_합계110.pdf"),
                     [("메리노 울", "90 %"), ("재생 폴리아미드", "15 %"), ("엘라스테인", "5 %")],
                     overrides={"SHELL_MATERIAL_1_PERCENTAGE_PCT": "90 %"})

    build_oekotex(p("TEXTILE", "Q3_10_OEKOTEX_LABEL_PASS_1.pdf"), "6.4")
    build_oekotex(p("TEXTILE", "Q3_10_OEKOTEX_LABEL_PASS_2.pdf"), "5.2")
    build_oekotex(p("TEXTILE", "Q3_10_OEKOTEX_LABEL_FAIL_1_pH초과.pdf"), "8.1")   # > 7.5
    build_oekotex(p("TEXTILE", "Q3_10_OEKOTEX_LABEL_FAIL_2_pH미달.pdf"), "3.2")   # < 4.0

    for key in ["DOC_TECH_FILE", "DOC_PCF_REPORT", "DOC_LCA_EPD", "DOC_SOC_SDS", "DOC_EU_DOC",
                "DOC_TEST_REPORT", "DOC_COO", "DOC_LABEL", "DOC_MANUAL", "DOC_GRS_CERTIFICATE"]:
        build_plain(p("TEXTILE", key + ".pdf"), "TEXTILE", key)

    # ── 배터리 ──────────────────────────────────────────────────────────
    build_battery_carbon(p("BATTERY", "Q2_07_BATTERY_CARBON_PASS_1.pdf"), RECYCLED_BASE)
    build_battery_carbon(p("BATTERY", "Q2_07_BATTERY_CARBON_PASS_2.pdf"),
                         {"Co": "22.0%", "Li": "11.0%", "Ni": "14.0%", "Pb": "0%"})
    # Co 12.0% < 16.0% -> BatteryCheck 부적합
    build_battery_carbon(p("BATTERY", "Q2_07_BATTERY_CARBON_FAIL_1_Co미달.pdf"),
                         {"Co": "12.0%", "Li": "8.0%", "Ni": "9.0%", "Pb": "0%"})
    # Pb 40.0% < 85.0% (0%가 아니므로 적용제외가 아니다) -> 부적합
    build_battery_carbon(p("BATTERY", "Q2_07_BATTERY_CARBON_FAIL_2_Pb미달.pdf"),
                         {"Co": "18.0%", "Li": "8.0%", "Ni": "9.0%", "Pb": "40.0%"})

    build_recycling(p("BATTERY", "Q4_15_RECYCLING_REPORT_PASS_1.pdf"), "93.6%", RECOVERY_BASE)
    build_recycling(p("BATTERY", "Q4_15_RECYCLING_REPORT_PASS_2.pdf"), "95.1%",
                    [("리튬코발트산화물", "30.0", "28.50", "95.0%"), ("구리", "9.0", "8.73", "97.0%"),
                     ("합계", "39.00", "37.23", "95.5%")])
    # 리튬코발트산화물 회수율 82.0% < 90.0% -> RecyclingCheck 부적합
    build_recycling(p("BATTERY", "Q4_15_RECYCLING_REPORT_FAIL_1_리튬코발트미달.pdf"), "86.2%",
                    [("리튬코발트산화물", "32.0", "26.24", "82.0%"), ("구리", "8.0", "7.84", "98.0%"),
                     ("흑연", "18.0", "16.02", "89.0%"), ("합계", "58.00", "50.10", "86.4%")])
    # 구리 회수율 71.0% < 90.0% -> 부적합
    build_recycling(p("BATTERY", "Q4_15_RECYCLING_REPORT_FAIL_2_구리미달.pdf"), "88.4%",
                    [("리튬코발트산화물", "30.0", "28.50", "95.0%"), ("구리", "9.0", "6.39", "71.0%"),
                     ("합계", "39.00", "34.89", "89.5%")])

    for key in ["DOC_TECH_FILE", "DOC_PCF_REPORT", "DOC_LCA_EPD", "DOC_SOC_SDS", "DOC_EU_DOC",
                "DOC_TEST_REPORT", "DOC_COO", "DOC_LABEL", "DOC_MANUAL", "DOC_DUE_DILIGENCE_REPORT"]:
        build_plain(p("BATTERY", key + ".pdf"), "BATTERY", key)

    return made


def main():
    ap = argparse.ArgumentParser(description="DPP 목데이터 PDF 생성")
    ap.add_argument("--out", default=os.path.join(REPO, "docker", "mock-documents"))
    args = ap.parse_args()
    made = build_all(args.out)
    print(f"{len(made)}건 생성 -> {args.out}")
    for m in made:
        print("  " + m)


if __name__ == "__main__":
    main()
