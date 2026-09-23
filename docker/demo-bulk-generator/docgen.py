# -*- coding: utf-8 -*-
"""DPP 증빙 문서 PDF 생성 - (제품 모델 x 문서유형) 1건씩.

발행 주체는 문서 담당 역할에 따라 제조사 또는 그 모델의 협력사(원자재/시험기관/재활용).
본문 + '부속서 A - DPP 데이터 항목'(모델 공통 값만; 히트·로트처럼 건별로 다른 값은 뺀다).
"""
import hashlib
import json
import os

import pdfrender as render
from values import FIELDS, FIBER_KO

CODE_LABEL = {}
for line in open("/home/claude/code_labels.tsv", encoding="utf-8"):
    g, c, n = line.rstrip("\n").split("\t")
    CODE_LABEL[(g, c)] = n

TITLE = {
    "MILL_SHEET": ("제 강 성 적 서 (Mill Test Certificate)", "INSPECTION CERTIFICATE · EN 10204:2004"),
    "SCRAP_PROOF": ("스크랩 매입증빙 · 재생원료 확인서", "SCRAP PURCHASE & RECYCLED CONTENT CERTIFICATE"),
    "CBAM_REPORT": ("CBAM 내재배출량 보고서", "CBAM EMBEDDED EMISSIONS REPORT · Regulation (EU) 2023/956"),
    "TECH_FILE": ("기술문서 (Technical File)", "TECHNICAL DOCUMENTATION · CE / ESPR"),
    "PCF_REPORT": ("제품 탄소발자국(PCF) 산정보고서", "PRODUCT CARBON FOOTPRINT REPORT · ISO 14067"),
    "LCA_EPD": ("환경성적표지 / EPD", "ENVIRONMENTAL PRODUCT DECLARATION · ISO 14025 Type III"),
    "SOC_SDS": ("우려물질 정보 / 물질안전보건자료(SDS)", "SUBSTANCES OF CONCERN / SAFETY DATA SHEET"),
    "EU_DOC": ("EU 적합성선언서 (Declaration of Conformity)", "EU DECLARATION OF CONFORMITY"),
    "TEST_REPORT": ("시험성적서 (Test Report)", "TEST REPORT · EN ISO/IEC 17025 공인시험"),
    "COO": ("원산지증명서 (EUR.1 Movement Certificate)", "EUR.1 MOVEMENT CERTIFICATE · KOREA-EU FTA"),
    "LABEL": ("제품 라벨 · 데이터 캐리어", "DIGITAL PRODUCT PASSPORT LABEL · GS1 Digital Link"),
    "MANUAL": ("사용설명서 · 안전 정보", "USER MANUAL & SAFETY INFORMATION"),
    "CARE_LABEL": ("섬유 케어라벨 · 혼용률 표시", "CARE LABEL · ISO 3758 / Regulation (EU) 1007/2011"),
    "OEKOTEX_LABEL": ("OEKO-TEX® STANDARD 100 시험 인증서", "OEKO-TEX® STANDARD 100 · TEST CERTIFICATE"),
    "GRS_CERTIFICATE": ("GRS 거래증명서 (Transaction Certificate)", "GLOBAL RECYCLED STANDARD · TRANSACTION CERTIFICATE"),
    "BATTERY_CARBON_REPORT": ("배터리 탄소발자국 선언서", "BATTERY CARBON FOOTPRINT DECLARATION · (EU) 2023/1542 Art.7"),
    "DUE_DILIGENCE_REPORT": ("배터리 공급망 실사 보고서", "BATTERY DUE DILIGENCE REPORT · (EU) 2023/1542 Art.48 / OECD"),
    "RECYCLING_REPORT": ("재활용 처리 결과 보고서", "RECYCLING RESULT REPORT · (EU) 2023/1542 Annex XII"),
}
PREFIX = {"MILL_SHEET": "MTC", "SCRAP_PROOF": "SCR", "CBAM_REPORT": "CBAM", "TECH_FILE": "TF", "PCF_REPORT": "PCF", "LCA_EPD": "EPD",
          "SOC_SDS": "SDS", "EU_DOC": "DoC", "TEST_REPORT": "TR", "COO": "EUR1", "LABEL": "LBL", "MANUAL": "UM", "CARE_LABEL": "CARE",
          "OEKOTEX_LABEL": "OTX", "GRS_CERTIFICATE": "GRS-TC", "BATTERY_CARBON_REPORT": "BCF", "DUE_DILIGENCE_REPORT": "DDR", "RECYCLING_REPORT": "REC"}
KO_NAME = {"MILL_SHEET": "제강성적서", "SCRAP_PROOF": "스크랩매입증빙", "CBAM_REPORT": "CBAM보고서", "TECH_FILE": "기술문서", "PCF_REPORT": "탄소발자국보고서",
           "LCA_EPD": "EPD", "SOC_SDS": "SDS", "EU_DOC": "EU적합성선언서", "TEST_REPORT": "시험성적서", "COO": "원산지증명서", "LABEL": "라벨",
           "MANUAL": "사용설명서", "CARE_LABEL": "케어라벨", "OEKOTEX_LABEL": "OEKO-TEX인증서", "GRS_CERTIFICATE": "GRS거래증명서",
           "BATTERY_CARBON_REPORT": "배터리탄소발자국선언서", "DUE_DILIGENCE_REPORT": "공급망실사보고서", "RECYCLING_REPORT": "재활용결과보고서"}
SECTIONS = {
    "MILL_SHEET": ["IDENTIFIER", "SPEC", "MECHANICAL", "PROCESS", "DOCUMENT"], "SCRAP_PROOF": ["CIRCULAR", "RESOURCE"],
    "CBAM_REPORT": ["CARBON", "OPERATOR"], "TECH_FILE": ["IDENTIFIER", "OPERATOR", "PERFORMANCE", "COMPOSITION", "SPEC"],
    "PCF_REPORT": ["CARBON"], "LCA_EPD": ["CARBON", "CIRCULAR"], "SOC_SDS": ["HAZARD", "MATERIAL"], "EU_DOC": ["IDENTIFIER", "OPERATOR"],
    "TEST_REPORT": ["PERFORMANCE", "MECHANICAL", "MATERIAL"], "COO": ["TRADE"], "LABEL": ["IDENTIFIER"], "MANUAL": ["CIRCULAR"],
    "CARE_LABEL": ["IDENTIFIER", "MATERIAL"], "OEKOTEX_LABEL": ["HAZARD", "PACKAGING"], "GRS_CERTIFICATE": ["CIRCULAR"],
    "BATTERY_CARBON_REPORT": ["CARBON", "CRM", "MATERIAL"], "DUE_DILIGENCE_REPORT": ["DUE_DILIGENCE", "CRM"], "RECYCLING_REPORT": ["CIRCULAR"],
}
# 건별로 달라지는 값 - 모델 공통 문서에는 싣지 않는다
PER_ITEM = {"HEAT_NO", "LOT_NO", "CAST_NO", "NET_WEIGHT_T", "NET_WEIGHT_KG", "PRODUCTION_DATE", "BATTERY_UNIQUE_ID", "BATCH_OR_LOT_NUMBER",
            "FABRIC_LOT_NO", "SERIAL_NUMBER", "UPI", "DPP_URI", "DIMENSION", "DATE_OF_PLACING_ON_MARKET", "MILL_TEST_CERTIFICATE_DOCUMENT_URL",
            "CERTIFICATE_OF_ORIGIN_URL", "CBAM_VERIFICATION_REPORT_URL", "SUPPLY_CHAIN_AUDIT_DATE"}


def disp(code, val):
    f = FIELDS[code]
    if val == "충족":
        return "충족 (규격 한계 이내 · 영지식증명 대상)"
    if f["data_type"] == "BOOLEAN":
        return "예" if val == "true" else "아니오"
    if f["code_group"] and (f["code_group"], val) in CODE_LABEL:
        return CODE_LABEL[(f["code_group"], val)]
    if f["data_type"] == "JSON":
        try:
            j = json.loads(val)
            return ", ".join(f"{k} {v}" for k, v in j.items())
        except Exception:
            return val
    u = f["unit"]
    unit = {"PERCENT": "%", "KWH": "kWh", "MM": "mm", "GSM": "g/m²", "KGCO2E_T": ""}.get(u, u or "")
    return f"{val} {unit}".strip()


def issuer_of(role, o, partners):
    return o if role == "M" else partners[role]


def build_one(path, key, ctx, o, partners, doc_no, role):
    sku, t = key
    m = ctx.m
    iss = issuer_of(role, o, partners)
    d = render.Doc(path)
    dt = ctx.doc_date
    d.line(f"{iss['name']}   문서번호 {doc_no}", size=11, bold=True, gap=14)
    d.line(iss["name_en"], size=8.5, color=(0.35, 0.40, 0.48), gap=11)
    d.line(f"{iss['addr1']} {iss['postal']}, {iss['country']}", size=8.5, color=(0.35, 0.40, 0.48), gap=11)
    d.line(f"발행일 {dt}   ·   Tel {iss['phone']}   ·   {iss['email']}", size=8.5, color=(0.35, 0.40, 0.48), gap=11)
    d.line(f"등록번호 {iss['biz']}" + (f" · EORI {iss['eori']}" if iss.get("eori") else ""), size=8.5, color=(0.35, 0.40, 0.48), gap=16)
    d.rule()
    ko, en = TITLE[t]
    d.line(ko, size=15, bold=True, gap=19)
    d.line(en, size=8.5, color=(0.35, 0.40, 0.48), gap=16)
    d.line(f"대상 제품  {m['name']}", gap=13)
    d.line(f"품목코드 {m['sku']}   ·   GTIN {m['gtin']}   ·   HS {m['hs']}", gap=13)
    if role != "M":
        d.line(f"제조사  {o['name']} ({o['name_en']})", gap=13)
    d.space(4)
    F = {c: v for c, (v, r) in ctx.fields.items()}
    body(d, t, ctx, F, o, iss)
    # 부속서
    codes = [c for c in F if FIELDS[c]["section"] in SECTIONS.get(t, []) and c not in PER_ITEM and FIELDS[c]["is_auto"] != "t"]
    if codes:
        d.space(6)
        d.rule()
        d.line("부속서 A — 디지털 제품여권 데이터 항목 (Annex A · DPP Data Attributes)", size=10.5, bold=True, gap=15)
        d.line("ESPR (EU) 2024/1781 및 제품군별 규정에 따른 여권 기재 항목. 동일 모델 전 생산분에 공통 적용.", size=8, color=(0.42, 0.47, 0.55), gap=14)
        for c in codes[:40]:
            v = disp(c, F[c])
            d.line(d.pad(FIELDS[c]["label_ko"], size=9) + ": " + v[:70], size=9, gap=12.2)
    d.space(10)
    d.rule()
    d.line(f"{doc_no} · 본 문서는 발행기관의 전자서명으로 확인됩니다 · SHA-256 해시는 블록체인(dppchannel)에 기록됨",
           size=7.5, color=(0.55, 0.60, 0.68), gap=11)
    d.line(f"서명: {iss['contact']} ({iss['dept']})", size=8, color=(0.35, 0.40, 0.48), gap=11)
    d.save()


def body(d, t, ctx, F, o, iss):
    m = ctx.m
    X = [0, 150, 300]
    if t == "MILL_SHEET":
        d.line(f"강종 {m['grade']}   적용표준 {m['std']}   규격 {m['size']}", gap=13)
        d.line(f"검사증명서 종류 {disp('MILL_TEST_CERTIFICATE_TYPE', F.get('MILL_TEST_CERTIFICATE_TYPE', 'EN10204_3_1'))}", gap=15)
        d.band("화학 성분 (Ladle Analysis, wt%) - 대표 분석값")
        d.row([(X[0], "원소"), (X[1], "측정값"), (X[2], "규격 한계")], bold=True)
        lim = {"C": "≤0.24", "Si": "≤0.55", "Mn": "≤1.60", "P": "≤0.035", "S": "≤0.035", "Cu": "≤0.55", "Cr": "≤0.30", "Ni": "≤0.30", "Mo": "≤0.08"}
        for el, v in ctx.chem[1:]:
            d.row([(X[0], el), (X[1], f"{v:.3f}"), (X[2], lim.get(el, "-"))])
        d.space(6)
        d.band("기계적 성질 (Mechanical Properties)")
        ys, ts, el = ctx.mech
        d.row([(0, "시험 항목"), (170, "단위"), (260, "측정값"), (350, "규격")], bold=True)
        d.row([(0, "항복강도 ReH"), (170, "MPa"), (260, str(ys)), (350, "≥" + F["YIELD_STRENGTH_MIN_MPA"])])
        d.row([(0, "인장강도 Rm"), (170, "MPa"), (260, str(ts)), (350, F["TENSILE_STRENGTH_MIN_MPA"] + "–" + F["TENSILE_STRENGTH_MAX_MPA"])])
        d.row([(0, "연신율 A"), (170, "%"), (260, str(el)), (350, "≥" + F["ELONGATION_MIN_PCT"])])
        d.space(4)
        d.line("판정: 적합 (PASS) - 위 결과는 해당 Heat No.에 대한 실측값이며 제조 부문과 독립된 검사원이 확인함.", gap=13)
    elif t == "SCRAP_PROOF":
        d.line(f"공급처 {iss['name']} → 납품처 {o['name']} {ctx.plant}", gap=13)
        d.line(f"스크랩 등급 H1/H2/HS 혼합 · 계근 증빙 및 방사능 검사 성적 첨부", gap=13)
        d.row([(0, "재생 스크랩 함유율"), (150, F.get("RECYCLED_SCRAP_RATE", "-") + " %")])
        d.row([(0, "총 스크랩 투입비"), (150, F.get("TOTAL_SCRAP_INPUT_RATIO_PCT", "-") + " %")])
    elif t == "CBAM_REPORT":
        d.line(f"설비 {ctx.plant} · 설비등록번호 {ctx.cbam_inst}", gap=13)
        d.line(f"CN 코드 {F.get('CN_CODE_8_DIGIT', '')} · 생산경로 {disp('MAIN_PRODUCTION_ROUTE', F.get('MAIN_PRODUCTION_ROUTE', 'BF_BOF'))}", gap=15)
        d.band("내재 배출량 (Specific Embedded Emissions)")
        d.line(f"직접 배출 (Direct) {F['CBAM_DIRECT_EMISSIONS_TCO2E_PER_T']} tCO2e/t", gap=12)
        d.line(f"간접 배출 (Indirect) {F['CBAM_INDIRECT_EMISSIONS_TCO2E_PER_T']} tCO2e/t", gap=12)
        d.line(f"실측 데이터 비율 {F['CBAM_ACTUAL_DATA_USED_RATIO_PCT']} % · 기본값 비율 {F['CBAM_DEFAULT_VALUE_USED_RATIO_PCT']} %", gap=12)
        d.line(f"원산지국 탄소가격 {F['CARBON_PRICE_PAID_IN_ORIGIN_COUNTRY']} KRW/t (K-ETS, 무상할당 {F['CARBON_PRICE_REBATE_OR_FREE_ALLOCATION_PCT']} %)", gap=12)
        d.line(f"제3자 검증기관 {F.get('CBAM_VERIFICATION_BODY_NAME', '')}", gap=12)
    elif t in ("PCF_REPORT", "BATTERY_CARBON_REPORT", "LCA_EPD"):
        d.line(f"산정 방법론 {F.get('PCF_METHOD', '')}", gap=13)
        d.row([(0, "탄소발자국 (PCF)"), (150, F.get("PCF_VALUE", "-") + (" kgCO2e/kWh" if m["domain"] == "BATTERY" else " kgCO2e/t" if m["domain"] == "STEEL" else " kgCO2e"))])
        try:
            sc = json.loads(F.get("PCF_SCOPE_BREAKDOWN", "{}"))
            d.line(f"Scope 1 {sc.get('scope1')} · Scope 2 {sc.get('scope2')} · Scope 3 {sc.get('scope3')}", gap=13)
        except Exception:
            pass
        if t == "BATTERY_CARBON_REPORT":
            d.band("재생원료 함유율 (Recycled Content)")
            d.row([(0, "Co"), (110, "Li"), (220, "Ni"), (330, "Pb")], bold=True)
            d.row([(0, F["RECYCLED_COBALT_RATE"] + "%"), (110, F["RECYCLED_LITHIUM_RATE"] + "%"), (220, F["RECYCLED_NICKEL_RATE"] + "%"), (330, F["RECYCLED_LEAD_RATE"] + "%")])
            d.line(f"재생에너지 사용 비율 {F.get('SHARE_OF_RENEWABLE_ENERGY_USED_PCT', '-')} %", gap=13)
        if t == "LCA_EPD":
            d.line("제품범주규칙(PCR) 및 독립 제3자 검증 완료 · 유효기간 5년", gap=13)
    elif t == "SOC_SDS":
        d.line("1. 제품 및 회사 정보 - " + m["name"] + " / " + o["name"], gap=12)
        d.line("2. 유해성·위험성 - 통상 취급 조건에서 특별한 위험성 없음(배터리는 단락·과열 주의)", gap=12)
        d.line("3. 구성성분 - 부속서 A 및 우려물질 목록 참조", gap=12)
        d.line("14. 운송 정보 - " + ("UN3480 / 9류 (리튬이온 배터리)" if m["domain"] == "BATTERY" else "비위험물"), gap=12)
    elif t == "EU_DOC":
        regs = {"STEEL": "Regulation (EU) 305/2011 (CPR), EN 1090-1, " + m.get("std", ""),
                "BATTERY": "Regulation (EU) 2023/1542, Directive 2014/30/EU (EMC), 2011/65/EU (RoHS)",
                "TEXTILE": "Regulation (EU) 1007/2011, Regulation (EC) 1907/2006 (REACH)"}[m["domain"]]
        d.line("본 선언은 제조자의 단독 책임 하에 발행됨.", gap=12)
        d.line("적용 규정: " + regs, gap=12)
        d.line("대상 제품은 상기 규정의 관련 필수 요구사항에 적합함.", gap=12)
        d.line(f"서명자 {o['contact']} / {o['dept']}", gap=12)
    elif t == "TEST_REPORT":
        items = {"STEEL": "EN ISO 6892-1 인장시험 / 화학성분 분석", "BATTERY": "IEC 62660-1 성능 / UN 38.3 T1~T8 / IEC 62619",
                 "TEXTILE": "ISO 105 견뢰도 / ISO 1833 혼용률 / pH / 유리 폼알데하이드"}[m["domain"]]
        d.line(f"시험기관 {iss['name']} (KOLAS/DAkkS 인정)", gap=12)
        d.line(f"시험 항목: {items}", gap=12)
        d.row([(0, "종합 판정"), (150, "적합 (PASS)")])
    elif t == "COO":
        d.line(f"1 Exporter {o['name_en']}, {o['addr1']}", gap=12)
        d.line("2 Preferential trade: REPUBLIC OF KOREA - EUROPEAN UNION", gap=12)
        imp = ctx.importer
        d.line(f"3 Consignee {imp[0]}, {imp[2]}", gap=12)
        d.line("4 Country of origin REPUBLIC OF KOREA (KR)", gap=12)
        d.line(f"8 {m['name']} · HS {m['hs']}", gap=12)
        d.line("11 CUSTOMS ENDORSEMENT — Declaration certified", gap=12)
    elif t == "LABEL":
        d.line("데이터 캐리어: QR (GS1 Digital Link) - 제품/포장/라벨 부착", gap=12)
        d.line(f"https://id.gs1.example/01/{m['gtin']}/10/<LOT>/21/<SERIAL>", gap=12)
    elif t == "MANUAL":
        lines = {"STEEL": ["취급·보관 시 낙하·충격 주의, 지정 하중 이하로 적재", "옥외 장기보관 시 방청 커버 사용"],
                 "BATTERY": ["과충전·단락·물리적 손상 금지, 60℃ 이상 고온 노출 금지", "폐기 시 폐전지 전용 회수함 또는 제조사 회수 프로그램 이용"],
                 "TEXTILE": ["케어라벨의 세탁 기호에 따라 취급", "수선 서비스: 제조사 고객센터 접수"]}[m["domain"]]
        for ln in lines:
            d.line(ln, gap=12)
    elif t == "CARE_LABEL":
        d.band("섬유 조성 (Fibre Composition)")
        for c, p in m["comp"]:
            d.row([(0, FIBER_KO[c]), (150, f"{p} %")])
        d.space(4)
        d.line("30℃ 세탁 · 표백 금지 · 건조기 저온 · 중온 다림질", gap=12)
        d.line(f"Made in KR · {m['sku']} · GTIN {m['gtin']}", gap=12)
    elif t == "OEKOTEX_LABEL":
        d.line(f"인증번호 {ctx.otx} · 제품 등급 Class II (피부 직접 접촉)", gap=12)
        d.line(f"인증 보유자 {o['name_en']} · 유효기간 12개월", gap=12)
        d.row([(0, "pH"), (150, "4.0 – 7.5"), (300, "적합")])
        d.line("폼알데하이드 / 아조염료 / 추출성 중금속 / PFAS - 전 항목 적합", gap=12)
    elif t == "GRS_CERTIFICATE":
        d.line(f"판매자 {iss['name_en']} → 구매자 {o['name_en']}", gap=12)
        d.line(f"인증 원료 재생 함유율 {F.get('RECYCLED_FIBER_RATE', '0')} % · 출처: {F.get('RECYCLED_FIBER_SOURCE', '')[:40]}", gap=12)
        d.line("인증기관 Control Union Certifications (가공 표기)", gap=12)
    elif t == "DUE_DILIGENCE_REPORT":
        for ln in ["1. 경영 시스템 - 공급망 실사 정책 채택, 책임자 지정", "2. 위험 식별 - 광산~제련 단계 CAHRA 스크리닝, 공급사 매핑 완료",
                   "3. 위험 대응 - 고위험 공급사 시정계획(CAP) 및 모니터링", "4. 제3자 감사 - RMAP 기준 제련소 감사 완료", "5. 공개 보고 - 연례 실사 보고서 공개"]:
            d.line(ln, gap=12)
    elif t == "RECYCLING_REPORT":
        d.line(f"처리 방법 전처리(방전·파쇄) + 습식제련(Hydrometallurgy)", gap=12)
        d.row([(0, "종합 재활용 효율"), (150, F.get("OVERALL_RECYCLING_EFFICIENCY", "-") + " %")])
        d.band("소재별 회수율")
        for c, nm in (("RECYCLED_COBALT_RECOVERY_RATE", "코발트"), ("RECYCLED_LITHIUM_RECOVERY_RATE", "리튬"), ("RECYCLED_COPPER_RECOVERY_RATE", "구리")):
            d.row([(0, nm), (150, F.get(c, "-") + " %")])
    elif t == "TECH_FILE":
        for ln in ["1. 제품 일반 설명 및 사용 조건", "2. 설계·제조 도면 및 부품표(BOM)", "3. 적용 요구사항 및 위험성 평가",
                   "4. 적용 조화표준 목록", "5. 시험·검사 성적서 및 품질관리 절차"]:
            d.line(ln, gap=12)


def build_all(doc_files, rep_ctx, ob, model_partner, out_dir):
    import datetime
    import random
    render.register_fonts()
    meta = {}
    for (sku, t) in sorted(doc_files):
        ctx = rep_ctx[sku]
        o = ctx.o
        partners = model_partner[sku]
        # 문서 담당 역할
        role = next(r for tt, r in ctx.docs if tt == t) if any(tt == t for tt, r in ctx.docs) else "M"
        rnd = random.Random(sku + t)
        dt = (datetime.date(2026, 9, 23) - datetime.timedelta(days=ctx.d["created"] // 1440 + rnd.randint(5, 40))).isoformat()
        ctx.doc_date = dt
        doc_no = f"{PREFIX[t]}-{ctx.abbr}-{dt[:4]}-{int(hashlib.md5((sku + t).encode()).hexdigest()[:4], 16) % 9000 + 1000}"
        comp = o["key"].split("-", 1)[1]
        rel = f"{comp}/{sku}_{KO_NAME[t]}.pdf"
        path = os.path.join(out_dir, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        build_one(path, (sku, t), ctx, o, partners, doc_no, role)
        data = open(path, "rb").read()
        iss = o if role == "M" else partners[role]
        meta[(sku, t)] = (rel, hashlib.sha256(data).hexdigest(), len(data), iss["name"], doc_no, dt)
    return meta
