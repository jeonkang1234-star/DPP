# -*- coding: utf-8 -*-
"""제조사별 제품 모델(product_model) 정의.

제품군(line) 코드마다 사양 변형을 몇 개씩 만들고, 각 변형이 하나의 product_model 행이 된다.
사진 렌더러도 이 line 코드로 어떤 3D 형상을 그릴지 정한다.
"""
import random

R = random.Random(4242)

# ───────────────────────────── 철강 ─────────────────────────────
STEEL_LINES = {
    "SECTION": dict(form="SECTION", hs="721633", kind="H형강", variants=[
        ("H200×200×8×12", "S355JR", "EN 10025-2:2019", "72163390", 49.9), ("H300×300×10×15", "S355JR", "EN 10025-2:2019", "72163390", 94.0),
        ("H400×200×8×13", "SM355A", "KS D 3515:2023", "72163390", 66.0), ("H588×300×12×20", "S275JR", "EN 10025-2:2019", "72163390", 151.0),
        ("H150×150×7×10", "SS275", "KS D 3503:2022", "72163310", 31.5)]),
    "PLATE": dict(form="PLATE", hs="720851", kind="후판", variants=[
        ("t25×2,438×12,000", "S355J2+N", "EN 10025-2:2019", "72085120", None), ("t40×3,048×10,000", "SM490A", "KS D 3515:2023", "72085120", None),
        ("t16×2,438×9,144", "AH36", "KR 선급규칙 Pt.2", "72085291", None), ("t60×3,200×8,000", "S460NL", "EN 10025-3:2019", "72085120", None)]),
    "HR_COIL": dict(form="HR_COIL", hs="720837", kind="열연코일", variants=[
        ("t3.2×1,219 C", "SPHC", "KS D 3501:2021", "72083900", None), ("t6.0×1,524 C", "S275JR", "EN 10025-2:2019", "72083700", None),
        ("t9.0×1,829 C", "SS275", "KS D 3503:2022", "72083700", None), ("t2.3×1,250 C", "DD11", "EN 10111:2008", "72083900", None)]),
    "CR_COIL": dict(form="CR_COIL", hs="720917", kind="냉연코일", variants=[
        ("t0.8×1,219 C", "SPCC-SD", "KS D 3512:2022", "72091790", None), ("t1.2×1,250 C", "DC04", "EN 10130:2006", "72091690", None),
        ("t0.6×1,000 C", "DC01", "EN 10130:2006", "72091890", None)]),
    "HDG_COIL": dict(form="CR_COIL", hs="721049", kind="용융아연도금강판", variants=[
        ("t0.5×1,219 C Z275", "DX51D+Z275", "EN 10346:2015", "72104900", None), ("t1.0×1,250 C Z180", "SGCC", "KS D 3506:2023", "72104900", None),
        ("t1.6×1,524 C Z275", "S350GD+Z275", "EN 10346:2015", "72104900", None)]),
    "REBAR": dict(form="BAR", hs="721420", kind="철근", variants=[
        ("D13×8,000", "SD400", "KS D 3504:2021", "72142000", None), ("D19×12,000", "SD500", "KS D 3504:2021", "72142000", None),
        ("D25×12,000", "B500B", "EN 10080:2005", "72142000", None), ("D32×10,000", "SD600", "KS D 3504:2021", "72142000", None)]),
    "BAR": dict(form="BAR", hs="722830", kind="특수강 봉강", variants=[
        ("Ø60×6,000", "SCM440", "KS D 3867:2020", "72283069", None), ("Ø100×5,500", "S45C", "KS D 3752:2022", "72149979", None),
        ("Ø36×6,000", "42CrMo4", "EN 10083-3:2006", "72283069", None)]),
    "WIRE_ROD": dict(form="WIRE_ROD", hs="721391", kind="선재", variants=[
        ("Ø5.5 코일", "SWRM8", "KS D 3554:2022", "72139110", None), ("Ø8.0 코일", "SWRCH10A", "KS D 3592:2022", "72139110", None),
        ("Ø12.0 코일", "SAE1018", "ASTM A510-20", "72139190", None)]),
}

# ───────────────────────────── 배터리 ─────────────────────────────
# (모델명 접미, 분류, 화학, 정격용량 kWh, 공칭전압 V, 용량 Ah, 중량 kg, 셀수, 모듈수, 케이싱)
BATTERY_LINES = {
    "EV_PACK": dict(kind="전기차 배터리 팩", hs="850760", variants=[
        ("EP-82", "EV", None, 82.0, 400.0, 205.0, 485.0, 192, 12, "ALUMINIUM"), ("EP-64", "EV", None, 64.0, 355.0, 180.0, 398.0, 96, 8, "ALUMINIUM"),
        ("EP-98 800V", "EV", None, 98.0, 697.0, 141.0, 552.0, 192, 16, "COMPOSITE")]),
    "EV_MODULE": dict(kind="전기차 배터리 모듈", hs="850760", variants=[
        ("EM-12S", "EV", None, 5.3, 44.4, 120.0, 32.0, 12, 1, "ALUMINIUM"), ("EM-24S", "EV", None, 7.1, 88.8, 80.0, 41.5, 24, 1, "ALUMINIUM"),
        ("EM-16S", "EV", None, 4.2, 51.2, 82.0, 27.8, 16, 1, "STEEL")]),
    "PRISMATIC": dict(kind="각형 리튬이온 셀", hs="850760", variants=[
        ("PC-150Ah", "EV", None, 0.555, 3.7, 150.0, 2.45, 1, 0, "ALUMINIUM"), ("PC-120Ah", "EV", None, 0.444, 3.7, 120.0, 2.05, 1, 0, "ALUMINIUM")]),
    "POUCH": dict(kind="파우치형 리튬이온 셀", hs="850760", variants=[
        ("PH-78Ah", "EV", None, 0.285, 3.65, 78.0, 1.08, 1, 0, "COMPOSITE"), ("PH-63Ah", "EV", None, 0.23, 3.65, 63.0, 0.89, 1, 0, "COMPOSITE")]),
    "ESS_RACK": dict(kind="ESS 랙", hs="850760", variants=[
        ("ER-280", "INDUSTRIAL", "LFP", 143.4, 512.0, 280.0, 1150.0, 160, 10, "STEEL"), ("ER-100", "INDUSTRIAL", "LFP", 76.8, 768.0, 100.0, 690.0, 240, 10, "STEEL")]),
    "ESS_MODULE": dict(kind="ESS 모듈", hs="850760", variants=[
        ("EMD-14", "INDUSTRIAL", "LFP", 14.3, 51.2, 280.0, 98.0, 16, 1, "STEEL"), ("EMD-5", "INDUSTRIAL", "LFP", 5.12, 51.2, 100.0, 45.0, 16, 1, "STEEL")]),
    "ESS_HOME": dict(kind="가정용 ESS", hs="850760", variants=[
        ("HS-10", "INDUSTRIAL", "LFP", 10.24, 51.2, 200.0, 92.0, 32, 2, "PLASTIC"), ("HS-1.9", "INDUSTRIAL", "LFP", 1.92, 25.6, 75.0, 19.5, 8, 1, "PLASTIC")]),
    "LMT_EBIKE": dict(kind="전기자전거 배터리", hs="850760", variants=[
        ("EB-36V14", "LMT", None, 0.504, 36.0, 14.0, 2.9, 40, 1, "PLASTIC"), ("EB-48V17", "LMT", None, 0.816, 48.0, 17.0, 4.3, 65, 1, "ALUMINIUM")]),
    "LMT_SCOOTER": dict(kind="전동스쿠터 배터리", hs="850760", variants=[
        ("SC-60V32", "LMT", None, 1.92, 60.0, 32.0, 11.8, 16, 1, "ALUMINIUM"), ("SC-72V40", "LMT", None, 2.88, 72.0, 40.0, 17.2, 20, 1, "ALUMINIUM"),
        ("SC-48V25", "LMT", None, 1.2, 48.0, 25.0, 8.1, 15, 1, "PLASTIC")]),
    "SLI_AGM": dict(kind="자동차용 AGM 축전지", hs="850710", variants=[
        ("AGM 70Ah", "SLI", "LEAD_ACID", 0.84, 12.0, 70.0, 20.5, 6, 0, "PLASTIC"), ("AGM 95Ah", "SLI", "LEAD_ACID", 1.14, 12.0, 95.0, 26.8, 6, 0, "PLASTIC")]),
    "SLI_LFP": dict(kind="자동차용 리튬 시동배터리", hs="850760", variants=[
        ("LS-60", "SLI", "LFP", 0.768, 12.8, 60.0, 8.6, 4, 0, "PLASTIC")]),
    "CYLINDRICAL": dict(kind="원통형 리튬이온 셀", hs="850760", variants=[
        ("21700-50E", "PORTABLE", None, 0.018, 3.6, 5.0, 0.069, 1, 0, "STEEL"), ("18650-35", "PORTABLE", None, 0.0126, 3.6, 3.5, 0.048, 1, 0, "STEEL")]),
    "PORTABLE": dict(kind="휴대용 배터리 팩", hs="850760", variants=[
        ("PB-20000", "PORTABLE", None, 0.074, 3.7, 20.0, 0.39, 4, 0, "PLASTIC"), ("NB-4S1P", "PORTABLE", None, 0.072, 14.4, 5.0, 0.31, 4, 0, "PLASTIC")]),
    "INDUSTRIAL_FORKLIFT": dict(kind="지게차용 리튬 배터리", hs="850760", variants=[
        ("FL-48V560", "INDUSTRIAL", "LFP", 26.9, 48.0, 560.0, 610.0, 15, 1, "STEEL"), ("FL-80V400", "INDUSTRIAL", "LFP", 32.0, 80.0, 400.0, 780.0, 25, 1, "STEEL")]),
}

# ───────────────────────────── 섬유 ─────────────────────────────
# (모델명, 겉감 조성[(코드, %)], 중량 GSM, 단위)
TEXTILE_LINES = {
    "TSHIRT": dict(kind="반팔 티셔츠", ftype="의류", sub="상의 - 티셔츠", hs="610910", garment=True, variants=[
        ("오가닉 코튼 크루넥 티셔츠", [("ORGANIC_COTTON", 100)], 180), ("에센셜 슬럽 티셔츠", [("COTTON", 95), ("ELASTANE", 5)], 160),
        ("리사이클 블렌드 티셔츠", [("ORGANIC_COTTON", 60), ("RECYCLED_POLYESTER", 40)], 170)]),
    "SWEATSHIRT": dict(kind="맨투맨", ftype="의류", sub="상의 - 스웨트셔츠", hs="611020", garment=True, variants=[
        ("헤비웨이트 맨투맨", [("COTTON", 80), ("RECYCLED_POLYESTER", 20)], 340), ("오가닉 루프백 맨투맨", [("ORGANIC_COTTON", 100)], 300)]),
    "SWEATER": dict(kind="니트 스웨터", ftype="의류", sub="상의 - 니트", hs="611011", garment=True, variants=[
        ("메리노 울 크루넥 니트", [("WOOL", 100)], 260), ("울 블렌드 케이블 니트", [("WOOL", 70), ("NYLON", 30)], 420),
        ("코튼 캐시 니트", [("COTTON", 85), ("ACRYLIC", 15)], 300)]),
    "DENIM": dict(kind="데님 팬츠", ftype="의류", sub="하의 - 데님", hs="620342", garment=True, variants=[
        ("셀비지 스트레이트 데님", [("COTTON", 100)], 470), ("스트레치 슬림 데님", [("COTTON", 92), ("RECYCLED_POLYESTER", 6), ("ELASTANE", 2)], 380),
        ("리사이클 코튼 와이드 데님", [("COTTON", 80), ("RECYCLED_POLYESTER", 20)], 400)]),
    "JACKET": dict(kind="아웃도어 재킷", ftype="의류", sub="아우터 - 재킷", hs="620193", garment=True, variants=[
        ("3L 방수 쉘 재킷", [("RECYCLED_POLYESTER", 100)], 150), ("경량 다운 재킷", [("NYLON", 100)], 45)]),
    "FLEECE": dict(kind="플리스 재킷", ftype="의류", sub="아우터 - 플리스", hs="610130", garment=True, variants=[
        ("리사이클 폴라 플리스", [("RECYCLED_POLYESTER", 100)], 280), ("하이파일 보아 플리스", [("RECYCLED_POLYESTER", 90), ("POLYESTER", 10)], 320)]),
    "SHIRT": dict(kind="셔츠", ftype="의류", sub="상의 - 셔츠", hs="620520", garment=True, variants=[
        ("린넨 오버핏 셔츠", [("LINEN", 100)], 140), ("옥스퍼드 버튼다운 셔츠", [("COTTON", 100)], 135),
        ("리오셀 블렌드 셔츠", [("LYOCELL", 70), ("LINEN", 30)], 125)]),
    "TOWEL": dict(kind="타월", ftype="홈텍스타일", sub="욕실 - 타월", hs="630260", garment=True, variants=[
        ("오가닉 코튼 호텔 타월", [("ORGANIC_COTTON", 100)], 550), ("뱀부 블렌드 페이스 타월", [("VISCOSE", 60), ("COTTON", 40)], 500)]),
    "FABRIC_ROLL_WOVEN": dict(kind="직물 원단", ftype="원단", sub="직물 - 평직/능직", hs="520842", garment=False, variants=[
        ("코튼 트윌 원단 58\"", [("COTTON", 100)], 240), ("T/C 포플린 원단 58\"", [("POLYESTER", 65), ("COTTON", 35)], 120),
        ("오가닉 캔버스 원단 60\"", [("ORGANIC_COTTON", 100)], 340)]),
    "FABRIC_ROLL_KNIT": dict(kind="니트 원단", ftype="원단", sub="편물 - 싱글저지", hs="600622", garment=False, variants=[
        ("싱글저지 30수 원단", [("COTTON", 100)], 165), ("스판 인터록 원단", [("COTTON", 92), ("ELASTANE", 8)], 230)]),
    "FABRIC_ROLL_LINEN": dict(kind="린넨 원단", ftype="원단", sub="직물 - 린넨", hs="530911", garment=False, variants=[
        ("워싱 린넨 원단 57\"", [("LINEN", 100)], 180), ("린넨 코튼 혼방 원단 57\"", [("LINEN", 55), ("COTTON", 45)], 200)]),
    "FABRIC_ROLL_POLY": dict(kind="리사이클 폴리에스터 원단", ftype="원단", sub="직물 - 기능성", hs="540761", garment=False, variants=[
        ("rPET 립스탑 원단 60\"", [("RECYCLED_POLYESTER", 100)], 75), ("rPET 2-way 스트레치 원단", [("RECYCLED_POLYESTER", 88), ("ELASTANE", 12)], 150)]),
    "YARN": dict(kind="원사", ftype="원사", sub="방적사 - 콘사", hs="520512", garment=False, variants=[
        ("면사 Ne 30/1 콤드", [("COTTON", 100)], None), ("오가닉 면사 Ne 40/1", [("ORGANIC_COTTON", 100)], None),
        ("rPET 가공사 150D/48F", [("RECYCLED_POLYESTER", 100)], None)]),
}

SHORT = {}  # org key -> 3글자 영문 약어 (SKU/시리얼 접두)


def abbr(org):
    en = org["name_en"].replace("Co., Ltd.", "").replace("Corp.", "").replace("Inc.", "").strip()
    words = [w for w in en.replace("&", " ").split() if w[0].isalpha()]
    if len(words) >= 3:
        a = words[0][0] + words[1][0] + words[2][0]
    elif len(words) == 2:
        a = words[0][:2] + words[1][0]
    else:
        a = words[0][:3]
    return a.upper()


def build_models(orgs):
    models = []
    used = set()
    for o in orgs:
        if o["org_type"] != "MANUFACTURER":
            continue
        a = abbr(o)
        while a in used:
            a = a[:2] + chr(ord(a[2]) + 1)
        used.add(a)
        SHORT[o["key"]] = a
        short_ko = o["name"].replace(" 주식회사", "")
        seq = 0
        for line in o["lines"]:
            if o["domain"] == "STEEL":
                spec = STEEL_LINES[line]
                for (size, grade, std, cn, kgm) in spec["variants"]:
                    seq += 1
                    models.append(dict(org=o["key"], domain="STEEL", line=line, sku=f"{a}-{line[:2]}{seq:02d}-{grade.replace('+', '').replace(' ', '')}",
                                       name=f"{short_ko} {grade} {spec['kind']} {size}", kind=spec["kind"], size=size, grade=grade,
                                       std=std, cn=cn, hs=spec["hs"], form=spec["form"], kgm=kgm, gtin=None))
            elif o["domain"] == "BATTERY":
                spec = BATTERY_LINES[line]
                for (sfx, cat, chem, kwh, v, ah, kg, cells, mods, casing) in spec["variants"]:
                    seq += 1
                    chem = chem or o["route"]
                    if chem == "LEAD_ACID" and line != "SLI_AGM":
                        chem = "LFP"
                    models.append(dict(org=o["key"], domain="BATTERY", line=line, sku=f"{a}-{sfx.replace(' ', '').replace('.', '')}",
                                       name=f"{short_ko} {sfx} {spec['kind']}", kind=spec["kind"], sfx=sfx, cat=cat, chem=chem,
                                       kwh=kwh, v=v, ah=ah, kg=kg, cells=cells, mods=mods, casing=casing, hs=spec["hs"], gtin=None))
            else:
                spec = TEXTILE_LINES[line]
                for (nm, comp, gsm) in spec["variants"]:
                    seq += 1
                    models.append(dict(org=o["key"], domain="TEXTILE", line=line, sku=f"{a}-{line[:3]}{seq:02d}",
                                       name=f"{short_ko} {nm}", kind=spec["kind"], ftype=spec["ftype"], sub=spec["sub"],
                                       comp=comp, gsm=gsm, hs=spec["hs"], garment=spec["garment"], gtin=None))
    # GTIN-13 (한국 880 접두, 체크디지트 계산)
    for i, m in enumerate(models):
        body = "880" + "%04d" % (5100 + i // 40) + "%05d" % (R.randint(0, 99999))
        s = sum(int(c) * (3 if k % 2 else 1) for k, c in enumerate(body))
        m["gtin"] = "0" + body + str((10 - s % 10) % 10)
    return models
