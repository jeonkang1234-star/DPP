# -*- coding: utf-8 -*-
"""실제 제철소 양식을 따른 제강 성적서(Mill Test Certificate) 목 PDF 생성기(2026-10-07).

기존 목 성적서(Q2_05_MILL_SHEET_PASS_1 등)는 "원소 → 측정값 → 규격"이 세로로 나열된 우리식
양식이었다. 실제 국내 제철소 성적서(강 제공 샘플)는 다음과 같다 - 이 생성기는 그 구조를 따른다.
  - 가로 표 한 장에 코일/후판 여러 행(행 = 제품 1개), 용해번호(Heat No.)가 행마다 다를 수 있음
  - 열: Size · Product No. · Quantity · Weight · Heat No. · Country of Melt & Pour · Position ·
        인장시험(YP/TS/EL) · 충격시험(CVN) · Division · 화학성분(C/Si/Mn/P/S/Cu/N/Ceq)
  - 영문 + 한글 부제, 하단 각주(Position·시험방향·Division 범례)와 EN 10204 3.1 인증 문구
  - 바탕에 회사명 워터마크(이미지 - 글자 레이어에 섞이지 않게)
샘플과 다른 점은 하나: 표 머리에 규격 하한/상한 행(SPEC. MIN / SPEC. MAX)을 넣었다. 국내외
제철소 성적서에 흔한 형식이고, 우리 ZKP 판정이 "성적서에 인쇄된 규격"을 기준으로 하기 때문이다.

회사는 가상의 '스트럭타스틸(STRUCTA STEEL WORKS)'이다 - 실제 회사 이름·로고는 쓰지 않는다.

    python3 docker/mock-documents/generator/real_style_mill.py            # steel/ 에 2건 생성
"""
import argparse
import io
import os

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.colors import Color, black
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.abspath(os.path.join(HERE, "..", "steel"))

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansKR-Regular.ttf",
    "C:/Windows/Fonts/malgun.ttf",
    "/Library/Fonts/AppleGothic.ttf",
]
try:  # pip install koreanize-matplotlib 이 NanumGothic.ttf를 같이 깐다
    import koreanize_matplotlib as _km
    FONT_CANDIDATES.insert(0, os.path.join(os.path.dirname(_km.__file__), "fonts", "NanumGothic.ttf"))
except Exception:  # noqa: BLE001
    pass

F, FB = "MillKR", "MillKR-Bold"
W, H = landscape(A4)

# ── 규격: EN 10025-2 S355J2+N (두께 16mm 초과 40mm 이하) ────────────────────
# 화학성분은 상한(MAX)만, 기계적 성질은 하한(MIN)·인장강도는 범위.
SPEC = {
    "C": (None, 0.20), "Si": (None, 0.55), "Mn": (None, 1.60), "P": (None, 0.025), "S": (None, 0.025),
    "Cu": (None, 0.55), "N": (None, 0.012), "Ceq": (None, 0.45),
    "YP": (345, None), "TS": (470, 630), "EL": (22, None), "CVN": (27, None),
}
ELEMENTS = ["C", "Si", "Mn", "P", "S", "Cu", "N", "Ceq"]
EL_FMT = {"C": "{:.3f}", "Si": "{:.2f}", "Mn": "{:.2f}", "P": "{:.4f}", "S": "{:.4f}", "Cu": "{:.2f}",
          "N": "{:.4f}", "Ceq": "{:.2f}"}

HEAT_A = {"C": 0.162, "Si": 0.21, "Mn": 1.42, "P": 0.0142, "S": 0.0041, "Cu": 0.02, "N": 0.0046, "Ceq": 0.41}
HEAT_B = {"C": 0.158, "Si": 0.24, "Mn": 1.38, "P": 0.0128, "S": 0.0036, "Cu": 0.03, "N": 0.0051, "Ceq": 0.40}

ROWS_PASS = [
    # size, product no, weight, heat, pos, YP, TS, EL, CVN, chem
    ("20.0x2,438x12,000", "PL26A0412", 4594, "SH60218", "T", 382, 528, 27, 96, HEAT_A),
    ("20.0x2,438x12,000", "PL26A0413", 4594, "SH60218", "B", 376, 521, 28, 88, HEAT_A),
    ("20.0x2,438x12,000", "PL26A0414", 4594, "SH60219", "T", 389, 535, 26, 102, HEAT_B),
    ("20.0x2,438x12,000", "PL26A0415", 4594, "SH60219", "B", 371, 517, 29, 91, HEAT_B),
]
# 실패 사례: 3번째 후판의 인장강도가 규격 상한(630)을 넘는다 - 한 행만 어긋나도 성적서 전체가 반려.
ROWS_FAIL = [r if i != 2 else (r[0], r[1], r[2], r[3], r[4], 468, 648, 24, r[8], r[9]) for i, r in enumerate(ROWS_PASS)]

DOCS = [
    ("Q2_05_MILL_SHEET_REAL_PASS.pdf", "MTC-STRUCTA-261007-01", "26-AB-0412", ROWS_PASS),
    ("Q2_05_MILL_SHEET_REAL_FAIL_인장강도초과.pdf", "MTC-STRUCTA-261007-02", "26-AB-0413", ROWS_FAIL),
]


def _font():
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            bold = p.replace("NanumGothic.ttf", "NanumGothicBold.ttf")
            pdfmetrics.registerFont(TTFont(F, p))
            pdfmetrics.registerFont(TTFont(FB, bold if os.path.exists(bold) else p))
            return p
    raise SystemExit("한글 TrueType 폰트가 없습니다: pip install koreanize-matplotlib 또는 apt install fonts-nanum")


def _watermark_png(font_path: str) -> ImageReader:
    """회사명 반복 워터마크. 이미지로 넣어야 PDF 글자 레이어(파서가 읽는 텍스트)에 안 섞인다."""
    scale = 2
    img = Image.new("RGBA", (int(W * scale), int(H * scale)), (255, 255, 255, 0))
    d = ImageDraw.Draw(img)
    fnt = ImageFont.truetype(font_path, 30 * scale)
    word = "structa"
    y = 20 * scale
    row = 0
    while y < img.height:
        x = -40 * scale + (row % 2) * 60 * scale
        while x < img.width:
            d.text((x, y), word, font=fnt, fill=(150, 160, 175, 17))
            x += 128 * scale
        y += 40 * scale
        row += 1
    buf = io.BytesIO()
    img.save(buf, "PNG")
    buf.seek(0)
    return ImageReader(buf)


def _limit_text(lo, hi, fmt="{}"):
    return ("" if lo is None else fmt.format(lo)), ("" if hi is None else fmt.format(hi))


def render(path, cert_no, order_no, rows, font_path):
    c = canvas.Canvas(path, pagesize=(W, H))
    c.setTitle(f"Mill Test Certificate {cert_no}")
    c.setAuthor("STRUCTA STEEL WORKS (mock)")
    c.drawImage(_watermark_png(font_path), 0, 0, W, H, mask="auto")

    # ── 제목 ──
    c.setFont(FB, 22)
    c.drawCentredString(W / 2, H - 46, "Mill Test Certificate")
    tw = pdfmetrics.stringWidth("Mill Test Certificate", FB, 22)
    c.setLineWidth(1.4)
    c.line(W / 2 - tw / 2 - 2, H - 51, W / 2 + tw / 2 + 2, H - 51)
    c.setFont(FB, 12)
    c.drawCentredString(W / 2, H - 66, "검 사 증 명 서")
    c.setFont(F, 7.5)
    c.drawString(28, H - 18, "STRUCTA STEEL WORKS CO., LTD.  ·  701 Saneop-ro, Dong-gu, Pohang-si, Gyeongbuk 37859, KR")
    c.drawRightString(W - 28, H - 18, f"Certificate No. {cert_no}   Date of Issue 2026-10-07")

    # ── 머리 정보 ──
    def head(x, y, label, sub, value):
        c.setFont(F, 9.5)
        c.drawString(x, y, label)
        c.setFont(F, 6.5)
        c.drawString(x, y - 9, sub)
        c.setFont(F, 9.5)
        c.drawString(x + 78, y, ":")
        if value:
            c.drawString(x + 90, y, value)

    head(28, H - 92, "Order No.", "계약번호", order_no)
    head(28, H - 116, "Supplier", "주문자", "")
    head(28, H - 140, "Customer", "고객사", "")
    head(430, H - 92, "PO No.", "주문번호", "")
    head(430, H - 116, "Commodity", "품명", "HOT ROLLED STEEL PLATE")
    head(430, H - 140, "Spec & Type", "규격", "EN 10025-2 S355J2+N")
    c.setLineWidth(0.8)
    c.line(28, H - 156, W - 28, H - 156)

    # ── 표 열 배치 ──
    cols = [  # (key, 머리글, 부제, 중심 x)
        ("size", "Size", "/치수", 68), ("prod", "Product No.", "/제품번호", 152), ("qty", "Quantity", "/수량", 205),
        ("wt", "Weight", "/중량(kg)", 250), ("heat", "Heat No.", "/제강번호", 302),
        ("melt", None, None, 341), ("pos", None, None, 364),
        ("YP", "YP", "(MPa)", 392), ("TS", "TS", "(MPa)", 423), ("EL", "EL", "(%)", 452),
        ("CVN", "CVN", "(J)", 491), ("div", None, None, 528),
    ]
    x_el = 562
    for i, e in enumerate(ELEMENTS):
        cols.append((e, e, "(%)", x_el + i * 33))
    cx = {k: x for k, _, _, x in cols}

    top, head_bot = H - 160, H - 252
    # 세로 점선
    c.setDash(2, 2)
    c.setLineWidth(0.4)
    for x in (113, 190, 226, 276, 328, 354, 374, 466, 516, 540):
        c.line(x, top, x, 120)
    c.setDash()
    # 그룹 머리글
    c.setFont(F, 9.5)
    c.drawCentredString((cx["YP"] + cx["EL"]) / 2, top - 16, "Tensile Test")
    c.setFont(F, 6.5)
    c.drawCentredString((cx["YP"] + cx["EL"]) / 2, top - 25, "/인장시험")
    c.setFont(F, 9.5)
    c.drawCentredString(cx["CVN"], top - 16, "Impact Test")
    c.setFont(F, 6.5)
    c.drawCentredString(cx["CVN"], top - 25, "/충격시험 -20℃")
    c.setFont(F, 9.5)
    c.drawString(x_el - 12, top - 16, "Chemical Composition")
    c.setFont(F, 6.5)
    c.drawString(x_el - 12, top - 25, "/화학성분")
    # 세로 머리글(원본 샘플처럼 회전)
    for key, label in (("melt", "Country of Melt & Pour"), ("pos", "Position"), ("div", "Division")):
        c.saveState()
        c.translate(cx[key] + 2, top - 8)
        c.rotate(-90)
        c.setFont(F, 7.5)
        c.drawString(0, 0, label)
        c.restoreState()
    # 열 머리글
    hy = top - 60
    for key, label, sub, x in cols:
        if not label:
            continue
        c.setFont(F, 9 if len(label) > 4 else 9.5)
        c.drawCentredString(x, hy, label)
        c.setFont(F, 6.5)
        c.drawCentredString(x, hy - 11, sub)
    c.setLineWidth(0.8)
    c.line(28, head_bot, W - 28, head_bot)

    # ── 규격 행 ──
    y = head_bot - 14
    for tag, idx in (("MIN", 0), ("MAX", 1)):
        c.setFont(FB, 8.5)
        c.drawCentredString(cx["size"], y, tag)
        c.setFont(F, 6.5)
        c.drawCentredString(cx["prod"], y, "SPEC. " + ("하한" if tag == "MIN" else "상한"))
        c.setFont(F, 8.5)
        for k in ("YP", "TS", "EL", "CVN"):
            v = SPEC[k][idx]
            if v is not None:
                c.drawCentredString(cx[k], y, str(v))
        for e in ELEMENTS:
            v = SPEC[e][idx]
            if v is not None:
                c.drawCentredString(cx[e], y, EL_FMT[e].format(v))
        y -= 13
    c.setLineWidth(0.4)
    c.setDash(1, 2)
    c.line(28, y + 5, W - 28, y + 5)
    c.setDash()
    y -= 8

    # ── 데이터 행 ──
    total = 0
    c.setFont(F, 8.5)
    for size, prod, wt, heat, pos, yp, ts, el, cvn, chem in rows:
        c.drawCentredString(cx["size"], y, size)
        c.drawCentredString(cx["prod"], y, prod)
        c.drawCentredString(cx["qty"], y, "1")
        c.drawCentredString(cx["wt"], y, f"{wt:,}")
        c.drawCentredString(cx["heat"], y, heat)
        c.drawCentredString(cx["melt"], y, "KOR")
        c.drawCentredString(cx["pos"], y, pos)
        for k, v in (("YP", yp), ("TS", ts), ("EL", el), ("CVN", cvn)):
            c.drawCentredString(cx[k], y, str(v))
        c.drawCentredString(cx["div"], y, "L")
        for e in ELEMENTS:
            c.drawCentredString(cx[e], y, EL_FMT[e].format(chem[e]))
        total += wt
        y -= 15
    c.drawString(34, y, "*** Sub Total (010) ***")
    c.drawCentredString(cx["qty"], y, str(len(rows)))
    c.drawCentredString(cx["wt"], y, f"{total:,}(kg)")
    y -= 14
    c.drawString(34, y, "*** Grand Total ***")
    c.drawCentredString(cx["qty"], y, str(len(rows)))
    c.drawCentredString(cx["wt"], y, f"{total:,}(kg)")
    c.drawString(560, y - 20, "=== Last Item ===")

    # ── 하단 ──
    c.setLineWidth(0.8)
    c.line(28, 118, W - 28, 118)
    c.line(W / 2 - 40, 118, W / 2 - 40, 46)
    c.line(28, 46, W - 28, 46)
    c.setFont(F, 8)
    notes = ["* Position - T : Top, M : Middle, B : Bottom",
             "* Tensile Test. Direction : Transversal, Gauge Length : 200 mm(Rectangular)",
             "  YP Method : Upper Yield Point (ReH)",
             "* Impact Test - Charpy V-notch 10x10 mm, Test Temp. : -20 ℃, Average of 3",
             "* Division - L : Ladle Analysis,  Ceq = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15"]
    for i, n in enumerate(notes):
        c.drawString(34, 106 - i * 12, n)
    cert = ["We certify that the material has been made in accordance with the order and is in compliance.",
            "This material has been fully killed and made by basic oxygen process.",
            "Test Certificate is issued according to ISO 10474/EN 10204 3.1.",
            "We, STRUCTA STEEL WORKS, hereby certify that the products specified in the present MTC",
            "have been fully processed in South Korea."]
    c.setFont(F, 7.5)
    for i, n in enumerate(cert):
        c.drawString(W / 2 - 32, 106 - i * 11, n)
    c.setFont(F, 6.5)
    c.drawString(W / 2 - 32, 52, "Legal sanction can be imposed on forging. Improper use of product can cause safety issues.")
    c.setFont(F, 9)
    c.drawString(34, 30, "Surveyor To:")
    c.setFont(F, 6)
    c.setFillColor(Color(0.45, 0.5, 0.58))
    c.drawRightString(W - 28, 16, f"MOCK / DEMONSTRATION DATA - {cert_no} - Generated for EU Digital Product Passport system")
    c.setFillColor(black)
    c.showPage()
    c.save()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=OUT_DIR)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    font_path = _font()
    for name, cert, order, rows in DOCS:
        p = os.path.join(args.out, name)
        render(p, cert, order, rows, font_path)
        print("생성:", p)


if __name__ == "__main__":
    main()
