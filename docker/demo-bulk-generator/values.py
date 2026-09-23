# -*- coding: utf-8 -*-
"""DPP별 항목 값/자재구성/문서/ZKP/참여 협력사 생성.

규칙
  - 값은 전부 value_text 문자열(백엔드가 읽고 쓰는 유일한 컬럼 - seed-demo-gwacheon-2 주석).
  - 형식은 입력 폼이 저장하는 것과 같게: 숫자는 단위 없는 숫자, BOOLEAN은 'true'/'false',
    CODE는 code_master 코드, DATE는 YYYY-MM-DD, DATETIME은 YYYY-MM-DDTHH:MM.
  - 영업비밀(TRADE_SECRET) 항목은 실측값 대신 판정 토큰 '충족'(V25 원칙) + VERIFIED ZKP 증명.
  - role: 이 값을 제출한 주체 - M(제조사) / S(원자재 공급사) / T(시험기관) / R(재활용업체) / A(시스템 자동)
"""
import datetime
import hashlib
import json
import random

BASE = datetime.datetime(2026, 9, 23, 12, 0)
FIELDS = json.load(open("/home/claude/fields.json"))
ROLE_OF = {"MANUFACTURER": "M", "RAW_SUPPLIER": "S", "TEST_LAB": "T", "RECYCLER": "R", "": "A"}


def at(age_min):
    return BASE - datetime.timedelta(minutes=age_min)


def dstr(age_min):
    return at(age_min).strftime("%Y-%m-%d")


def dtstr(age_min):
    return at(age_min).strftime("%Y-%m-%dT%H:%M")


def f2(x, n=2):
    s = f"{x:.{n}f}"
    return s


def hx(*parts):
    return hashlib.sha256("|".join(str(p) for p in parts).encode()).hexdigest()


# ───────────────────────────── EU 수입자 / 대리인 ─────────────────────────────
IMPORTERS = {
    "STEEL": [("Aciers du Nord SAS", "FR45218830400027", "12 Quai Freycinet, 59140 Dunkerque, FR"),
              ("Métaux Rhône-Alpes SA", "FR71398221700041", "8 Rue de l'Industrie, 69200 Vénissieux, FR"),
              ("Nordwerk GmbH", "DE7412880033100", "Hafenstraße 22, 47119 Duisburg, DE"),
              ("Acciai Padana S.r.l.", "IT03941580987", "Via dell'Industria 44, 25030 Brescia, IT"),
              ("Metaalhandel Benelux B.V.", "NL862104377B01", "Europaweg 150, 3199 LC Rotterdam, NL"),
              ("Stalprofil Import Sp. z o.o.", "PL6342871120000", "ul. Hutnicza 7, 40-241 Katowice, PL")],
    "BATTERY": [("Distri-Batteries France SAS", "FR33851247600019", "27 Avenue de l'Europe, 38100 Grenoble, FR"),
                ("Mobilité Électrique Import SARL", "FR09882310400012", "4 Rue Paul Vaillant-Couturier, 92300 Levallois-Perret, FR"),
                ("E-Mobility Components GmbH", "DE8173320556100", "Otto-Hahn-Straße 9, 70771 Leinfelden-Echterdingen, DE"),
                ("Energia Storage Italia S.p.A.", "IT10233870964", "Via Lorenteggio 257, 20152 Milano, IT"),
                ("VoltTrade Europe B.V.", "NL860223915B01", "Stationsplein 45, 3013 AK Rotterdam, NL")],
    "TEXTILE": [("Textiles Lumière SARL", "FR62794411200031", "15 Rue du Sentier, 75002 Paris, FR"),
                ("Maison Tissage Lyon SAS", "FR18801243700015", "22 Rue Sainte-Catherine, 69001 Lyon, FR"),
                ("Modehaus Import GmbH", "DE5523901477200", "Kaiserstraße 61, 60329 Frankfurt am Main, DE"),
                ("Moda Veneta S.r.l.", "IT04418230267", "Via Terraglio 110, 31022 Preganziol TV, IT"),
                ("Benelux Fashion Distribution B.V.", "NL857330218B01", "Keizersgracht 312, 1016 EX Amsterdam, NL")],
}
EU_REPS = [("EuroCert Compliance B.V.", "Keizersgracht 62, 1015 CS Amsterdam, NL", "eu-rep@eurocert-compliance.eu"),
           ("Compliance Partner Europe GmbH", "Friedrichstraße 88, 10117 Berlin, DE", "contact@cp-europe.de"),
           ("EU-Rep Services SARL", "3 Place de la Défense, 92400 Courbevoie, FR", "rep@eurep-services.fr"),
           ("Delegata Europa S.r.l.", "Corso Vittorio Emanuele II 15, 20122 Milano, IT", "info@delegata-europa.it")]


# ───────────────────────────── 철강 강종 사양 ─────────────────────────────
# 강종: (항복 min, 인장 min, 인장 max, 연신 min, 표점, 화학 대표값 C/Si/Mn/P/S/Cu/Cr/Ni/Mo)
GRADES = {
    "S355JR": (355, 470, 630, 22, 200, (0.18, 0.35, 1.40, 0.018, 0.012, 0.22, 0.06, 0.05, 0.012)),
    "S355J2+N": (355, 470, 630, 22, 200, (0.17, 0.40, 1.45, 0.015, 0.008, 0.18, 0.05, 0.04, 0.010)),
    "SM355A": (355, 490, 610, 21, 200, (0.18, 0.38, 1.42, 0.019, 0.010, 0.20, 0.05, 0.04, 0.010)),
    "SM490A": (325, 490, 610, 22, 200, (0.19, 0.35, 1.38, 0.020, 0.012, 0.21, 0.06, 0.05, 0.012)),
    "S275JR": (275, 410, 560, 23, 200, (0.16, 0.25, 0.95, 0.020, 0.015, 0.25, 0.07, 0.06, 0.010)),
    "SS275": (275, 410, 550, 21, 200, (0.17, 0.22, 0.85, 0.022, 0.016, 0.24, 0.06, 0.05, 0.008)),
    "AH36": (355, 490, 620, 21, 200, (0.16, 0.30, 1.35, 0.016, 0.008, 0.15, 0.05, 0.08, 0.010)),
    "S460NL": (460, 540, 720, 17, 200, (0.16, 0.45, 1.55, 0.014, 0.006, 0.20, 0.18, 0.32, 0.050)),
    "SPHC": (205, 270, 410, 30, 50, (0.07, 0.02, 0.28, 0.015, 0.010, 0.05, 0.03, 0.02, 0.005)),
    "DD11": (170, 290, 440, 28, 80, (0.06, 0.02, 0.30, 0.014, 0.008, 0.05, 0.03, 0.02, 0.005)),
    "SPCC-SD": (175, 270, 410, 34, 50, (0.05, 0.01, 0.22, 0.012, 0.009, 0.04, 0.02, 0.02, 0.004)),
    "DC04": (140, 270, 350, 38, 80, (0.04, 0.01, 0.20, 0.010, 0.008, 0.04, 0.02, 0.02, 0.004)),
    "DC01": (180, 270, 410, 28, 80, (0.06, 0.01, 0.30, 0.014, 0.010, 0.05, 0.03, 0.02, 0.005)),
    "DX51D+Z275": (220, 270, 500, 22, 80, (0.06, 0.02, 0.25, 0.012, 0.008, 0.04, 0.02, 0.02, 0.004)),
    "SGCC": (205, 270, 450, 24, 50, (0.07, 0.02, 0.30, 0.015, 0.010, 0.05, 0.03, 0.02, 0.005)),
    "S350GD+Z275": (350, 420, 560, 16, 80, (0.14, 0.15, 1.10, 0.018, 0.010, 0.08, 0.04, 0.03, 0.006)),
    "SD400": (400, 560, 690, 16, 200, (0.26, 0.28, 1.05, 0.030, 0.025, 0.32, 0.12, 0.09, 0.020)),
    "SD500": (500, 620, 760, 12, 200, (0.28, 0.30, 1.28, 0.028, 0.022, 0.30, 0.14, 0.10, 0.020)),
    "SD600": (600, 710, 850, 10, 200, (0.30, 0.35, 1.40, 0.026, 0.020, 0.28, 0.18, 0.11, 0.025)),
    "B500B": (500, 540, 690, 12, 200, (0.21, 0.25, 0.95, 0.030, 0.025, 0.35, 0.12, 0.10, 0.020)),
    "SCM440": (835, 980, 1180, 12, 50, (0.40, 0.25, 0.75, 0.015, 0.012, 0.12, 1.05, 0.08, 0.200)),
    "S45C": (490, 690, 860, 17, 50, (0.45, 0.25, 0.75, 0.018, 0.015, 0.15, 0.10, 0.06, 0.015)),
    "42CrMo4": (650, 900, 1100, 12, 50, (0.41, 0.28, 0.78, 0.015, 0.012, 0.12, 1.05, 0.08, 0.200)),
    "SWRM8": (240, 330, 440, 30, 200, (0.07, 0.03, 0.40, 0.020, 0.018, 0.10, 0.04, 0.03, 0.005)),
    "SWRCH10A": (250, 340, 450, 30, 200, (0.10, 0.08, 0.40, 0.018, 0.015, 0.08, 0.04, 0.03, 0.005)),
    "SAE1018": (280, 400, 520, 25, 200, (0.18, 0.15, 0.75, 0.018, 0.016, 0.10, 0.05, 0.04, 0.008)),
}
CAS = {"Fe": "7439-89-6", "C": "7440-44-0", "Si": "7440-21-3", "Mn": "7439-96-5", "P": "7723-14-0", "S": "7704-34-9",
       "Cu": "7440-50-8", "Cr": "7440-47-3", "Ni": "7440-02-0", "Mo": "7439-98-7", "Zn": "7440-66-6", "Al": "7429-90-5"}
EL_KO = {"Fe": "철 (Fe, 잔량)", "C": "탄소 (C)", "Si": "규소 (Si)", "Mn": "망간 (Mn)", "P": "인 (P)", "S": "황 (S)", "Cu": "구리 (Cu)",
         "Cr": "크롬 (Cr)", "Ni": "니켈 (Ni)", "Mo": "몰리브덴 (Mo)"}


class Ctx:
    """한 DPP에 대한 생성 컨텍스트."""

    def __init__(self, dpp, org, orgs_by_key, partners, rnd):
        self.d = dpp
        self.m = dpp["model"]
        self.o = org
        self.ob = orgs_by_key
        self.p = partners  # role letter -> org dict
        self.r = rnd
        self.fields = {}
        self.mats = []
        self.docs = []
        self.zkp = []
        self.passport = True

    def put(self, code, val, role=None):
        f = FIELDS.get(code)
        if f is None:
            raise KeyError(code)
        if role is None:
            role = ROLE_OF.get(f["responsible_role"] or "", "M")
        if f["disclosure_scope"] == "TRADE_SECRET":
            val = "충족"
        self.fields[code] = (str(val), role)


def partner_name(ctx, role):
    o = ctx.p.get(role)
    return o["name"] if o else ctx.o["name"]


def common_values(ctx, pcf, pcf_method, scope, recyclability_note, dismantle_url, soc_present=False, svhc_over=False):
    d, m, o, r = ctx.d, ctx.m, ctx.o, ctx.r
    imp = r.choice(IMPORTERS[d["domain"]]) if r.random() < 0.45 else IMPORTERS[d["domain"]][r.randint(0, 1)]
    ctx.importer = imp
    rep = r.choice(EU_REPS)
    ctx.put("MODEL_NAME", m["name"])
    ctx.put("INTERNAL_SKU", m["sku"])
    ctx.put("HS_CODE", m["hs"])
    ctx.put("OPERATOR_MANUFACTURER", o["name"])
    ctx.put("GTIN", m["gtin"])
    ctx.put("UOI_MANUFACTURER", "KR" + o["biz"].replace("-", ""))
    ctx.put("PRODUCTION_DATE", dstr(d["created"] + r.randint(1, 4) * 1440))
    ctx.put("UFI_PLANT", ctx.plant)
    ctx.put("OPERATOR_IMPORTER", json.dumps({"name": imp[0], "eori": imp[1], "address": imp[2]}, ensure_ascii=False))
    ctx.put("OPERATOR_EU_REP", json.dumps({"name": rep[0], "address": rep[1], "email": rep[2]}, ensure_ascii=False))
    ctx.put("ORIGIN_COUNTRY", "KR")
    ctx.put("PCF_VALUE", pcf)
    ctx.put("PCF_METHOD", pcf_method)
    ctx.put("PCF_SCOPE_BREAKDOWN", json.dumps(scope))
    ctx.put("DISMANTLING_INFO", dismantle_url)
    ctx.put("RECYCLABILITY_NOTE", recyclability_note)
    ctx.put("SOC_PRESENT", "true" if soc_present else "false")
    ctx.put("SVHC_OVER_THRESHOLD", "true" if svhc_over else "false")


def system_values(ctx, officer):
    """is_auto 시스템 항목 - 발급된 DPP에만."""
    d, r = ctx.d, ctx.r
    iss = d["issued"]
    ctx.put("DPP_URI", "http://localhost/p/" + d["uuid"], "A")
    ctx.put("UPI", d["serial"], "A")
    ctx.put("LAST_DATA_UPDATE_TIMESTAMP", dtstr(max(iss - r.randint(0, 2000), 30)), "A")
    ctx.put("DATA_UPDATE_RESPONSIBLE_PERSON_ID", "USR-" + hx(d["uuid"], "usr")[:8].upper(), "A")
    ctx.put("PASSPORT_PRIMARY_LANGUAGE", "ko", "A")
    ctx.put("FINAL_APPROVAL_OFFICER", officer, "A")
    ctx.put("FINAL_APPROVAL_AT", dtstr(iss + r.randint(30, 300)), "A")
    ctx.put("LEDGER_TX_HASH", d["snap_tx"], "A")
    ctx.put("DATA_CARRIER_TYPE", "QR 코드 (GS1 Digital Link)", "A")
    ctx.put("REGISTRY_UID", f"EU-DPP-REG-{at(iss).year}-KR-{int(hx(d['uuid'], 'reg')[:6], 16) % 100000:05d}", "A")
    ctx.put("BACKUP_KEY", "BK-" + hx(d["uuid"], "bk")[:16].upper(), "A")


# ───────────────────────────── 철강 ─────────────────────────────
def steel(ctx):
    d, m, o, r = ctx.d, ctx.m, ctx.o, ctx.r
    g = GRADES[m["grade"]]
    route = o["route"]
    eaf = route == "EAF"
    region = o["region"]
    ctx.plant = f"{o['name'].replace(' 주식회사', '')} {region}{'공장' if eaf else '제철소'}"
    heat = d["heat"]
    ctx.put("CN_CODE_8_DIGIT", m["cn"])
    ctx.put("PRODUCT_FORM", m["form"])
    ctx.put("STEEL_GRADE", m["grade"])
    ctx.put("STEEL_STANDARD", m["std"])
    ctx.put("HEAT_NO", heat)
    cast = f"C{heat[1:]}-{r.randint(1, 6)}"
    ctx.put("CAST_NO", cast)
    line = m["line"]
    size = m["size"]
    # 치수/중량
    if line == "SECTION":
        h, b, tw, tf = [float(x) for x in size.replace("H", "").split("×")]
        length = r.choice([10000, 12000, 12000, 15000])
        dim = {"thickness": tf, "width": b, "height": h, "length": length}
        pcs = r.randint(12, 30)
        net = m["kgm"] * length / 1000 * pcs / 1000
        lot = f"LOT-{heat}-{r.randint(1, 9)}"
    elif line == "PLATE":
        t, w, l = [float(x.replace(",", "").replace("t", "")) for x in size.split("×")]
        dim = {"thickness": t, "width": w, "length": l}
        pcs = r.randint(4, 12)
        net = t * w * l * 7.85e-9 * pcs
        lot = f"PL{heat[1:]}{r.randint(10, 99)}"
    elif line in ("HR_COIL", "CR_COIL", "HDG_COIL"):
        t = float(size.split("×")[0].replace("t", ""))
        w = float(size.split("×")[1].split()[0].replace(",", ""))
        net = r.uniform(14, 26)
        length = round(net * 1e9 / (t * w * 7.85))
        dim = {"thickness": t, "width": w, "length": length}
        lot = f"{'H' if line == 'HR_COIL' else 'C'}{heat[1:]}{r.randint(100, 999)}"
    elif line in ("REBAR", "BAR"):
        dia = float(size.split("×")[0].replace("D", "").replace("Ø", ""))
        length = float(size.split("×")[1].replace(",", ""))
        dim = {"thickness": dia, "width": dia, "length": length}
        net = r.uniform(2.0, 5.0) if line == "REBAR" else r.uniform(1.5, 4.0)
        lot = f"B{heat[1:]}{r.randint(10, 99)}"
    else:  # WIRE_ROD
        dia = float(size.replace("Ø", "").split()[0])
        dim = {"thickness": dia, "width": dia, "length": 0}
        net = r.uniform(1.8, 2.4)
        dim["length"] = round(net * 1e6 / (3.1416 * (dia / 2) ** 2 * 7.85e-3))
        lot = f"W{heat[1:]}{r.randint(100, 999)}"
    ctx.put("LOT_NO", lot)
    ctx.put("DIMENSION", json.dumps(dim))
    ctx.put("NET_WEIGHT_T", f2(net, 1 if net > 10 else 2))
    ctx.lot = lot
    ctx.net = net
    # 운영자/설비
    ctx.put("MANUFACTURER_COUNTRY", "KR")
    ctx.put("MANUFACTURER_BUSINESS_REG_NUMBER", o["biz"])
    ctx.put("PRODUCTION_FACILITY_COUNTRY", "KR")
    ctx.put("PRODUCTION_FACILITY_ADDRESS", o["addr1"])
    ctx.put("FACILITY_GPS_LATITUDE", f"{o['lat']:.4f}")
    ctx.put("FACILITY_GPS_LONGITUDE", f"{o['lon']:.4f}")
    fur = (f"{ctx.abbr}-EAF-{r.randint(1, 3)}" if eaf else f"{ctx.abbr}-BF-{r.randint(1, 4):02d}")
    ctx.put("FURNACE_ID", fur)
    ctx.put("CBAM_OPERATOR_NAME", o["name"])
    ctx.put("CBAM_INSTALLATION_ID", ctx.cbam_inst)
    # 공정
    ctx.put("MAIN_PRODUCTION_ROUTE", route)
    ctx.put("IRONMAKING_PROCESS", "NONE" if eaf else "BLAST_FURNACE")
    ctx.put("STEELMAKING_PROCESS", "EAF" if eaf else "BOF")
    ctx.put("SURFACE_TREATMENT_TYPE", "HDG" if line == "HDG_COIL" else ("NONE" if line != "SECTION" or r.random() < 0.8 else "PAINTED"))
    # 자원/순환
    tot = r.uniform(86, 97) if eaf else r.uniform(12, 24)
    pre = tot * r.uniform(0.18, 0.35)
    ctx.put("TOTAL_SCRAP_INPUT_RATIO_PCT", f2(tot, 1))
    ctx.put("PRE_CONSUMER_SCRAP_RATIO_PCT", f2(pre, 1))
    rec = tot * r.uniform(0.9, 1.0)
    ctx.recycled = rec
    sp = ctx.p.get("S")
    ctx.put("RECYCLED_SCRAP_RATE", f2(rec, 1), "S")
    scrap_co = [k for k in ("steel-gyeongin", "steel-nambu", "steel-yeongnam") if k in ctx.ob]
    sp = ctx.ob[scrap_co[int(hx(m["sku"])[:4], 16) % len(scrap_co)]] if sp is None or sp.get("desc") != "철스크랩" else sp
    ctx.put("SCRAP_SOURCE", f"{sp['name']} 매입 국내 철스크랩({r.choice(['H1', 'H2', 'HS', '생철'])} 등급) 및 {ctx.plant} 공정 반환 스크랩", "S")
    # 탄소
    if eaf:
        direct, indirect = r.uniform(0.09, 0.16), r.uniform(0.26, 0.42)
    else:
        direct, indirect = r.uniform(1.62, 1.98), r.uniform(0.1, 0.18)
    s3 = r.uniform(0.04, 0.12)
    ctx.put("CBAM_DIRECT_EMISSIONS_TCO2E_PER_T", f2(direct, 3))
    ctx.put("CBAM_INDIRECT_EMISSIONS_TCO2E_PER_T", f2(indirect, 3))
    act = r.uniform(82, 100)
    ctx.put("CBAM_ACTUAL_DATA_USED_RATIO_PCT", f2(act, 1))
    ctx.put("CBAM_DEFAULT_VALUE_USED_RATIO_PCT", f2(100 - act, 1))
    for c in ("ELECTRICITY_EMISSION_FACTOR_TCO2E_PER_MWH", "ELECTRICITY_SOURCE", "PRECURSOR_1_NAME", "PRECURSOR_1_QUANTITY_T_PER_T",
              "PRECURSOR_1_SPECIFIC_EMISSIONS", "PRECURSOR_2_NAME", "PRECURSOR_2_QUANTITY_T_PER_T", "PRECURSOR_2_SPECIFIC_EMISSIONS",
              "PRECURSOR_3_NAME", "PRECURSOR_3_QUANTITY_T_PER_T", "PRECURSOR_3_SPECIFIC_EMISSIONS"):
        ctx.put(c, "충족")
    ktco2 = r.randint(8600, 10400)
    free = r.uniform(90, 97)
    ctx.put("CARBON_PRICE_PAID_IN_ORIGIN_COUNTRY", str(round(ktco2 * (direct + indirect) * (100 - free) / 100)))
    ctx.put("CARBON_PRICE_CURRENCY", "KRW")
    ctx.put("CARBON_PRICE_REBATE_OR_FREE_ALLOCATION_PCT", f2(free, 1))
    ctx.put("CBAM_EMISSIONS_VERIFIED_BY_THIRD_PARTY", "true")
    ctx.put("CBAM_VERIFICATION_BODY_NAME", partner_name(ctx, "T"))
    ctx.put("CBAM_VERIFICATION_REPORT_URL", f"https://{ctx.p['T']['email_domain'] if ctx.p.get('T') else o['email_domain']}/cbam/{at(d['created']).year}Q{(at(d['created']).month - 1) // 3 + 1}/{ctx.abbr}-{heat}.pdf")
    ctx.put("CBAM_APPLICABLE", "true")
    pcf = (direct + indirect + s3) * 1000
    common_values(ctx, f2(pcf, 0), "EN 19694-2:2016 / ISO 14067:2018 (cradle-to-gate, 1 t 강재)",
                  {"scope1": round(direct, 3), "scope2": round(indirect, 3), "scope3": round(s3, 3)},
                  "해체 후 전량 고철로 분리배출·재용해 가능 (철스크랩 " + r.choice(["H1", "H2", "HS"]) + " 등급)",
                  f"https://www.{o['email_domain']}/dpp/eol/{m['grade'].replace('+', '').lower()}")
    # 화학
    ctx.put("CHEMICAL_ANALYSIS_TYPE", "LADLE" if r.random() < 0.8 else "PRODUCT")
    ctx.put("CHEMICAL_TEST_STANDARD", r.choice(["ASTM E415-21 (발광분광분석)", "KS D 1652:2022 (발광분광분석)", "ISO 15350:2000 (C·S 연소적외선법)"]))
    for c in ("CHEM_MN_ACTUAL_PCT", "CHEM_CR_ACTUAL_PCT", "CHEM_NI_ACTUAL_PCT", "CHEM_MO_ACTUAL_PCT", "CHEM_ZR_ACTUAL_PCT", "CHEM_CE_ACTUAL_PCT",
              "CHEM_W_ACTUAL_PCT", "CHEM_CO_ACTUAL_PCT", "CHEM_SB_ACTUAL_PCT", "CHEM_ZN_ACTUAL_PCT"):
        ctx.put(c, "충족")
    chem = g[5]
    els = ["C", "Si", "Mn", "P", "S", "Cu", "Cr", "Ni", "Mo"]
    rows = []
    tot_el = 0
    for el, v in zip(els, chem):
        v = v * r.uniform(0.9, 1.1)
        rows.append((el, round(v, 4)))
        tot_el += v
    rows.insert(0, ("Fe", round(100 - tot_el, 4)))
    ctx.chem = rows
    for el, v in rows:
        ctx.mats.append(("CHEM_ELEMENT", EL_KO[el], CAS[el], v, "PERCENT", False, False, None, None))
    # 기계적 성질
    ys = g[0] * r.uniform(1.04, 1.18)
    ts = max(g[1] * r.uniform(1.03, 1.12), ys * 1.12)
    ts = min(ts, g[2] * 0.97)
    el_ = g[3] * r.uniform(1.05, 1.3)
    ctx.mech = (round(ys), round(ts), round(el_))
    ctx.put("TENSILE_TEST_STANDARD", r.choice(["ISO 6892-1:2019 Method B", "KS B 0802:2022", "ASTM A370-24"]))
    ctx.put("TEST_DIRECTION", "L" if line in ("REBAR", "BAR", "WIRE_ROD", "SECTION") else r.choice(["L", "T"]))
    ctx.put("YIELD_STRENGTH_ACTUAL_MPA", str(round(ys)))
    ctx.put("YIELD_STRENGTH_MIN_MPA", str(g[0]))
    ctx.put("TENSILE_STRENGTH_ACTUAL_MPA", str(round(ts)))
    ctx.put("TENSILE_STRENGTH_MIN_MPA", str(g[1]))
    ctx.put("TENSILE_STRENGTH_MAX_MPA", str(g[2]))
    ctx.put("ELONGATION_ACTUAL_PCT", str(round(el_)))
    ctx.put("ELONGATION_MIN_PCT", str(g[3]))
    ctx.put("GAUGE_LENGTH_MM", str(g[4]))
    # 문서 관련 / 교역
    mtc = "EN10204_3_2" if r.random() < 0.2 else "EN10204_3_1"
    ctx.put("MILL_TEST_CERTIFICATE_TYPE", mtc)
    ctx.put("MILL_TEST_CERTIFICATE_DOCUMENT_URL", f"https://www.{o['email_domain']}/docs/mtc/MTC-{ctx.abbr}-{heat}.pdf")
    ctx.put("CERTIFICATE_OF_ORIGIN_URL", f"https://cert.korcham.example.kr/coo/{at(d['created']).year}/KR-C-{heat}.pdf")
    ctx.put("IMPORTER_COMPANY_NAME", ctx.importer[0])
    ctx.put("IMPORTER_EORI_NUMBER", ctx.importer[1])
    # 유해물질 (원자재 공급사 제출)
    ctx.put("SVHC_PRESENCE_IN_COATING", "false", "S")
    ctx.put("SVHC_SUBSTANCE_NAME", "해당 없음", "S")
    ctx.put("SVHC_CAS_NUMBER", "해당 없음", "S")
    ctx.put("SVHC_CONCENTRATION_PCT", "0", "S")
    ctx.put("ROHS_COMPLIANT_STATUS", "true", "S")
    ctx.put("HEXAVALENT_CHROMIUM_CR6_PRESENCE", "false", "S")
    # 문서
    ctx.docs = [("MILL_SHEET", "M"), ("SCRAP_PROOF", "S"), ("CBAM_REPORT", "M"), ("TECH_FILE", "M"), ("PCF_REPORT", "T"),
                ("LCA_EPD", "T"), ("SOC_SDS", "S"), ("EU_DOC", "M"), ("TEST_REPORT", "T"), ("COO", "M"), ("LABEL", "M"), ("MANUAL", "M")]
    ctx.zkp = [("MILL_SHEET", "CERT_VALID", "steel-mill-check",
                {"limits": {"C": 0.24, "Mn": 1.60, "P": 0.035, "S": 0.035, "ReH_min": g[0], "Rm_min": g[1], "Rm_max": g[2], "A_min": g[3]},
                 "verdicts": {"chemistry": True, "yield": True, "tensile": True, "elongation": True}}),
               ("CBAM_REPORT", "CUSTOMS_FIT", "cbam-check", {"deMinimisT": 50.0, "overDeMinimis": ctx.net > 50 or True, "verdict": True})]
    ctx.label_lines = [f"Heat {heat} · {f2(net, 1)} t", m["std"]]
    ctx.label_product = f"{m['grade']} {m['kind']} {m['size']}"


# ───────────────────────────── 배터리 ─────────────────────────────
CHEM = {
    "NMC": dict(cath="Li(NiMnCo)O2", cdet=["NMC811 (Ni 80 / Mn 10 / Co 10)", "NMC622 (Ni 60 / Mn 20 / Co 20)", "NMC9½½ (Ni 90 / Mn 5 / Co 5)"],
                an="Graphite", adet=["천연흑연 70 / 인조흑연 25 / SiOx 5", "인조흑연 85 / 천연흑연 12 / SiOx 3"],
                v=(3.65, 4.2, 2.8), ah_per_kg=None, co=0.045, ni=0.22, mn=0.03, li=0.022, gr=0.14, cu=0.1, al=0.14, fe=0.05, p=0.0,
                pcf=(62, 88), cycle=(1500, 3000)),
    "NCA": dict(cath="Li(NiCoAl)O2", cdet=["NCA (Ni 88 / Co 9 / Al 3)", "NCA (Ni 91 / Co 6 / Al 3)"], an="Graphite",
                adet=["인조흑연 90 / SiC 10", "천연흑연 60 / 인조흑연 35 / SiOx 5"],
                v=(3.6, 4.2, 2.7), co=0.03, ni=0.25, mn=0.0, li=0.022, gr=0.14, cu=0.11, al=0.15, fe=0.04, p=0.0, pcf=(64, 90), cycle=(1200, 2500)),
    "LFP": dict(cath="LiFePO4", cdet=["LFP (탄소코팅 LiFePO4, D50 1.2 µm)", "LMFP (LiMn0.6Fe0.4PO4)"], an="Graphite",
                adet=["인조흑연 100", "인조흑연 95 / 하드카본 5"],
                v=(3.2, 3.65, 2.5), co=0.0, ni=0.0, mn=0.0, li=0.012, gr=0.13, cu=0.1, al=0.17, fe=0.1, p=0.055, pcf=(48, 68), cycle=(4000, 8000)),
    "LEAD_ACID": dict(cath="PbO2", cdet=["이산화납(PbO2) 양극판, 칼슘-주석 합금 그리드"], an="Pb", adet=["해면상 납(Sponge Pb) 음극판, 탄소 첨가"],
                      v=(2.0, 2.4, 1.75), co=0.0, ni=0.0, mn=0.0, li=0.0, gr=0.0, cu=0.0, al=0.0, fe=0.0, p=0.0, pcf=(18, 26), cycle=(400, 900), pb=0.62),
}


def battery(ctx):
    d, m, o, r = ctx.d, ctx.m, ctx.o, ctx.r
    ch = CHEM[m["chem"]]
    ctx.plant = f"{o['name'].replace(' 주식회사', '')} {o['region']}공장"
    kwh = m["kwh"]
    wh = kwh * 1000
    kg = m["kg"] * r.uniform(0.985, 1.015)
    passport = m["cat"] in ("EV", "LMT") or (m["cat"] == "INDUSTRIAL" and kwh > 2)
    ctx.passport = passport
    cells_series = m["v"] / ch["v"][0]
    vmax = round(cells_series * ch["v"][1], 1)
    vmin = round(cells_series * ch["v"][2], 1)
    uid = f"{ctx.abbr}-{d['serial'].split('-')[-1]}-{hx(d['uuid'], 'ubi')[:6].upper()}"
    # 식별
    ctx.put("BATTERY_CATEGORY", m["cat"])
    ctx.put("RATED_CAPACITY_KWH", f2(kwh, 3 if kwh < 1 else 2))
    ctx.put("BATTERY_UNIQUE_ID", uid)
    ctx.put("BATTERY_MODEL_NO", m["sku"])
    ctx.put("BATCH_OR_LOT_NUMBER", f"LOT-{d['serial'].split('-')[1]}-{r.randint(1, 40):02d}")
    ctx.put("BATTERY_NET_WEIGHT_KG", f2(kg, 3 if kg < 1 else 1))
    ctx.put("MANUFACTURER_REGISTERED_ADDRESS", f"{o['addr1']} ({o['postal']}), 대한민국")
    ctx.put("MANUFACTURER_EMAIL_CONTACT", f"dpp@{o['email_domain']}")
    ctx.put("MANUFACTURER_WEBSITE", o["website"])
    ctx.put("BATTERY_PLANT_ID", ctx.plant)
    ctx.put("MANUFACTURING_FACILITY_LATITUDE", f"{o['lat']:.4f}")
    ctx.put("MANUFACTURING_FACILITY_LONGITUDE", f"{o['lon']:.4f}")
    ctx.put("DATE_OF_PLACING_ON_MARKET", dstr(max(60, d["issued"] - r.randint(1, 5) * 1440)) if d["issued"] else dstr(max(60, d["created"] - 30 * 1440)))
    ctx.put("EU_DECLARATION_OF_CONFORMITY_ID", f"DoC-{ctx.abbr}-{at(d['created']).year}-{m['sku'].split('-', 1)[1]}")
    ctx.put("PHYSICAL_QR_CODE_PLACEMENT_LOCATION", r.choice(["상부 커버 우측 라벨", "측면 명판", "전면 패널 하단", "케이스 상단 라벨"]))
    ctx.put("TARIC_CODE", m["hs"] + ("0000" if m["hs"] == "850760" else "9000"))
    # 조성
    ctx.put("BATTERY_CHEMISTRY", m["chem"])
    ctx.put("NUMBER_OF_CELLS", str(m["cells"]))
    ctx.put("NUMBER_OF_MODULES", str(m["mods"]))
    ctx.put("CATHODE_ACTIVE_MATERIAL_FAMILY", ch["cath"])
    ctx.put("CATHODE_COMPOSITION_DETAILS", r.choice(ch["cdet"]))
    ctx.put("CATHODE_BINDER_MATERIAL", "PVDF" if m["chem"] != "LEAD_ACID" else "해당 없음")
    ctx.put("CATHODE_CONDUCTIVE_ADDITIVE", r.choice(["Carbon black (Super P)", "CNT 0.6 wt% + Super P"]) if m["chem"] != "LEAD_ACID" else "탄소분말")
    ctx.put("ANODE_ACTIVE_MATERIAL_FAMILY", ch["an"])
    ctx.put("ANODE_COMPOSITION_DETAILS", r.choice(ch["adet"]))
    ctx.put("ANODE_BINDER_MATERIAL", "SBR + CMC" if m["chem"] != "LEAD_ACID" else "해당 없음")
    ctx.put("ANODE_CONDUCTIVE_ADDITIVE", r.choice(["Carbon nanotube (0.5 wt%)", "Super P 1.0 wt%"]) if m["chem"] != "LEAD_ACID" else "카본블랙")
    if m["chem"] == "LEAD_ACID":
        ctx.put("ELECTROLYTE_TYPE", "GEL" if r.random() < 0.2 else "LIQUID")
        ctx.put("ELECTROLYTE_SOLVENT", "증류수 (AGM 흡수)")
        ctx.put("ELECTROLYTE_SALT", "황산(H2SO4) 비중 1.28")
        ctx.put("SEPARATOR_MATERIAL", "AGM 흡수성 유리섬유 매트")
    else:
        ctx.put("ELECTROLYTE_TYPE", "LIQUID" if r.random() < 0.9 else "POLYMER")
        ctx.put("ELECTROLYTE_SOLVENT", r.choice(["EC / EMC / DMC (3:5:2)", "EC / DEC / EMC (3:2:5)", "EC / EMC (3:7) + FEC 2%"]))
        ctx.put("ELECTROLYTE_SALT", r.choice(["LiPF6 1.0 M", "LiPF6 1.2 M + LiFSI 0.1 M"]))
        ctx.put("SEPARATOR_MATERIAL", r.choice(["PE 기재 + 세라믹 코팅 (12 µm)", "PE/PP/PE 3층 (16 µm)", "PE 기재 + 알루미나 코팅 (9 µm)"]))
    ctx.put("BATTERY_CASING_MATERIAL_TYPE", m["casing"])
    ctx.put("PACK_ENCLOSURE_PROTECTION_RATING", r.choice(["IP67", "IP67", "IP6K9K"]) if m["cat"] == "EV" else r.choice(["IP54", "IP55", "IP65", "IP20"]))
    # 성능 (여권 대상만 적용되지만 값 자체는 전부 계산해둔다)
    ah = m["ah"]
    cyc = r.randint(*ch["cycle"])
    ir = (m["v"] / ah) * r.uniform(8, 14) if m["chem"] != "LEAD_ACID" else r.uniform(3.5, 5.5)
    perf = {
        "RATED_CAPACITY_AH": f2(ah, 1), "RATED_CAPACITY_MEASUREMENT_METHOD": "IEC 62660-1 0.33C 방전 (25℃)" if m["cat"] == "EV" else "IEC 62620 0.2C 방전 (25℃)",
        "NOMINAL_ENERGY_WH": f2(wh, 0 if wh > 100 else 1), "NOMINAL_VOLTAGE_V": f2(m["v"], 1), "MAXIMUM_VOLTAGE_V": f2(vmax, 1), "MINIMUM_VOLTAGE_V": f2(vmin, 1),
        "MAXIMUM_ALLOWED_DISCHARGE_POWER_W": str(round(wh * r.choice([2, 3, 4]) if m["cat"] == "EV" else wh * r.choice([0.5, 1, 1]))),
        "MAXIMUM_ALLOWED_CHARGE_POWER_W": str(round(wh * r.choice([1, 1.5, 2]) if m["cat"] == "EV" else wh * 0.5)),
        "OPERATING_TEMPERATURE_MAX_C": str(r.choice([55, 60])), "OPERATING_TEMPERATURE_MIN_C": str(r.choice([-20, -30, -10])),
        "STORAGE_TEMPERATURE_MAX_C": str(r.choice([45, 50])), "STORAGE_TEMPERATURE_MIN_C": str(r.choice([-30, -40, -20])),
        "INITIAL_INTERNAL_RESISTANCE_MOHM": f2(ir, 2), "INTERNAL_RESISTANCE_MEASUREMENT_METHOD": "IEC 62660-1 DCIR 10s / 1C",
        "EXPECTED_CYCLE_LIFE_COUNT": str(cyc), "REFERENCE_TEST_CONDITIONS_FOR_CYCLE_LIFE": r.choice(["25℃ · 1C/1C · DoD 80%", "25℃ · 0.5C/0.5C · DoD 100%", "35℃ · 1C/1C · DoD 90%"]),
        "CAPACITY_FADE_THRESHOLD_PCT": "20" if m["cat"] == "EV" else "30",
        "MAXIMUM_CONTINUOUS_DISCHARGE_CURRENT_A": "__CONT__", "MAXIMUM_PULSE_DISCHARGE_CURRENT_A": "__PULSE__",
        "RECOMMENDED_CUT_OFF_VOLTAGE_V": f2(vmin * 1.03, 1), "ENERGY_EFFICIENCY_ROUND_TRIP_PCT": f2(r.uniform(92, 96.5) if m["chem"] != "LEAD_ACID" else r.uniform(78, 85), 1),
        "CALENDAR_LIFE_EXPECTANCY_YEARS": str(r.choice([10, 12, 15]) if m["chem"] == "LFP" else r.choice([8, 10, 12])),
        "VIBRATION_TEST_STANDARD_UN38_3_PASSED": "true", "MECHANICAL_SHOCK_TEST_PASSED": "true",
    }
    cont = int(perf["MAXIMUM_ALLOWED_DISCHARGE_POWER_W"]) / m["v"]
    perf["MAXIMUM_CONTINUOUS_DISCHARGE_CURRENT_A"] = str(round(cont))
    perf["MAXIMUM_PULSE_DISCHARGE_CURRENT_A"] = str(round(cont * r.choice([1.5, 1.8, 2.0])))
    for k, v in perf.items():
        ctx.put(k, v)
    # CRM
    comp = {"co": ch["co"], "li": ch["li"], "ni": ch["ni"], "mn": ch["mn"], "gr": ch["gr"], "pb": ch.get("pb", 0.0)}
    crm = {
        "COBALT": comp["co"], "LITHIUM": comp["li"], "NICKEL": comp["ni"], "MANGANESE": comp["mn"], "NATURAL_GRAPHITE": comp["gr"] * r.uniform(0.3, 0.7), "LEAD": comp["pb"],
    }
    for k, frac in crm.items():
        frac = frac * r.uniform(0.9, 1.1)
        ctx.put(f"CRM_{k}_WEIGHT_KG", f2(kg * frac, 3 if kg * frac < 1 else 2))
        ctx.put(f"CRM_{k}_PERCENTAGE", f2(frac * 100, 1))
    ctx.put("CRM_COPPER_WEIGHT_KG", f2(kg * ch["cu"] * r.uniform(0.9, 1.1), 2))
    ctx.put("CRM_ALUMINUM_WEIGHT_KG", f2(kg * ch["al"] * r.uniform(0.9, 1.1), 2))
    ctx.put("CRM_IRON_WEIGHT_KG", f2(kg * (ch["fe"] + (0.08 if m["casing"] == "STEEL" else 0)) * r.uniform(0.9, 1.1), 2))
    ctx.put("CRM_PHOSPHORUS_WEIGHT_KG", f2(kg * ch["p"] * r.uniform(0.9, 1.1), 3))
    ctx.put("CRM_TANTALUM_WEIGHT_KG", "0.000")
    ctx.put("CRM_SILICON_WEIGHT_KG", f2(kg * r.uniform(0.001, 0.006), 3) if m["chem"] in ("NMC", "NCA") else "0.000")
    # 실사 (여권 대상)
    rmd = ctx.ob.get("battery-rmd")
    ctx.put("SUPPLY_CHAIN_AUDIT_BODY_NAME", rmd["name"] if rmd else "RCS Global Group")
    ctx.put("SUPPLY_CHAIN_AUDIT_DATE", dstr(d["created"] + r.randint(20, 90) * 1440))
    ctx.put("OECD_DUE_DILIGENCE_GUIDANCE_ALIGNED", "true")
    ctx.put("CONFLICT_AFFECTED_HIGH_RISK_AREAS_CAHRA", "false")
    # 유해물질 (원자재 공급사)
    svhc = [("1,2-Dimethoxyethane (EGDME)", "110-71-4", r.uniform(0.01, 0.05), "전해액"),
            ("Lead", "7439-92-1", r.uniform(0.0, 0.01), "납땜부(BMS 기판)"),
            ("Cobalt dichloride", "7646-79-9", r.uniform(0.01, 0.06), "양극 활물질 전구체 잔류")]
    if m["chem"] == "LEAD_ACID":
        svhc = [("Lead", "7439-92-1", 60.0, "극판·단자"), ("Sulphuric acid", "7664-93-9", 18.0, "전해액"), ("Lead oxide", "1317-36-8", 4.5, "양극판 활물질")]
    if m["chem"] == "LFP":
        svhc[2] = ("N,N-dimethylacetamide (DMAC)", "127-19-5", r.uniform(0.001, 0.01), "바인더 용매 잔류")
    ctx.put("SVHC_PRESENT", "true", "S")
    for i, (nm, cas, conc, loc) in enumerate(svhc, 1):
        ctx.put(f"SVHC_SUBSTANCE_NAME_{i}", nm, "S")
        ctx.put(f"SVHC_SUBSTANCE_CAS_NUMBER_{i}", cas, "S")
        ctx.put(f"SVHC_CONCENTRATION_PCT_{i}", f2(conc, 3 if conc < 1 else 1), "S")
        if i <= 2:
            ctx.put(f"SVHC_LOCATION_IN_BATTERY_{i}", loc, "S")
    ctx.put("HAZARDOUS_WASTE_CLASSIFICATION_CODE", "16 06 01*" if m["chem"] == "LEAD_ACID" else "16 06 05", "S")
    ctx.put("INCINERATION_RESTRICTION_NOTICE_URL", f"https://www.{o['email_domain']}/safety/incineration-notice.pdf", "S")
    for nm, cas, conc, loc in svhc:
        ctx.mats.append(("SOC", nm, cas, round(conc, 4), "PERCENT", True, True, None, loc))
    # 순환성 (재활용업체)
    rc = ctx.p.get("R")
    ctx.put("DISMANTLING_MANUAL_URL", f"https://www.{o['email_domain']}/dpp/dismantling/{m['sku'].lower()}.pdf", "R")
    ctx.put("DISMANTLING_STEP_1_DESCRIPTION", "팩 SoC 30% 이하로 방전 후 HV 커넥터 분리 및 절연 캡 장착" if kwh > 1 else "외장 케이스 고정 나사 해체 후 BMS 커넥터 분리", "R")
    ctx.put("DISMANTLING_STEP_2_DESCRIPTION", "상부 커버 볼트(M8) 해체, 실링 제거 후 커버 분리" if kwh > 1 else "셀 홀더에서 셀 어셈블리 분리", "R")
    ctx.put("DISMANTLING_STEP_3_DESCRIPTION", "버스바·센싱 와이어 분리 후 모듈 고정 브래킷 해체" if kwh > 1 else "니켈 스트립 절단 후 셀 개별 분리", "R")
    ctx.put("DISMANTLING_STEP_4_DESCRIPTION", "모듈/셀 단위로 분리해 방전 확인 후 재활용 공정 투입", "R")
    ctx.put("REQUIRED_TOOLS_FOR_DISMANTLING", "절연 공구 세트(1000V), 토크렌치, 절연저항계, 방전 부하기", "R")
    ctx.put("SAFETY_MEASURES_DURING_DISMANTLING", "절연 장갑·안면 보호구 착용, 방폭 작업대, 열화상 카메라로 셀 온도 감시", "R")
    ctx.put("RECOMMENDED_FIRE_EXTINGUISHING_AGENT", "다량의 물(냉각) + 리튬전지 전용 소화약제(F-500 계열)" if m["chem"] != "LEAD_ACID" else "ABC 분말 소화기 / CO2", "R")
    ctx.put("DISCHARGE_PROCEDURE_BEFORE_RECYCLING", "전용 방전기로 셀당 2.0 V 이하까지 정전류 방전(염수 침지 방전 금지)", "R")
    ctx.put("TOXIC_GAS_RELEASE_RISK_ASSESSMENT_URL", f"https://www.{o['email_domain']}/safety/hf-risk-{m['sku'].lower()}.pdf", "R")
    ctx.put("DISMANTLING_INFO", f"https://www.{o['email_domain']}/dpp/eol/{m['sku'].lower()}", "R")
    # 재생원료 함유율 (시험기관)
    if m["chem"] == "LEAD_ACID":
        rco, rli, rni, rpb = 0.0, 0.0, 0.0, r.uniform(85, 92)
    else:
        rco = r.uniform(16.5, 24) if ch["co"] > 0 else 0.0
        rli = r.uniform(6.2, 11)
        rni = r.uniform(6.5, 13) if ch["ni"] > 0 else 0.0
        rpb = 0.0
    ctx.put("RECYCLED_COBALT_RATE", f2(rco, 1))
    ctx.put("RECYCLED_LITHIUM_RATE", f2(rli, 1))
    ctx.put("RECYCLED_NICKEL_RATE", f2(rni, 1))
    ctx.put("RECYCLED_LEAD_RATE", f2(rpb, 1))
    ctx.put("BATTERY_CARBON_DECLARATION_REQUIRED", "true" if passport else "false")
    ctx.put("SHARE_OF_RENEWABLE_ENERGY_USED_PCT", f2(r.uniform(18, 62), 1))
    ctx.put("BATTERY_PACKAGING_RECYCLABLE_PCT", f2(r.uniform(82, 98), 1))
    # 문서형 URL/기타
    ctx.put("TEST_REPORT_UN38_3_TRANSPORTATION", f"https://{ctx.p['T']['email_domain'] if ctx.p.get('T') else o['email_domain']}/reports/un383/{m['sku']}.pdf")
    ctx.put("MANUFACTURER_WARRANTY_PERIOD_MONTHS", str(r.choice([96, 120]) if m["cat"] == "EV" else r.choice([24, 36, 60, 120])))
    ctx.put("NATIONAL_COMPETENT_AUTHORITY_REGISTRY_ID", f"FR-EPR-BAT-{int(hx(o['key'])[:6], 16) % 900000 + 100000}")
    pcf_kwh = r.uniform(*ch["pcf"])
    pcf = pcf_kwh
    s1, s2 = pcf * r.uniform(0.08, 0.14), pcf * r.uniform(0.18, 0.3)
    common_values(ctx, f2(pcf_kwh, 1), "EU 2023/1542 부속서 II / ISO 14067 (기능단위: 수명기간 총 공급에너지 1 kWh)",
                  {"scope1": round(s1, 1), "scope2": round(s2, 1), "scope3": round(pcf - s1 - s2, 1), "functionalUnit": "kgCO2e/kWh"},
                  "사용 후 판매점·지자체 폐전지 수거함 또는 제조사 회수 프로그램으로 반납 (일반쓰레기 배출 금지)",
                  f"https://www.{o['email_domain']}/dpp/eol/{m['sku'].lower()}",
                  soc_present=True, svhc_over=m["chem"] == "LEAD_ACID")
    # 문서
    docs = [("TECH_FILE", "M"), ("PCF_REPORT", "T"), ("LCA_EPD", "T"), ("SOC_SDS", "S"), ("EU_DOC", "M"), ("TEST_REPORT", "T"),
            ("COO", "M"), ("LABEL", "M"), ("MANUAL", "M")]
    if passport:
        docs += [("BATTERY_CARBON_REPORT", "T"), ("DUE_DILIGENCE_REPORT", "S")]
        ctx.zkp.append(("BATTERY_CARBON_REPORT", "RECYCLED_RATE", "battery-check",
                        {"limits": {"Co": 16.0, "Li": 6.0, "Ni": 6.0, "Pb": 85.0}, "verdicts": {"Co": True, "Li": True, "Ni": True, "Pb": True}}))
    ctx.docs = docs
    ctx.uid = uid
    ctx.label_product = f"{m['sfx']} {m['kind']}"
    ctx.label_lines = [f"{m['chem']} · {f2(kwh, 1 if kwh >= 1 else 3)} kWh · {f2(m['v'], 1)} V", f"UBI {uid}"]
    ctx.kwh = kwh


def battery_system(ctx, officer):
    """배터리 전용 자동/시스템/승인/BMS 항목 - 발급된 여권 대상에."""
    d, m, r = ctx.d, ctx.m, ctx.r
    iss = d["issued"]
    ctx.put("BATTERY_STATUS", "ORIGINAL" if d["status"] != "EOL" else "WASTE", "A")
    ctx.put("REACH_CANDIDATE_LIST_UPDATE_VERSION", "2026-06 (247 substances)", "A")
    ctx.put("REACH_ARTICLE_33_COMMUNICATION_CHECK", "true", "A")
    ctx.put("DIGITAL_LINK_URI_SYNTAX_STANDARD", "GS1 Digital Link 1.4 / ISO/IEC 18975", "A")
    ctx.put("DATA_MODEL_SCHEMA_REVISION_NUMBER", "BatteryPass-DataModel v1.2.0", "A")
    ctx.put("PASSPORT_ISSUANCE_TIMESTAMP", dtstr(iss), "A")
    if not ctx.passport:
        return
    ctx.put("BLOCKCHAIN_TRACEABILITY_PLATFORM_ID", "ieum-dpp / dppchannel / dpp-ledger-chaincode", "A")
    ctx.put("SUITABILITY_FOR_REPURPOSING", "true" if m["chem"] in ("LFP", "NMC") else "false", "A")
    ctx.put("DATA_SCHEMA_VERSION", "1.2.0", "A")
    ctx.put("LAST_MODIFIED_TIMESTAMP", dtstr(max(iss - r.randint(60, 5000), 20)), "A")
    ctx.put("RESPONSIBLE_DATA_AUDITOR_ID", "AUD-" + hx(d["uuid"], "aud")[:6].upper(), "A")
    ctx.put("API_ACCESS_SECURITY_TOKEN_ID", "tok_" + hx(d["uuid"], "tok")[:20], "A")
    ctx.put("DATA_INTEGRITY_CRYPTOGRAPHIC_SIGNATURE", "ES256:" + hx(d["uuid"], "sig")[:48], "A")
    ctx.put("FINAL_PASSPORT_AUTHORIZATION_SIGNATURE", f"{officer} / ES256:{hx(d['uuid'], 'fps')[:24]}", "A")
    ctx.put("FINAL_AUTHORIZATION_TIMESTAMP", dtstr(iss + r.randint(5, 60)), "A")
    # BMS 동적 데이터 - 사용 단계(9)에 들어간 건만
    if d.get("in_use"):
        days = max(1, (iss - 60) // 1440)
        cyc_per_day = r.uniform(0.4, 1.1)
        cycles = days * cyc_per_day
        soh = 100 - cycles * r.uniform(0.004, 0.009) - r.uniform(0, 0.8)
        ah = m["ah"]
        bms = {
            "STATE_OF_HEALTH_SOH_PCT": f2(soh, 1), "STATE_OF_CHARGE_SOC_PCT": f2(r.uniform(35, 88), 1),
            "TOTAL_ENERGY_THROUGHPUT_KWH": f2(cycles * ctx.kwh * 0.8, 1), "TOTAL_CAPACITY_THROUGHPUT_AH": f2(cycles * ah * 0.8, 0),
            "TIME_SPENT_IN_EXTREME_TEMPERATURE_MINUTES": str(r.randint(0, 240)), "NUMBER_OF_DEEP_DISCHARGE_EVENTS": str(r.randint(0, 3)),
            "NUMBER_OF_OVERCHARGE_EVENTS": str(r.randint(0, 1)), "DAYS_IN_OPERATION": str(days), "REMAINING_CAPACITY_AH": f2(ah * soh / 100, 1),
            "EVOLUTION_OF_INTERNAL_RESISTANCE_MOHM": f2(r.uniform(0.02, 0.4), 2), "MAX_RECORDED_CELL_TEMP_C": f2(r.uniform(38, 49), 1),
            "MIN_RECORDED_CELL_TEMP_C": f2(r.uniform(-12, 8), 1), "AVERAGE_OPERATING_TEMP_C": f2(r.uniform(22, 31), 1),
            "INTERNAL_SHORT_CIRCUIT_EVENTS": "0", "THERMAL_RUNAWAY_WARNING_COUNT": "0",
            "FAST_CHARGING_SESSION_COUNT": str(round(cycles * r.uniform(0.1, 0.35))), "TOTAL_OPERATING_HOURS": str(round(days * r.uniform(2, 9))),
            "TOTAL_ACTIVE_CHARGING_HOURS": str(round(days * r.uniform(1, 4))), "AC_IMPEDANCE_AT_1KHZ_MOHM": f2(r.uniform(0.3, 1.8), 2),
        }
        for k, v in bms.items():
            ctx.put(k, v, "A")


def battery_eol(ctx):
    """수명종료(EOL) 배터리 - 재활용 처리 결과(12단계)."""
    r = ctx.r
    ctx.put("RECYCLED_COPPER_RECOVERY_RATE", f2(r.uniform(92, 98), 1), "R")
    ctx.put("RECYCLED_LITHIUM_RECOVERY_RATE", f2(r.uniform(81, 90), 1), "R")
    ctx.put("RECYCLED_COBALT_RECOVERY_RATE", f2(r.uniform(92, 97), 1) if ctx.m["chem"] in ("NMC", "NCA") else "0.0", "R")
    ctx.put("OVERALL_RECYCLING_EFFICIENCY", f2(r.uniform(68, 78) if ctx.m["chem"] != "LEAD_ACID" else r.uniform(80, 88), 1), "R")
    ctx.docs.append(("RECYCLING_REPORT", "R"))
    ctx.zkp.append(("RECYCLING_REPORT", "RECYCLED_RATE", "recycling-check",
                    {"limits": {"overall": 65.0, "Co": 90.0, "Cu": 90.0, "Li": 80.0}, "verdicts": {"overall": True, "materials": True}}))


# ───────────────────────────── 섬유 ─────────────────────────────
FIBER_KO = {"COTTON": "면", "ORGANIC_COTTON": "유기농 면", "POLYESTER": "폴리에스터", "RECYCLED_POLYESTER": "재생 폴리에스터", "NYLON": "나일론",
            "WOOL": "울", "VISCOSE": "비스코스", "LYOCELL": "리오셀", "ELASTANE": "엘라스테인", "ACRYLIC": "아크릴", "LINEN": "린넨", "SILK": "실크", "DOWN": "다운(우모)"}
FIBER_PCF = {"COTTON": 8.3, "ORGANIC_COTTON": 5.1, "POLYESTER": 9.5, "RECYCLED_POLYESTER": 4.4, "NYLON": 11.2, "WOOL": 22.0, "VISCOSE": 6.1,
             "LYOCELL": 4.3, "ELASTANE": 15.0, "ACRYLIC": 11.0, "LINEN": 3.8, "SILK": 25.0, "DOWN": 3.0}
GARMENT_WEIGHT = {"TSHIRT": 0.18, "SWEATSHIRT": 0.52, "SWEATER": 0.42, "DENIM": 0.62, "JACKET": 0.55, "FLEECE": 0.48, "SHIRT": 0.24, "TOWEL": 0.45}


def textile(ctx):
    d, m, o, r = ctx.d, ctx.m, ctx.o, ctx.r
    ctx.plant = f"{o['name'].replace(' 주식회사', '')} {o['region']}{'봉제공장' if m['garment'] else '공장'}"
    comp = m["comp"]
    lot = d["serial"].split("-", 2)[-1]
    line = m["line"]
    ctx.put("FABRIC_LOT_NO", f"LOT-{lot}")
    ctx.put("FABRIC_TYPE", m["ftype"])
    ctx.put("PRODUCT_SUB_CATEGORY", m["sub"])
    if m["garment"]:
        pcs = r.choice([200, 300, 480, 600, 1000, 1200])
        unit_kg = GARMENT_WEIGHT[line] * r.uniform(0.95, 1.05)
        net = unit_kg * pcs
        ctx.qty = f"{pcs} EA"
    elif line == "YARN":
        net = r.uniform(900, 2400)
        ctx.qty = f"{round(net / 1.89)} 콘"
    else:
        rolls = r.randint(8, 30)
        meters = rolls * r.choice([50, 60, 80, 100])
        net = meters * 1.47 * (m["gsm"] or 150) / 1000
        ctx.qty = f"{rolls} 롤 / {meters:,} m"
    ctx.net = net
    ctx.put("NET_WEIGHT_KG", f2(net, 1))
    ctx.put("BRAND_CONTACT_EMAIL", f"cs@{o['email_domain']}")
    # 소재
    shell_name = {"TSHIRT": "몸판 (Body)", "SWEATSHIRT": "몸판 (Body)", "SWEATER": "몸판 니트 (Body Knit)", "DENIM": "겉감 데님 (Shell)",
                  "JACKET": "겉감 (Outer Shell)", "FLEECE": "겉감 플리스 (Shell)", "SHIRT": "몸판 (Body)", "TOWEL": "파일 (Pile)"}.get(line, "원단 (Fabric)")
    ctx.put("SHELL_COMPONENT_NAME", shell_name if m["garment"] else ("원사 (Yarn)" if line == "YARN" else "원단 (Fabric)"))
    for i in range(3):
        if i < len(comp):
            ctx.put(f"SHELL_MATERIAL_{i + 1}_TYPE", comp[i][0])
            ctx.put(f"SHELL_MATERIAL_{i + 1}_PERCENTAGE_PCT", str(comp[i][1]))
    lined = line in ("JACKET", "DENIM")
    if lined:
        ctx.put("LINING_COMPONENT_NAME", "안감 (Lining)" if line == "JACKET" else "주머니감 (Pocketing)")
        ctx.put("LINING_MATERIAL_1_TYPE", "RECYCLED_POLYESTER" if line == "JACKET" else "POLYESTER")
        ctx.put("LINING_MATERIAL_1_PERCENTAGE_PCT", "100" if line == "JACKET" else "65")
        if line != "JACKET":
            ctx.put("LINING_MATERIAL_2_TYPE", "COTTON")
            ctx.put("LINING_MATERIAL_2_PERCENTAGE_PCT", "35")
    else:
        ctx.put("LINING_COMPONENT_NAME", "해당 없음 (안감 미적용)")
    down = line == "JACKET" and "다운" in m["name"]
    if down:
        ctx.put("PADDING_COMPONENT_NAME", "충전재 (Insulation)")
        ctx.put("PADDING_MATERIAL_TYPE", "DOWN")
        ctx.put("PADDING_PERCENTAGE_PCT", "90")
        ctx.put("PADDING_ANIMAL_WELFARE_CERT", "RDS (Responsible Down Standard) CU-" + str(r.randint(800000, 899999)))
    else:
        ctx.put("PADDING_COMPONENT_NAME", "해당 없음 (충전재 미적용)")
    for code, pct in comp:
        rec = pct if code.startswith("RECYCLED") else None
        ctx.mats.append(("MATERIAL", FIBER_KO[code], None, float(pct), "PERCENT", False, False, rec, "겉감"))
    if down:
        ctx.mats.append(("MATERIAL", "다운(우모) 90 / 페더 10", None, 90.0, "PERCENT", False, False, None, "충전재"))
    otx = f"{r.choice(['21', '22', '23'])}.HKR.{r.randint(10000, 99999)}"
    ctx.put("OEKOTEX_CERT_NO", otx)
    ctx.put("DYEING_FACILITY_ID", f"{ctx.p['S']['name'] if ctx.p.get('S') and ctx.p['S']['key'].endswith('daegudye') else o['name'].replace(' 주식회사', '')} 염색가공 {r.randint(1, 3)}라인")
    # 순환
    recycled = sum(p for c, p in comp if c.startswith("RECYCLED"))
    recycled = recycled if recycled else r.choice([0, 0, 5, 8])
    ctx.recycled = recycled
    ctx.put("RECYCLED_FIBER_RATE", str(recycled), "S")
    ctx.put("RECYCLED_FIBER_SOURCE", ("폐PET병 재생 칩(GRS 인증) - " + partner_name(ctx, "S")) if any(c.startswith("RECYCLED") for c, _ in comp)
            else ("봉제 공정 재단 자투리 재생 면 (Pre-consumer)" if recycled else "해당 없음 (버진 섬유 100%)"), "S")
    ctx.put("DECLARATION_OF_CONFORMITY_URL", f"https://www.{o['email_domain']}/dpp/doc/{m['sku'].lower()}.pdf")
    # 유해물질 (원자재 공급사 제출) - 실제 REACH 후보물질, 전부 0.1% 미만
    sv = [("DEHP (Bis(2-ethylhexyl) phthalate)", "117-81-7", "프린트 잉크층"), ("DBP (Dibutyl phthalate)", "84-74-2", "프린트 잉크층"),
          ("Nonylphenol ethoxylates (NPEO)", "9016-45-9", "염색 보조제 잔류"), ("Formaldehyde", "50-00-0", "수지 가공층"),
          ("Boric acid", "10043-35-3", "라벨 접착층"), ("Lead chromate", "7758-97-6", "안료"), ("Cadmium sulphide", "1306-23-6", "안료"),
          ("1,4-Dioxane", "123-91-1", "가공제"), ("Diisohexyl phthalate", "71850-09-4", "가소제"), ("Perfluorohexanoic acid (PFHxA)", "307-24-4", "발수 가공")]
    for i, (nm, cas, loc) in enumerate(sv, 1):
        conc = r.choice([0.0, 0.0, 0.001, 0.002, 0.004, 0.008]) if i <= 5 else 0.0
        if f"SVHC_{i}_SUBSTANCE_NAME" in FIELDS:
            ctx.put(f"SVHC_{i}_SUBSTANCE_NAME", nm, "S")
            ctx.put(f"SVHC_{i}_CAS_NUMBER", cas, "S")
        if f"SVHC_{i}_CONCENTRATION_PCT" in FIELDS:
            ctx.put(f"SVHC_{i}_CONCENTRATION_PCT", f2(conc, 3), "S")
        if f"SVHC_{i}_LOCATION_IN_PRODUCT" in FIELDS:
            ctx.put(f"SVHC_{i}_LOCATION_IN_PRODUCT", loc if conc else "불검출", "S")
        if f"SVHC_{i}_TEST_REPORT_URL" in FIELDS:
            ctx.put(f"SVHC_{i}_TEST_REPORT_URL", f"https://{ctx.p['T']['email_domain'] if ctx.p.get('T') else o['email_domain']}/reports/svhc/{lot}-{i:02d}.pdf", "S")
    ctx.put("DYEING_METHOD", r.choice(["반응성 염료 침염 (저욕비 1:6)", "분산 염료 고온고압 침염", "원착사(Dope dyed) - 염색 공정 없음", "천연 염료 침염"]) if line != "DENIM" else "인디고 로프 염색", "S")
    ctx.put("PFAS_PRESENCE", "false", "S")
    ctx.put("AZO_DYES_PRESENCE", "false", "S")
    ctx.put("PHTHALATES_PRESENCE", "false", "S")
    ctx.put("FORMALDEHYDE_PRESENCE", "false", "S")
    # 포장
    ctx.put("PRIMARY_PACKAGING_TYPE", "POLYBAG" if m["garment"] else ("WRAP" if "ROLL" in line else "BOX"))
    ctx.put("PRIMARY_PACKAGING_MATERIAL_1", "PE" if m["garment"] or "ROLL" in line else "PAPER")
    ctx.put("PRIMARY_PACKAGING_RECYCLED_CONTENT_PCT", str(r.choice([30, 50, 70, 100])))
    ctx.put("PRIMARY_PACKAGING_RECYCLABILITY_PCT", str(r.choice([90, 95, 100])))
    ctx.put("SECONDARY_PACKAGING_TYPE", "BOX" if m["garment"] or line == "YARN" else "PALLET")
    ctx.put("SECONDARY_PACKAGING_MATERIAL_1", "PAPER" if m["garment"] or line == "YARN" else "WOOD")
    ctx.put("SECONDARY_PACKAGING_RECYCLED_CONTENT_PCT", str(r.choice([60, 75, 85])))
    ctx.put("SECONDARY_PACKAGING_RECYCLABILITY_PCT", str(r.choice([95, 100])))
    ctx.put("PACKAGING_HEAVY_METAL_TESTED", "true")
    ctx.put("PACKAGING_LEAD_PB_CONCENTRATION_PPM", str(r.randint(2, 18)))
    ctx.put("PACKAGING_CADMIUM_CD_CONCENTRATION_PPM", str(r.randint(0, 5)))
    ctx.put("TEXTILE_STANDARD", r.choice(["ISO 3758:2023 / EU 1007/2011", "KS K 0210:2021 / EU 1007/2011", "EN 14682 / ISO 3758"]))
    ctx.put("FABRIC_WEIGHT_GSM", str(m["gsm"]) if m["gsm"] else str(r.randint(18, 30)))
    # 탄소
    per_kg = sum(FIBER_PCF[c] * p for c, p in comp) / 100 * r.uniform(0.9, 1.15)
    if m["garment"]:
        pcf = per_kg * GARMENT_WEIGHT[line] + r.uniform(0.6, 1.4)
        fu = "제품 1점"
    else:
        pcf = per_kg
        fu = "1 kg"
    common_values(ctx, f2(pcf, 2), f"ISO 14067:2018 / PEFCR Apparel & Footwear v3.1 (기능단위: {fu}, cradle-to-gate)",
                  {"scope1": round(pcf * 0.12, 2), "scope2": round(pcf * 0.33, 2), "scope3": round(pcf * 0.55, 2)},
                  "라벨의 소재 표기에 따라 의류수거함 배출 · 폴리백은 비닐류로 분리배출" if m["garment"] else "재단 후 남은 원단·지관은 섬유/종이류로 분리배출",
                  f"https://www.{o['email_domain']}/dpp/care-and-recycle/{m['sku'].lower()}")
    ctx.docs = [("CARE_LABEL", "M"), ("OEKOTEX_LABEL", "T"), ("GRS_CERTIFICATE", "S"), ("TECH_FILE", "M"), ("PCF_REPORT", "T"), ("LCA_EPD", "T"),
                ("SOC_SDS", "S"), ("EU_DOC", "M"), ("TEST_REPORT", "T"), ("COO", "M"), ("LABEL", "M"), ("MANUAL", "M")]
    ctx.zkp = [("CARE_LABEL", "CERT_VALID", "fiber-sum-check", {"expectedSum": 100.0, "verdict": True}),
               ("OEKOTEX_LABEL", "CERT_VALID", "oekotex-check", {"phRange": [4.0, 7.5], "verdict": True})]
    ctx.otx = otx
    ctx.label_product = m["name"].split(" ", 1)[1][:22]
    ctx.label_lines = [" / ".join(f"{FIBER_KO[c]} {p}%" for c, p in comp)[:30], f"LOT {lot}"]
