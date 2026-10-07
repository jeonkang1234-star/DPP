# -*- coding: utf-8 -*-
"""가로 표 양식 제강 성적서(Mill Test Certificate) 파서(2026-10-07).

실제 제철소 성적서는 우리 기존 목 문서처럼 "원소 → 측정값 → 규격"이 세로로 이어지지 않는다.
열 머리글(Size · Product No. · Heat No. · YP · TS · EL · CVN · C · Si · Mn ...) 아래에 제품이
한 행씩 늘어서는 가로 표다. 줄 단위 텍스트로 펼치면 열 대응이 사라지므로, PDF의 단어 좌표를 써서
'머리글의 x 위치'에 맞춰 각 값을 열에 붙인다.

  1) 머리글 찾기 : 인장시험 열(YP/YS/ReH, TS/Rm, EL/A)과 화학성분 열(C, Si, Mn ...)의 x 중심
  2) 규격 행    : 첫 칸이 MIN / MAX 인 행 → 하한·상한
  3) 데이터 행  : 첫 칸이 치수(예: 20.0x2,438x12,000)인 행 → 제품 1개
  4) 결과       : extractor.extract_steel_mill_values와 같은 모양으로 돌려준다
                  (chemical_composition_wt_percent / mechanical_properties / identity)

행이 여러 개면 판정 값은 **가장 불리한 행**을 쓴다(상한 항목은 최댓값, 하한 항목은 최솟값,
범위 항목은 범위에서 가장 많이 벗어난 값). 성적서 한 장에 묶인 제품 중 하나라도 규격을 벗어나면
그 성적서는 통과시키지 않는다는 뜻이다. 식별 정보(Heat No. 등)는 첫 번째 행에서 가져온다.

못 읽으면 None - 그러면 기존 세로 양식 파서 결과를 그대로 쓴다.
"""
import re

# 열 머리글 동의어 → 우리 내부 키. 왼쪽이 성적서에 찍히는 글자(소문자 비교).
MECH_ALIASES = {
    "yp": "ReH", "ys": "ReH", "reh": "ReH", "y.p": "ReH",
    "ts": "Rm", "rm": "Rm", "t.s": "Rm",
    "el": "A", "a%": "A", "elong": "A",
    "cvn": "KV", "kv": "KV", "kv2": "KV", "charpy": "KV",
}
CHEM_ALIASES = {
    "c": "C", "si": "Si", "mn": "Mn", "p": "P", "s": "S", "cu": "Cu", "n": "N",
    "cr": "Cr", "ni": "Ni", "mo": "Mo",
    "ceq": "CEV", "cev": "CEV",
}
# 잔류 원소 표(제품 분석) - 머리글 원소 → 영업비밀(ZKP 대체) 실측 필드.
RESIDUAL_FIELDS = {"co": "CHEM_CO_ACTUAL_PCT", "sb": "CHEM_SB_ACTUAL_PCT", "w": "CHEM_W_ACTUAL_PCT",
                   "zn": "CHEM_ZN_ACTUAL_PCT", "zr": "CHEM_ZR_ACTUAL_PCT", "ce": "CHEM_CE_ACTUAL_PCT"}
MAIN_CHEM_FIELDS = {"Mn": "CHEM_MN_ACTUAL_PCT", "Cr": "CHEM_CR_ACTUAL_PCT", "Ni": "CHEM_NI_ACTUAL_PCT",
                    "Mo": "CHEM_MO_ACTUAL_PCT"}
MECH_UNIT = {"ReH": "N/mm²", "Rm": "N/mm²", "A": "%", "KV": "J"}

_SIZE_PAT = re.compile(r"^\d+(\.\d+)?[xX×][\d,.]+([xX×][\d,.A-Za-z]+)?$")
_NUM_PAT = re.compile(r"^-?\d[\d,]*(\.\d+)?$")
_STD_GRADE_PAT = re.compile(r"^((?:EN|KS|JIS|ASTM|GB)\s*[A-Z]?\s*[\d.\-]+(?:-\d+)?)\s+(.+)$")


def _num(s):
    try:
        return float(s.replace(",", ""))
    except ValueError:
        return None


def _rows(words, tol=3.0):
    """단어들을 y(줄) 기준으로 묶는다. [(y, [(xc, text), ...]), ...] 위→아래."""
    rows = []
    for x0, y0, x1, y1, t, *_ in sorted(words, key=lambda w: (round(w[1]), w[0])):
        yc = (y0 + y1) / 2
        xc = (x0 + x1) / 2
        if rows and abs(rows[-1][0] - yc) <= tol:
            rows[-1][1].append((xc, t))
        else:
            rows.append([yc, [(xc, t)]])
    return [(y, sorted(ws)) for y, ws in rows]


def _header_columns(rows):
    """인장시험 머리글(YP/TS 등)이 있는 줄과 화학성분 머리글 줄에서 열 x 중심을 찾는다."""
    cols = {}
    header_y = None
    for y, ws in rows:
        keys = [(xc, t.strip().lower().rstrip(".:")) for xc, t in ws]
        mech = [(xc, MECH_ALIASES[k]) for xc, k in keys if k in MECH_ALIASES]
        chem = [(xc, CHEM_ALIASES[k]) for xc, k in keys if k in CHEM_ALIASES]
        # 머리글 줄 판정: 인장시험 2개 이상 또는 화학원소 4개 이상
        if len({k for _, k in mech}) >= 2 or len({k for _, k in chem}) >= 4:
            for xc, k in mech + chem:
                cols.setdefault(k, xc)
            for xc, t in ws:
                low = t.strip().lower()
                if low == "heat":
                    cols.setdefault("heat", xc + 10)
                elif low == "product":
                    cols.setdefault("prod", xc + 10)
                elif low == "weight":
                    cols.setdefault("wt", xc)
            header_y = y if header_y is None else max(header_y, y)
    if not ({"ReH", "Rm"} <= cols.keys()) or sum(1 for k in cols if k in CHEM_ALIASES.values()) < 4:
        return None, None
    return cols, header_y


def _assign(ws, cols, max_dx):
    """한 행의 단어를 가장 가까운 열에 붙인다(가까운 열이 max_dx 밖이면 버림)."""
    out = {}
    for xc, t in ws:
        best = min(cols.items(), key=lambda kv: abs(kv[1] - xc))
        if abs(best[1] - xc) <= max_dx and best[0] not in out:
            out[best[0]] = t
    return out


def _labeled_value(rows, label_tokens):
    """'Spec & Type : EN 10025-2 S355J2+N' 같은 머리 정보 줄에서 ':' 오른쪽 값을 꺼낸다.
    같은 줄 오른쪽 끝까지가 아니라, 라벨 바로 뒤 ':'부터 다음 라벨 전까지만 본다."""
    want = [t.lower() for t in label_tokens]
    for _, ws in rows:
        low = [t.lower() for _, t in ws]
        for i in range(len(low) - len(want) + 1):
            if low[i:i + len(want)] == want:
                rest = ws[i + len(want):]
                if rest and rest[0][1] == ":":
                    rest = rest[1:]
                elif rest and rest[0][1].startswith(":"):
                    rest = [(rest[0][0], rest[0][1][1:])] + rest[1:]
                # 같은 줄 오른쪽에 다른 머리 항목이 이어지면(단어 간격이 크게 벌어지면) 거기서 끊는다.
                vals = []
                for j, (xc, t) in enumerate(rest):
                    if vals and xc - rest[j - 1][0] > 70:
                        break
                    if t:
                        vals.append(t)
                value = " ".join(vals).strip()
                return value or None
    return None


def _fmt(v):
    s = f"{v:.4f}".rstrip("0").rstrip(".")
    return s


def extract_from_doc(doc):
    """fitz.Document → steel_mill_values 형태 dict, 또는 가로 표가 아니면 None."""
    if doc is None or doc.page_count == 0:
        return None
    page = doc[0]
    words = page.get_text("words")
    rows = _rows(words)
    cols, header_y = _header_columns(rows)
    if not cols:
        return None
    xs = sorted(cols.values())
    gaps = [b - a for a, b in zip(xs, xs[1:]) if b - a > 1]
    max_dx = max(8.0, (min(gaps) if gaps else 30) * 0.6)

    spec_min, spec_max, data = {}, {}, []
    for y, ws in rows:
        if y <= header_y or not ws:
            continue
        first = ws[0][1].strip()
        tag = first.upper().rstrip(".")
        if tag in ("MIN", "MAX"):
            vals = _assign([w for w in ws[1:] if _NUM_PAT.match(w[1])], cols, max_dx)
            (spec_min if tag == "MIN" else spec_max).update({k: _num(v) for k, v in vals.items()})
        elif _SIZE_PAT.match(first):
            vals = _assign(ws[1:], cols, max_dx)
            data.append((first, vals))
    if not data:
        return None

    chem_out, mech_out = {}, {}
    for key in [k for k in cols if k in CHEM_ALIASES.values()]:
        measured = [_num(v[key]) for _, v in data if key in v and _num(v[key]) is not None]
        hi = spec_max.get(key)
        if not measured or hi is None:
            continue
        chem_out[key] = {"measured": max(measured), "limit_text": "≤" + _fmt(hi)}
    for key in [k for k in cols if k in MECH_UNIT]:
        measured = [_num(v[key]) for _, v in data if key in v and _num(v[key]) is not None]
        lo, hi = spec_min.get(key), spec_max.get(key)
        if not measured or (lo is None and hi is None):
            continue
        if lo is not None and hi is not None:
            worst = max(measured, key=lambda m: max(lo - m, m - hi, -min(m - lo, hi - m)))
            spec = f"{_fmt(lo)}–{_fmt(hi)}"
        elif lo is not None:
            worst, spec = min(measured), "≥" + _fmt(lo)
        else:
            worst, spec = max(measured), "≤" + _fmt(hi)
        mech_out[key] = {"measured": worst, "unit": MECH_UNIT[key], "spec_text": spec}

    standard = grade = None
    spec_type = _labeled_value(rows, ("spec", "&", "type"))
    if spec_type:
        sm = _STD_GRADE_PAT.match(spec_type)
        if sm:
            standard, grade = sm.group(1).strip(), sm.group(2).strip()
        else:
            grade = spec_type
    size0, first = data[0]
    weight = _num(first["wt"]) if "wt" in first else None
    identity = {
        "heat_no": first.get("heat"),
        "cast_lot_no": first.get("prod"),
        "steel_grade": grade,
        "dimension_text": size0,
        "weight_kg": weight,
        "standard": standard,
    }
    spec = _spec_fields(rows, header_y, cols, max_dx, page.get_text(), data[0][1], spec_min, spec_max)
    return {
        "spec_fields": spec,
        "chemical_composition_wt_percent": chem_out,
        "mechanical_properties": mech_out,
        "identity": identity,
        "layout": "horizontal_table",
        "rows": len(data),
    }


_GAUGE_PAT = re.compile(r"Gauge\s*Length\s*:?\s*(\d+(?:\.\d+)?)\s*mm", re.I)
_DIRECTION_PAT = re.compile(r"Direction\s*:?\s*(Transvers\w*|Longitudinal|Through[- ]thickness)", re.I)
_TENSILE_STD_PAT = re.compile(r"Test\s*Method\s*:?\s*(ISO\s*6892[-\d:]*(?:\s*Method\s*[AB])?|ASTM\s*A370[-\d]*|KS\s*B\s*0802)", re.I)
_CHEM_STD_PAT = re.compile(r"Chemical\s*Analysis\s*:?\s*((?:ASTM|ISO|KS|JIS)\s*[A-Z]?\s*[\d\-:]+)", re.I)
_MTC_TYPE_PAT = re.compile(r"EN\s*10204\s*(?:type\s*)?([23])\.([12])", re.I)
_URL_PAT = re.compile(r"(https?://\S+\.pdf)")
_SURFACE = [(re.compile(r"galvani[sz]ed|HDG|hot[- ]dip", re.I), "HDG"),
            (re.compile(r"electro[- ]?galv|\bEG\b", re.I), "EG"),
            (re.compile(r"galvalume|AL-?ZN|aluzinc", re.I), "ALZN"),
            (re.compile(r"paint|coated|primer", re.I), "PAINTED"),
            (re.compile(r"as[- ]rolled|black|pickled|mill scale|none", re.I), "NONE")]


def _spec_fields(rows, header_y, cols, max_dx, text, first, spec_min, spec_max):
    """가로 표 성적서에서 DPP 항목(field_code → 값)을 바로 만든다 - 라벨 사전(spec_extractor)이
    표 안의 값을 못 읽으므로, 열 위치로 읽은 값을 field_code에 직접 꽂는다. 식별 정보(Heat No. 등)는
    BE persistIdentityFields가 identity로 따로 채우므로 여기 넣지 않는다."""
    out = {}

    def put(code, v):
        if v is not None and v != "":
            out[code] = str(v)

    def num(k):
        return _num(first[k]) if k in first else None

    put("YIELD_STRENGTH_ACTUAL_MPA", _fmt(num("ReH")) if num("ReH") is not None else None)
    put("TENSILE_STRENGTH_ACTUAL_MPA", _fmt(num("Rm")) if num("Rm") is not None else None)
    put("ELONGATION_ACTUAL_PCT", _fmt(num("A")) if num("A") is not None else None)
    if spec_min.get("ReH") is not None:
        put("YIELD_STRENGTH_MIN_MPA", _fmt(spec_min["ReH"]))
    if spec_min.get("Rm") is not None:
        put("TENSILE_STRENGTH_MIN_MPA", _fmt(spec_min["Rm"]))
    if spec_max.get("Rm") is not None:
        put("TENSILE_STRENGTH_MAX_MPA", _fmt(spec_max["Rm"]))
    if spec_min.get("A") is not None:
        put("ELONGATION_MIN_PCT", _fmt(spec_min["A"]))
    for el, code in MAIN_CHEM_FIELDS.items():
        if num(el) is not None:
            put(code, _fmt(num(el)))

    m = _GAUGE_PAT.search(text)
    if m:
        put("GAUGE_LENGTH_MM", m.group(1))
    m = _DIRECTION_PAT.search(text)
    if m:
        d = m.group(1).lower()
        put("TEST_DIRECTION", "T" if d.startswith("transv") else "L" if d.startswith("long") else "Z")
    m = _TENSILE_STD_PAT.search(text)
    if m:
        put("TENSILE_TEST_STANDARD", " ".join(m.group(1).split()))
    m = _CHEM_STD_PAT.search(text)
    if m:
        put("CHEMICAL_TEST_STANDARD", " ".join(m.group(1).split()))
    m = _MTC_TYPE_PAT.search(text)
    if m:
        put("MILL_TEST_CERTIFICATE_TYPE", f"EN10204_{m.group(1)}_{m.group(2)}")
    m = _URL_PAT.search(text)
    if m:
        put("MILL_TEST_CERTIFICATE_DOCUMENT_URL", m.group(1))
    # Division 열: L = 레이들 분석, P = 제품 분석
    div = (first.get("div") or "").upper() if "div" in cols else ""
    if re.search(r"Ladle\s*Analysis", text, re.I) or div == "L":
        put("CHEMICAL_ANALYSIS_TYPE", "LADLE" if div != "P" else "PRODUCT")
    prod = _labeled_value(rows, ("date", "of", "production")) or _labeled_value(rows, ("production", "date"))
    if prod and re.match(r"^\d{4}-\d{2}-\d{2}$", prod):
        put("PRODUCTION_DATE", prod)
    surface = _labeled_value(rows, ("surface", "condition"))
    if surface:
        for pat, code in _SURFACE:
            if pat.search(surface):
                put("SURFACE_TREATMENT_TYPE", code)
                break

    # 잔류 원소 표: 원소 머리글 줄 바로 다음 줄이 값
    for i, (y, ws) in enumerate(rows):
        if y <= header_y:
            continue
        hdr = [(xc, RESIDUAL_FIELDS[t.strip().lower()]) for xc, t in ws if t.strip().lower() in RESIDUAL_FIELDS]
        if len(hdr) >= 4 and i + 1 < len(rows):
            for xc, t in rows[i + 1][1]:
                if not _NUM_PAT.match(t):
                    continue
                best = min(hdr, key=lambda h: abs(h[0] - xc))
                if abs(best[0] - xc) <= 20:
                    put(best[1], t)
            break
    return out
