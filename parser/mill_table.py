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
    "ceq": "CEV", "cev": "CEV", "ce": "CEV",
}
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
        toks = [t for _, t in ws]
        low = [t.lower() for t in toks]
        for i in range(len(low) - len(want) + 1):
            if low[i:i + len(want)] == want:
                rest = toks[i + len(want):]
                if rest and rest[0] == ":":
                    rest = rest[1:]
                elif rest and rest[0].startswith(":"):
                    rest = [rest[0][1:]] + rest[1:]
                value = " ".join(t for t in rest if t).strip()
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
    return {
        "chemical_composition_wt_percent": chem_out,
        "mechanical_properties": mech_out,
        "identity": identity,
        "layout": "horizontal_table",
        "rows": len(data),
    }
