# -*- coding: utf-8 -*-
"""철강 DPP 제출 문서 목 PDF - 실제 서식을 따른 판(2026-10-07).

예전 목 문서(build.py의 build_plain/build_cbam)는 "제목 몇 줄 + 부속서 A(라벨 : 값 나열)"였다.
파서 시험용으로는 충분했지만 실제 서류처럼 보이지 않았고, 무엇보다 **누가 어떤 서류에 어떤 값을
적어 내는가**가 실제와 달랐다. 예를 들어 시험·인증기관(TEST_LAB)이 책임지는 탄소·CBAM 항목이
제조사의 CBAM 보고서에만 실려 있어서, 협력사가 자기 서류(탄소발자국 산정·검증 보고서)를 다
올려도 담당 칸이 하나도 안 채워졌다(2026-10-07 강 지적).

이 생성기는 서류마다 실제 양식의 골격(발행처 머리, 문서 정보 상자, 번호 매긴 절, 괘선 표, 서명·직인,
쪽 번호)을 갖추고, **그 서류를 내는 주체가 책임지는 DPP 항목**을 표 안에 싣는다.

    서류                       발행 주체(역할)           싣는 DPP 항목
    CBAM 보고서 ×2             제조사(설비 운영자)        탄소·CBAM 전체(내재배출량·전구체·검증) + 수입 수량
    원산지증명서               대한상공회의소 양식         원산지증명서 URL · 원산지 국가
    EU 적합성선언서            제조사                      (선언 항목 · GTIN · EORI)
    제품 라벨                  제조사                      (식별 정보 · GS1 Digital Link)
    사용설명서                 제조사                      (취급·보관·안전)
    기술문서                   제조사                      (필수 특성 · 적용 표준)
    스크랩 매입증빙            원자재 공급사(RAW_SUPPLIER) 재생 스크랩 함유율 · 스크랩 출처
    물질안전보건자료(SDS)      원자재 공급사(RAW_SUPPLIER) SVHC·RoHS·6가크롬
    탄소발자국 산정·검증 보고서 시험·인증기관(TEST_LAB)    단위당 내재배출량 + CBAM 검증 항목 전체
    LCA/EPD                    시험·인증기관(TEST_LAB)    단위당 내재배출량 · 재활용 가능성
    시험성적서                 시험·인증기관(TEST_LAB)    (공인시험 결과)

■ 파서와의 약속
  - DPP 항목은 괘선이 있는 2열/4열 표(라벨 칸 | 값 칸)에 넣는다. 파서가 표를 찾아(find_tables)
    '라벨: 값'으로 펼친 뒤 라벨 사전(parser/spec_fields.py)으로 읽는다. 라벨 칸 글자는 사전의
    한글 라벨과 똑같아야 한다 - 그래서 라벨은 spec_fields에서 가져온다.
  - CBAM 수입 수량('수입 수량' 다음 줄에 'N t'), PCF('총 탄소발자국 (PCF)' 다음 줄에 숫자),
    원산지('Country of origin ... (KR)'), GTIN/EORI/문서번호/발행일 패턴은 extractor.py 정규식 그대로.
  - 직인·바코드·QR은 그림(벡터)이라 글자 레이어에 섞이지 않는다.

회사·기관은 전부 가상이다(스트럭타스틸, 한빛자원, 대한시험인증, DPP Demo GmbH).

    python3 docker/mock-documents/generator/real_style_steel_docs.py          # steel/ 에 생성
"""
import argparse
import os
import sys
import textwrap

from reportlab.graphics import renderPDF
from reportlab.graphics.barcode import code128
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib.colors import Color, black, white
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(REPO, "parser"))

import real_style_mill  # noqa: E402  (폰트 등록 재사용)
import spec_fields  # noqa: E402

F, FB = real_style_mill.F, real_style_mill.FB
W, H = A4
ML, MR = 42, 42
GREY = Color(0.42, 0.47, 0.55)
LIGHT = Color(0.93, 0.95, 0.98)
LINE = Color(0.55, 0.6, 0.68)
NAVY = Color(0.06, 0.18, 0.36)
RED = Color(0.78, 0.12, 0.12)

LABEL = {f["code"]: f["label_ko"] for f in spec_fields.SPEC_FIELDS if f["domain"] in ("COMMON", "STEEL")}
OUT_DIR = os.path.abspath(os.path.join(HERE, "..", "steel"))

ISSUE_DATE = "2026-10-07"

# ── 등장 주체(전부 가상) ─────────────────────────────────────────────────
MFR = dict(ko="스트럭타스틸㈜", en="STRUCTA STEEL WORKS CO., LTD.",
           addr="경상북도 포항시 남구 산업로 701 (37859)", addr_en="701 Saneop-ro, Nam-gu, Pohang-si, Gyeongbuk 37859, Republic of Korea",
           biz="506-81-11223", eori="KR5068111223", tel="+82-54-000-1200",
           plant="포항제철소 후판공장 2라인", plant_en="Pohang Works · Plate Mill No.2", inst_id="KR-STR-PH-002",
           signer="김도윤", signer_title="품질보증팀장 / Quality Assurance Manager")
IMPORTER = dict(name="DPP Demo GmbH", addr="Am Sandtorkai 48, 20457 Hamburg, Germany", eori="DE812345678")
SUPPLIER = dict(ko="한빛자원㈜", en="HANBIT RESOURCES CO., LTD.", addr="경상북도 포항시 남구 철강로 312 (37875)",
                biz="503-81-55621", tel="+82-54-000-3300", signer="박지훈", signer_title="품질관리 책임자")
LAB = dict(ko="대한시험인증㈜", en="DAEHAN TESTING & CERTIFICATION CO., LTD.",
           addr="서울특별시 금천구 가산디지털1로 145 (08506)", biz="119-86-40712", kolas="KT-0417",
           verifier_no="KAB-CBAM-VB-0213", tel="+82-2-000-7700", signer="이서연", signer_title="기술책임자 / Technical Manager",
           reviewer="정민호", reviewer_title="품질책임자 / Quality Manager")

PRODUCT = dict(name="열간압연 후판 (Hot Rolled Steel Plate)", grade="S355J2+N", std="EN 10025-2:2019",
               size="20 x 2,438 x 12,000 mm", heat="SH60218", plate="PL26A0412", weight_kg="4,594",
               net_t="4.594", gtin="08801234500019", cn="7208 51 20", hs="7208.51", order="26-AB-0412",
               mtc="MTC-STRUCTA-261007-01", invoice="INV-STR-2610-0412", qty_pcs="4")

# DPP 항목 값 - 서류 사이에서 같은 값은 반드시 같게 쓴다(교차검증이 불일치로 잡는다).
V = {
    "PCF_VALUE": "1420 kgCO2e/t",
    "CBAM_DIRECT_EMISSIONS_TCO2E_PER_T": "1.108 tCO2e/t",
    "CBAM_INDIRECT_EMISSIONS_TCO2E_PER_T": "0.312 tCO2e/t",
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
    "CBAM_VERIFICATION_BODY_NAME": "대한시험인증㈜",
    "CBAM_VERIFICATION_REPORT_URL": "https://verify.daehan-tc.example.kr/cbam/2026Q3/STR-0412.pdf",
    "SVHC_PRESENCE_IN_COATING": "아니오",
    "SVHC_SUBSTANCE_NAME": "해당 없음",
    "SVHC_CAS_NUMBER": "해당 없음",
    "SVHC_CONCENTRATION_PCT": "0.00 %",
    "ROHS_COMPLIANT_STATUS": "예",
    "HEXAVALENT_CHROMIUM_CR6_PRESENCE": "아니오",
    "RECYCLED_SCRAP_RATE": "28 %",
    "SCRAP_SOURCE": "국내 가공 스크랩 (한빛자원㈜ 포항·경주 야드)",
    "CERTIFICATE_OF_ORIGIN_URL": "https://coo.chamber.example.kr/2026/KR-C-2610-0412.pdf",
}


def L(code):
    """DPP 항목 라벨 - 파서 사전과 같은 글자여야 한다."""
    return LABEL[code]


def kv_fields(codes):
    return [(L(c), V[c]) for c in codes]


PRECURSOR_ORIGIN = {1: "자사 고로 (Internal)", 2: "외부 매입 (한빛자원㈜)", 3: "외부 매입 (석회 소성)"}


def precursor_rows():
    """전구체 1개 = 표 두 줄: [명칭 | 투입량], [단위 배출량 | 출처]."""
    rows = []
    for n in (1, 2, 3):
        rows += [(L(f"PRECURSOR_{n}_NAME"), V[f"PRECURSOR_{n}_NAME"]),
                 (L(f"PRECURSOR_{n}_QUANTITY_T_PER_T"), V[f"PRECURSOR_{n}_QUANTITY_T_PER_T"]),
                 (L(f"PRECURSOR_{n}_SPECIFIC_EMISSIONS"), V[f"PRECURSOR_{n}_SPECIFIC_EMISSIONS"] + " tCO2e/t"),
                 (f"전구체 {n} 출처", PRECURSOR_ORIGIN[n])]
    return rows


class Doc:
    """A4 세로 서식 렌더러. 괘선 표·절 제목·서명란·쪽 번호를 그린다."""

    def __init__(self, path, doc_no, title, issuer_line):
        self.c = canvas.Canvas(path, pagesize=A4)
        self.c.setTitle(title)
        self.c.setAuthor(issuer_line + " (mock)")
        self.doc_no = doc_no
        self.issuer_line = issuer_line
        self.page = 1
        self.y = H - 50

    # ── 쪽 관리 ──
    def _footer(self):
        c = self.c
        c.setStrokeColor(LINE)
        c.setLineWidth(0.4)
        c.line(ML, 46, W - MR, 46)
        c.setFont(F, 6.8)
        c.setFillColor(GREY)
        c.drawString(ML, 36, self.issuer_line)
        c.drawRightString(W - MR, 36, f"{self.doc_no}  ·  Page {self.page}")
        c.setFont(F, 5.8)
        c.drawCentredString(W / 2, 24, f"MOCK / DEMONSTRATION DATA - {self.doc_no} - Generated for EU Digital Product Passport system")
        c.setFillColor(black)
        c.setStrokeColor(black)

    def need(self, h):
        if self.y - h < 64:
            self._footer()
            self.c.showPage()
            self.page += 1
            self.y = H - 50
            self.c.setFont(F, 7)
            self.c.setFillColor(GREY)
            self.c.drawRightString(W - MR, H - 34, self.doc_no + " (계속 / continued)")
            self.c.setFillColor(black)

    def save(self):
        self._footer()
        self.c.save()

    # ── 블록 ──
    def letterhead(self, name_ko, name_en, addr, extra, accent=NAVY):
        c = self.c
        c.setFillColor(accent)
        c.rect(ML, self.y - 4, 6, 30, stroke=0, fill=1)
        c.setFillColor(black)
        c.setFont(FB, 13)
        c.drawString(ML + 14, self.y + 12, name_ko)
        c.setFont(F, 7.5)
        c.drawString(ML + 14, self.y + 1, name_en)
        c.setFont(F, 7)
        c.setFillColor(GREY)
        c.drawRightString(W - MR, self.y + 14, addr)
        c.drawRightString(W - MR, self.y + 4, extra)
        c.setFillColor(black)
        self.y -= 14
        c.setStrokeColor(accent)
        c.setLineWidth(1.2)
        c.line(ML, self.y, W - MR, self.y)
        c.setStrokeColor(black)
        self.y -= 30

    def title(self, ko, en):
        c = self.c
        c.setFont(FB, 17)
        c.drawCentredString(W / 2, self.y, ko)
        self.y -= 15
        c.setFont(F, 8.5)
        c.setFillColor(GREY)
        c.drawCentredString(W / 2, self.y, en)
        c.setFillColor(black)
        self.y -= 20

    def section(self, text):
        self.need(40)
        c = self.c
        c.setFillColor(LIGHT)
        c.rect(ML, self.y - 4, W - ML - MR, 16, stroke=0, fill=1)
        c.setFillColor(NAVY)
        c.setFont(FB, 9.5)
        c.drawString(ML + 6, self.y + 0.5, text)
        c.setFillColor(black)
        self.y -= 20

    def para(self, text, size=8.2, indent=0, color=black, width_chars=None, gap=None):
        c = self.c
        gap = gap or size + 3.4
        max_w = W - ML - MR - indent
        lines = []
        for raw in text.split("\n"):
            cur = ""
            for ch in raw:
                if pdfmetrics.stringWidth(cur + ch, F, size) > max_w:
                    lines.append(cur)
                    cur = ch.lstrip()
                else:
                    cur += ch
            lines.append(cur)
        for ln in lines:
            self.need(gap)
            c.setFont(F, size)
            c.setFillColor(color)
            c.drawString(ML + indent, self.y, ln)
            c.setFillColor(black)
            self.y -= gap
        self.y -= 2

    def kv(self, rows, cols=2, label_w=None, size=8.2, row_h=17, shade=True):
        """괘선 2열/4열 표. 파서는 이 표를 '라벨: 값'으로 읽는다."""
        c = self.c
        total = W - ML - MR
        if cols == 2:
            lw = label_w or 170
            widths = [lw, total - lw]
            grid = [list(r) for r in rows]
        else:
            lw = label_w or 112
            vw = total / 2 - lw
            widths = [lw, vw, lw, vw]
            grid = []
            for i in range(0, len(rows), 2):
                a = rows[i]
                b = rows[i + 1] if i + 1 < len(rows) else ("", "")
                grid.append([a[0], a[1], b[0], b[1]])
        for r in grid:
            self.need(row_h)
            x = ML
            for j, (w, txt) in enumerate(zip(widths, r)):
                is_label = (j % 2 == 0)
                if is_label and shade:
                    c.setFillColor(LIGHT)
                    c.rect(x, self.y - row_h + 5, w, row_h, stroke=0, fill=1)
                    c.setFillColor(black)
                c.setStrokeColor(LINE)
                c.setLineWidth(0.5)
                c.rect(x, self.y - row_h + 5, w, row_h, stroke=1, fill=0)
                c.setStrokeColor(black)
                fs = size
                while txt and pdfmetrics.stringWidth(txt, F, fs) > w - 8 and fs > 5.5:
                    fs -= 0.3
                c.setFont(FB if is_label else F, fs)
                if txt:
                    c.drawString(x + 4, self.y - row_h + 10, txt)
                x += w
            self.y -= row_h
        self.y -= 8

    def grid(self, header, rows, widths, size=7.8, row_h=15, align=None):
        """머리글이 있는 괘선 표(측정 결과·계량 내역 등)."""
        c = self.c
        total = W - ML - MR
        scale = total / sum(widths)
        widths = [w * scale for w in widths]

        def draw_row(cells, bold=False, fill=None):
            self.need(row_h)
            x = ML
            for j, (w, txt) in enumerate(zip(widths, cells)):
                if fill is not None:
                    c.setFillColor(fill)
                    c.rect(x, self.y - row_h + 5, w, row_h, stroke=0, fill=1)
                    c.setFillColor(black)
                c.setStrokeColor(LINE)
                c.setLineWidth(0.5)
                c.rect(x, self.y - row_h + 5, w, row_h, stroke=1, fill=0)
                c.setStrokeColor(black)
                fs = size
                txt = str(txt)
                while txt and pdfmetrics.stringWidth(txt, FB if bold else F, fs) > w - 6 and fs > 5.2:
                    fs -= 0.3
                c.setFont(FB if bold else F, fs)
                a = (align or {}).get(j, "l")
                if a == "c":
                    c.drawCentredString(x + w / 2, self.y - row_h + 9.5, txt)
                elif a == "r":
                    c.drawRightString(x + w - 4, self.y - row_h + 9.5, txt)
                else:
                    c.drawString(x + 3.5, self.y - row_h + 9.5, txt)
                x += w
            self.y -= row_h

        draw_row(header, bold=True, fill=LIGHT)
        for r in rows:
            draw_row(r)
        self.y -= 8

    def kpi(self, items):
        """결과 강조 상자 - 라벨 아래 큰 숫자. items = [(라벨, 값), ...]"""
        self.need(52)
        c = self.c
        n = len(items)
        gap = 10
        bw = (W - ML - MR - gap * (n - 1)) / n
        for i, (label, value) in enumerate(items):
            x = ML + i * (bw + gap)
            c.setFillColor(LIGHT)
            c.setStrokeColor(LINE)
            c.roundRect(x, self.y - 38, bw, 44, 4, stroke=1, fill=1)
            c.setFillColor(GREY)
            c.setFont(F, 7.6)
            c.drawString(x + 8, self.y - 8, label)
            c.setFillColor(NAVY)
            c.setFont(FB, 15)
            c.drawString(x + 8, self.y - 29, value)
        c.setFillColor(black)
        c.setStrokeColor(black)
        self.y -= 52

    def doc_box(self, rows):
        """문서 정보 상자(문서번호·발행일 등) - 2열 4쌍."""
        self.kv(rows, cols=4, label_w=78, size=7.8, row_h=15)

    def signature(self, left, right=None, stamp=None):
        """서명란. left/right = (역할, 성명, 직함). stamp = 직인 글자(원형 빨간 도장)."""
        self.need(80)
        c = self.c
        self.y -= 6
        boxes = [left] + ([right] if right else [])
        bw = (W - ML - MR - 20) / 2
        for i, (role, name, title) in enumerate(boxes):
            x = ML + i * (bw + 20)
            c.setFont(F, 7.5)
            c.setFillColor(GREY)
            c.drawString(x, self.y, role)
            c.setFillColor(black)
            c.setLineWidth(0.6)
            c.line(x, self.y - 34, x + bw - 40, self.y - 34)
            # 서명(손글씨 흉내 - 곡선)
            p = c.beginPath()
            sx, sy = x + 12, self.y - 26
            p.moveTo(sx, sy)
            p.curveTo(sx + 14, sy + 16, sx + 22, sy - 10, sx + 36, sy + 6)
            p.curveTo(sx + 46, sy + 14, sx + 52, sy - 6, sx + 70, sy + 2)
            c.setStrokeColor(Color(0.1, 0.18, 0.45))
            c.setLineWidth(1.1)
            c.drawPath(p, stroke=1, fill=0)
            c.setStrokeColor(black)
            c.setFont(FB, 8.5)
            c.drawString(x, self.y - 46, name)
            c.setFont(F, 7.2)
            c.drawString(x + pdfmetrics.stringWidth(name, FB, 8.5) + 6, self.y - 46, title)
        if stamp:
            cx_, cy_ = W - MR - 34, self.y - 22
            c.setStrokeColor(RED)
            c.setLineWidth(1.6)
            c.circle(cx_, cy_, 22, stroke=1, fill=0)
            c.setLineWidth(0.6)
            c.circle(cx_, cy_, 18.5, stroke=1, fill=0)
            c.setFillColor(RED)
            c.setFont(FB, 6.5)
            c.drawCentredString(cx_, cy_ + 2, stamp[:8])
            c.setFont(FB, 6)
            c.drawCentredString(cx_, cy_ - 6, "직인")
            c.setFillColor(black)
            c.setStrokeColor(black)
        self.y -= 62

    def qr(self, data, x, y, size=70):
        w = QrCodeWidget(data)
        b = w.getBounds()
        d = Drawing(size, size, transform=[size / (b[2] - b[0]), 0, 0, size / (b[3] - b[1]), 0, 0])
        d.add(w)
        renderPDF.draw(d, self.c, x, y)

    def barcode(self, data, x, y, h=28, bar_w=0.9):
        b = code128.Code128(data, barHeight=h, barWidth=bar_w, humanReadable=False)
        b.drawOn(self.c, x, y)


# ═══════════════════════════════════════════════════════════════════════
# 제조사(스트럭타스틸) 서류
# ═══════════════════════════════════════════════════════════════════════

def mfr_head(d, title_ko, title_en):
    d.letterhead(MFR["ko"], MFR["en"], MFR["addr"], f"사업자/법인번호 {MFR['biz']}  ·  EORI {MFR['eori']}  ·  Tel {MFR['tel']}")
    d.title(title_ko, title_en)


def build_cbam(path, import_qty_t, doc_no):
    """CBAM 내재배출량 보고서 - 집행규정 (EU) 2023/1773 부속서 IV '설비 운영자 → 신고인 통보' 양식 골격."""
    d = Doc(path, doc_no, "CBAM Embedded Emissions Report " + doc_no, MFR["en"])
    mfr_head(d, "CBAM 탄소국경조정 내재배출량 보고서", "Communication of Embedded Emissions · Implementing Regulation (EU) 2023/1773 Annex IV")
    d.doc_box([("문서번호", doc_no), ("발행일", ISSUE_DATE), ("보고 기간", "2026-07-01 ~ 2026-09-30"),
               ("보고 대상", "2026 Q3"), ("신고인", IMPORTER["name"]), ("신고인 EORI", IMPORTER["eori"]),
               ("버전", "v1.0 (최종)"), ("언어", "KO / EN")])
    d.section("1. 설비 운영자 및 설비 정보 (Operator & Installation)")
    d.kv([("운영자 (Operator)", MFR["en"]), ("설비명 (Installation)", MFR["plant_en"]),
          ("설비 식별번호", MFR["inst_id"]), ("소재지", MFR["addr_en"]),
          ("설비 소재국", "KR (Republic of Korea)"), ("UN/LOCODE", "KR KPO")])
    d.section("2. 대상 상품 (Goods)")
    d.grid(["CN 코드", "품목", "생산 경로", "강종", "출하 물량"],
           [[PRODUCT["cn"], "열간압연 후판 (Flat-rolled, ≥ 600 mm, hot-rolled)", "BF-BOF (고로-전로)", PRODUCT["grade"], f"{import_qty_t} t"]],
           [16, 40, 20, 14, 14], align={0: "c", 2: "c", 3: "c", 4: "r"})
    d.para("신고인이 EU로 수입한 물량은 아래와 같다. 수입 물량이 de minimis 기준(연간 50 t)을 넘는지는 신고인이 판단한다.",
           size=7.6, color=GREY)
    d.kv([("상품 분류 (CN Code)", PRODUCT["cn"]), ("수입 수량", f"{import_qty_t} t")], cols=4, label_w=96)
    d.section("3. 내재배출량 (Specific Embedded Emissions)")
    d.kv(kv_fields(["PCF_VALUE", "CBAM_DIRECT_EMISSIONS_TCO2E_PER_T", "CBAM_INDIRECT_EMISSIONS_TCO2E_PER_T",
                    "CBAM_ACTUAL_DATA_USED_RATIO_PCT", "CBAM_DEFAULT_VALUE_USED_RATIO_PCT"]), cols=2, label_w=190)
    d.para("총 내재배출량은 직접배출(1.108)과 간접배출(0.312)의 합 1.420 tCO2e/t 이다. 산정은 부속서 III 의 "
           "계산 기반 방법론(연료·원료 물질수지)에 따르며, 기본값은 전구체 일부에만 사용하였다.", size=7.6, color=GREY)
    d.section("4. 전력 및 전구체 (Electricity & Precursors)   ※ 영업비밀 - 영지식증명으로 충족 여부만 공개")
    d.kv(kv_fields(["ELECTRICITY_EMISSION_FACTOR_TCO2E_PER_MWH", "ELECTRICITY_SOURCE"]), cols=4, label_w=96)
    d.kv(precursor_rows(), cols=4, label_w=96)
    d.section("5. 원산지국 탄소가격 (Carbon Price Due)")
    d.kv([("적용 제도", "K-ETS (한국 배출권거래제)"), ("유상할당 비율", "10 %"),
          ("납부 탄소가격", "해당 기간 정산 전 (차기 보고 시 반영)"), ("통화", "KRW")], cols=4, label_w=96)
    d.section("6. 제3자 검증 (Verification)")
    d.kv(kv_fields(["CBAM_EMISSIONS_VERIFIED_BY_THIRD_PARTY", "CBAM_VERIFICATION_BODY_NAME",
                    "CBAM_VERIFICATION_REPORT_URL"]) + [("검증기관 인정번호", LAB["verifier_no"]), ("검증 의견", "적정 (Reasonable assurance)")],
         cols=2, label_w=190)
    d.para("본 보고서의 내재배출량 자료는 설비 운영자가 작성하였으며 위 검증기관의 검증을 받았음을 확인한다.", size=8)
    d.signature(("설비 운영자 확인 / For the Operator", MFR["signer"], MFR["signer_title"]), stamp="스트럭타스틸")
    d.save()


def build_coo(path):
    """원산지증명서 - 상공회의소 일반 원산지증명서(Certificate of Origin) 칸 구성."""
    doc_no = "KR-C-2610-0412"
    d = Doc(path, doc_no, "Certificate of Origin " + doc_no, "Korea Chamber of Commerce & Industry (mock)")
    c = d.c
    c.setFont(FB, 15)
    c.drawCentredString(W / 2, d.y, "CERTIFICATE OF ORIGIN")
    d.y -= 15
    c.setFont(F, 9)
    c.drawCentredString(W / 2, d.y, "원 산 지 증 명 서   ·   issued by Korea Chamber of Commerce and Industry (Pohang)")
    d.y -= 22
    d.kv([("1. Exporter (수출자)", f"{MFR['en']} · {MFR['addr_en']}"),
          ("2. Consignee (수하인)", f"{IMPORTER['name']} · {IMPORTER['addr']}"),
          ("3. Means of transport", "By vessel · POHANG, KOREA → HAMBURG, GERMANY · ETD 2026-10-12"),
          ("4. Certificate No. / 문서번호", doc_no),
          ("5. Country of destination", "GERMANY (DE)")], cols=2, label_w=150)
    d.grid(["6. Marks & Nos", "7. Number and kind of packages; description of goods", "8. Quantity", "9. Invoice No."],
           [[PRODUCT["plate"] + "~0415", f"{PRODUCT['qty_pcs']} PCS HOT ROLLED STEEL PLATE {PRODUCT['grade']} {PRODUCT['size']} · HS {PRODUCT['hs']}",
             "18,376 kg", PRODUCT["invoice"]]],
           [18, 52, 13, 17])
    d.para("Country of origin REPUBLIC OF KOREA (KR)", size=9.5)
    d.kv([("10. Country of origin (원산지)", "REPUBLIC OF KOREA (KR)"),
          (L("CERTIFICATE_OF_ORIGIN_URL"), V["CERTIFICATE_OF_ORIGIN_URL"]),
          ("Verification code", "7F3A-21C9-0412")], cols=2, label_w=150)
    d.section("11. Declaration by the exporter (수출자 신고)")
    d.para("The undersigned hereby declares that the above details and statements are correct, that all the goods "
           "were produced in REPUBLIC OF KOREA and that they comply with the origin requirements.", size=8)
    d.para(f"발행일 {ISSUE_DATE}   Place and date: POHANG, {ISSUE_DATE}", size=8)
    d.signature(("Exporter / 수출자", MFR["signer"], MFR["signer_title"]),
                ("12. Certification (상공회의소 증명)", "최현우", "Certifying Officer, KCCI Pohang"),
                stamp="상공회의소")
    d.qr("https://coo.chamber.example.kr/verify/" + doc_no, W - MR - 70, 70, 60)
    d.save()


def build_eu_doc(path):
    """EU 적합성선언서 - 결정 768/2008/EC 부속서 III 번호 구성."""
    doc_no = "DoC-STR-2026-0412"
    d = Doc(path, doc_no, "EU Declaration of Conformity " + doc_no, MFR["en"])
    mfr_head(d, "EU 적합성선언서", "EU DECLARATION OF CONFORMITY  ·  Decision No 768/2008/EC Annex III")
    d.doc_box([("문서번호", doc_no), ("발행일", ISSUE_DATE), ("제품", PRODUCT["grade"] + " 후판"), ("GTIN", PRODUCT["gtin"])])
    items = [
        ("1. 제품 모델 / 제품", f"{PRODUCT['name']} · {PRODUCT['grade']} · {PRODUCT['size']}"),
        ("2. 제조자", f"{MFR['en']} · {MFR['addr_en']}"),
        ("3. 책임", "본 적합성선언서는 제조자의 단독 책임 하에 발행된다."),
        ("4. 선언 대상", f"Heat {PRODUCT['heat']} · Plate {PRODUCT['plate']}~0415 · GTIN {PRODUCT['gtin']}"),
        ("5. 관련 EU 법령", "Regulation (EU) 2024/1781 (ESPR) · Regulation (EU) 305/2011 (CPR)"),
        ("6. 적용 조화표준", "EN 10025-1:2004, EN 10025-2:2019, EN 10204:2004"),
        ("7. 인증기관", "Notified Body 2873 (가상) · FPC 인증서 2873-CPR-STR-0021"),
        ("8. 추가 정보", "검사증명서 EN 10204 3.1 · " + PRODUCT["mtc"]),
        ("EU 역내 책임자", f"{IMPORTER['name']} · EORI {IMPORTER['eori']}"),
        ("제조자 EORI", "EORI " + MFR["eori"]),
    ]
    d.kv(items, cols=2, label_w=120)
    d.para("위 선언 대상 제품은 상기 EU 법령의 관련 조화 요구사항에 적합함을 선언한다.", size=8.5)
    d.para(f"Signed for and on behalf of: {MFR['en']}   ·   POHANG, {ISSUE_DATE}", size=8, color=GREY)
    d.signature(("서명 / Signature", MFR["signer"], MFR["signer_title"]), stamp="스트럭타스틸")
    d.save()


def build_label(path):
    """제품 라벨(출하 꼬리표) - 후판에 부착하는 식별표 + GS1 Digital Link QR."""
    doc_no = "LBL-STR-PL26A0412"
    d = Doc(path, doc_no, "Product Label " + doc_no, MFR["en"])
    mfr_head(d, "제품 식별 라벨 · 데이터 캐리어", "PRODUCT IDENTIFICATION LABEL  ·  GS1 Digital Link (ISO/IEC 18975)")
    c = d.c
    # 라벨 외곽
    top = d.y
    c.setLineWidth(1.4)
    c.rect(ML, top - 300, W - ML - MR, 300)
    c.setFillColor(NAVY)
    c.rect(ML, top - 26, W - ML - MR, 26, stroke=0, fill=1)
    c.setFillColor(white)
    c.setFont(FB, 12)
    c.drawString(ML + 10, top - 18, "STRUCTA  ·  HOT ROLLED STEEL PLATE")
    c.drawRightString(W - MR - 10, top - 18, PRODUCT["grade"])
    c.setFillColor(black)
    d.y = top - 40
    d.kv([("Grade / 강종", PRODUCT["grade"]), ("Standard / 규격", PRODUCT["std"]),
          ("Size / 치수", PRODUCT["size"]), ("Heat No. / 제강번호", PRODUCT["heat"]),
          ("Plate No. / 제품번호", PRODUCT["plate"]), ("Net Weight / 중량", PRODUCT["weight_kg"] + " kg"),
          ("Order No.", PRODUCT["order"]), ("Date / 생산일", "2026-09-28")], cols=4, label_w=96, size=8.4, row_h=18)
    c.setFont(FB, 30)
    c.drawString(ML + 12, top - 160, PRODUCT["plate"])
    c.setFont(F, 11)
    c.setFillColor(GREY)
    c.drawString(ML + 12, top - 178, "PLATE No.        HEAT " + PRODUCT["heat"] + "        20 x 2,438 x 12,000 mm")
    c.setFillColor(black)
    c.setStrokeColor(NAVY)
    c.setLineWidth(1.2)
    c.roundRect(W - MR - 210, top - 186, 82, 40, 4)
    c.setFont(FB, 22)
    c.drawCentredString(W - MR - 169, top - 176, "CE")
    c.setFont(F, 6)
    c.drawCentredString(W - MR - 169, top - 184, "2873-CPR-STR-0021")
    c.setStrokeColor(black)
    d.qr("https://id.structasteel.example.kr/01/" + PRODUCT["gtin"] + "/10/" + PRODUCT["heat"] + "/21/" + PRODUCT["plate"],
         W - MR - 110, top - 290, 96)
    d.barcode("(01)" + PRODUCT["gtin"] + "(10)" + PRODUCT["heat"], ML + 12, top - 250, h=34)
    c.setFont(F, 8)
    c.drawString(ML + 12, top - 262, "(01) " + PRODUCT["gtin"] + "  (10) " + PRODUCT["heat"] + "  (21) " + PRODUCT["plate"])
    c.drawString(ML + 12, top - 276, "GTIN " + PRODUCT["gtin"])
    c.setFont(F, 7)
    c.setFillColor(GREY)
    c.drawString(ML + 12, top - 290, "Digital Product Passport: scan QR · https://id.structasteel.example.kr/01/" + PRODUCT["gtin"])
    c.setFillColor(black)
    d.y = top - 320
    d.section("라벨 부착 기준")
    d.para("① 라벨은 후판 상면 끝단에서 300 mm 이내, 압연 방향 우측에 부착한다.\n"
           "② 라벨 재질은 내후성 폴리에스터(옥외 24개월 보증), QR 최소 인쇄 크기 25 x 25 mm.\n"
           "③ 동일 정보가 판면 스텐실 마킹(강종·Heat No.·Plate No.)으로도 표시된다.", size=8)
    d.save()


def build_manual(path):
    """사용설명서 - 후판 취급·보관·가공 안전 정보."""
    doc_no = "UM-STR-PLATE-2026"
    d = Doc(path, doc_no, "Handling & Safety Information " + doc_no, MFR["en"])
    mfr_head(d, "사용설명서 · 취급 및 안전 정보", "PRODUCT INFORMATION & SAFE HANDLING GUIDE  ·  Hot Rolled Steel Plate")
    d.doc_box([("문서번호", doc_no), ("발행일", ISSUE_DATE), ("적용 제품", "S275/S355 계열 열연후판"), ("개정", "Rev.3")])
    d.section("1. 제품 개요")
    d.para(f"본 제품은 {PRODUCT['std']} 에 따른 구조용 열간압연 후판({PRODUCT['grade']})이다. 정규화 압연(+N) 상태로 공급되며 "
           "용접 구조물·교량·조선·산업 설비 부재로 사용된다.", size=8.2)
    d.section("2. 하역 및 운반")
    d.para("• 마그넷 또는 판 클램프를 사용하고, 1매 인양 시 최소 2점 지지한다.\n"
           "• 판 끝단은 날카로우므로 내절단 장갑(EN 388 레벨 C 이상)을 착용한다.\n"
           "• 적재 높이는 1.5 m 이하로 하고 받침목 간격은 2 m 이내로 한다.", size=8.2)
    d.section("3. 보관")
    d.para("• 실내 또는 덮개가 있는 장소에 보관하여 결로·우수에 의한 적청을 방지한다.\n"
           "• 염분·산성 분위기에 장기간 노출하지 않는다. 장기 보관 시 방청유를 도포한다.", size=8.2)
    d.section("4. 가공 시 주의")
    d.grid(["작업", "주의 사항", "권장 조건"],
           [["가스 절단", "절단면 경화층 발생", "예열 불필요 (t ≤ 30 mm)"],
            ["용접", "저수소계 용접재 사용", "예열 50 ℃ 이상 (t > 25 mm)"],
            ["냉간 굽힘", "압연 직각 방향 굽힘 시 균열 주의", "굽힘 반경 ≥ 2.5 t"],
            ["열처리", "정규화 상태 유지", "580 ℃ 초과 응력제거 시 강도 확인"]],
           [18, 46, 36])
    d.section("5. 폐기 및 재활용")
    d.para("본 제품은 100 % 재활용이 가능한 철강재이다. 가공 스크랩은 분리 수거하여 전기로·전로 원료로 재투입한다.", size=8.2)
    d.section("6. 문의")
    d.para(f"{MFR['ko']} 품질보증팀 · {MFR['tel']} · qa@structasteel.example.kr", size=8.2)
    d.save()


def build_tech_file(path):
    """기술문서 - CPR 성능선언/공장생산관리(FPC) 기반 기술문서 요약."""
    doc_no = "TF-STR-S355J2N-2026"
    d = Doc(path, doc_no, "Technical Documentation " + doc_no, MFR["en"])
    mfr_head(d, "기술문서 (Technical File)", "TECHNICAL DOCUMENTATION  ·  ESPR Art.32 / CPR Annex V System 2+")
    d.doc_box([("문서번호", doc_no), ("발행일", ISSUE_DATE), ("제품군", "구조용 열연강재"), ("개정", "Rev.5")])
    d.section("1. 제품 설명 및 의도된 용도")
    d.para(f"{PRODUCT['name']} {PRODUCT['grade']} ({PRODUCT['std']}). 건축물·토목 구조물의 용접·볼트 접합 부재로 사용한다.", size=8.2)
    d.section("2. 필수 특성 (Essential Characteristics)")
    d.grid(["특성", "시험 방법", "선언 성능", "단위"],
           [["항복강도 (ReH, t ≤ 16 mm 기준 355)", "ISO 6892-1", "≥ 345 (16 < t ≤ 40)", "MPa"],
            ["인장강도 (Rm)", "ISO 6892-1", "470 – 630", "MPa"],
            ["연신율 (A)", "ISO 6892-1", "≥ 22", "%"],
            ["충격흡수에너지 (KV, -20 ℃)", "ISO 148-1", "≥ 27", "J"],
            ["탄소당량 (CEV)", "EN 10025-1", "≤ 0.45", "%"],
            ["치수 허용차", "EN 10029", "Class A", "-"],
            ["내구성 (용접성)", "EN 10025-2 7.4", "적합", "-"]],
           [42, 20, 26, 12], align={3: "c"})
    d.section("3. 설계·제조 자료")
    d.grid(["번호", "자료", "보관 위치"],
           [["TF-01", "제강·압연 공정 흐름도 (BF-BOF → 연주 → 후판압연 → 정규화)", "QA 문서관리시스템"],
            ["TF-02", "공장생산관리(FPC) 매뉴얼 Rev.7", "QA 문서관리시스템"],
            ["TF-03", "검사 및 시험 계획 (ITP) PL-S355-07", "생산기술팀"],
            ["TF-04", "위험성 평가 (ISO 12100 준용)", "안전환경팀"],
            ["TF-05", "제강 성적서 " + PRODUCT["mtc"], "첨부 1"]],
           [12, 60, 28])
    d.section("4. 적용 표준 목록")
    d.para("EN 10025-1:2004 · EN 10025-2:2019 · EN 10029:2010 · EN 10163-2 · EN 10204:2004 · ISO 6892-1:2019 · ISO 148-1:2016", size=8.2)
    d.signature(("작성 / Prepared", "한지수", "생산기술팀 선임"), ("승인 / Approved", MFR["signer"], MFR["signer_title"]))
    d.save()


# ═══════════════════════════════════════════════════════════════════════
# 원자재 공급사(한빛자원) 서류 - 협력사 RAW_SUPPLIER
# ═══════════════════════════════════════════════════════════════════════

def sup_head(d, title_ko, title_en):
    d.letterhead(SUPPLIER["ko"], SUPPLIER["en"], SUPPLIER["addr"], f"사업자등록번호 {SUPPLIER['biz']}  ·  Tel {SUPPLIER['tel']}",
                 accent=Color(0.1, 0.42, 0.25))
    d.title(title_ko, title_en)


def build_scrap_proof(path):
    """스크랩 매입 계량증명서 + 재생원료 함유율 확인서."""
    doc_no = "SCR-HB-2609-0412"
    d = Doc(path, doc_no, "Scrap Purchase & Recycled Content Certificate " + doc_no, SUPPLIER["en"])
    sup_head(d, "스크랩 매입 계량증명서 및 재생원료 확인서", "SCRAP PURCHASE WEIGHING CERTIFICATE & RECYCLED CONTENT STATEMENT")
    d.doc_box([("문서번호", doc_no), ("발행일", ISSUE_DATE), ("납품처", MFR["ko"]), ("대상 Heat", PRODUCT["heat"] + ", SH60219")])
    d.section("1. 계량 내역 (Weighbridge Records)")
    d.grid(["일자", "차량번호", "등급", "총중량(kg)", "공차(kg)", "실중량(kg)", "출처"],
           [["2026-09-22", "경북87사1204", "중량A (HMS1)", "38,420", "14,310", "24,110", "포항 야드"],
            ["2026-09-23", "경북87사1204", "중량B (HMS2)", "37,980", "14,300", "23,680", "포항 야드"],
            ["2026-09-24", "경북91아5520", "생철 (New scrap)", "40,150", "15,020", "25,130", "경주 야드"],
            ["2026-09-25", "경북91아5520", "슈레디드", "39,860", "15,040", "24,820", "경주 야드"],
            ["합계", "", "", "", "", "97,740", ""]],
           [13, 15, 17, 13, 11, 13, 13], align={3: "r", 4: "r", 5: "r"})
    d.section("2. 재생원료 함유율 (Recycled Content)")
    d.kv(kv_fields(["RECYCLED_SCRAP_RATE", "SCRAP_SOURCE"]) +
         [("산정 기준", "ISO 14021:2016 7.8 (Pre/Post-consumer 구분)"), ("산정 근거", "전로 장입량 중 스크랩 비율 (Heat 단위 물질수지)")],
         cols=2, label_w=150)
    d.para("위 재생 스크랩 함유율은 대상 Heat 의 전로 장입 원료(용선 + 스크랩) 중 외부 매입 스크랩의 질량 비율이며, "
           "계량증명서 원본은 공급사에 5년간 보관한다.", size=7.8, color=GREY)
    d.section("3. 계량기 검정")
    d.kv([("계량기", "50 t 트럭스케일 (TS-50-HB02)"), ("검정 유효기간", "2027-03-31"),
          ("검정기관", "한국계량측정협회 (가상)"), ("최소 눈금", "10 kg")], cols=4, label_w=86)
    d.signature(("계량 확인 / Weighed by", "오세진", "계량 담당"), (f"공급사 확인 / {SUPPLIER['ko']}", SUPPLIER["signer"], SUPPLIER["signer_title"]),
                stamp="한빛자원")
    d.save()


def build_sds(path):
    """물질안전보건자료(SDS) - 산업안전보건법 / GHS 16항목 서식."""
    doc_no = "SDS-HB-STEEL-003"
    d = Doc(path, doc_no, "Safety Data Sheet " + doc_no, SUPPLIER["en"])
    sup_head(d, "물질안전보건자료 (SDS)", "SAFETY DATA SHEET  ·  GHS Rev.10 / 산업안전보건법 제110조")
    d.doc_box([("문서번호", doc_no), ("발행일", ISSUE_DATE), ("제품명", "철강재 (탄소강 열연후판용 원소재)"), ("개정", "Rev.4")])
    d.section("1. 화학제품과 회사에 관한 정보")
    d.kv([("제품명", "탄소강 (Carbon steel, S355 계열)"), ("권고 용도", "구조용 강재 제조"),
          ("공급자", f"{SUPPLIER['ko']} · {SUPPLIER['addr']}"), ("긴급 연락처", SUPPLIER["tel"])], cols=2, label_w=120)
    d.section("2. 유해성·위험성")
    d.para("GHS 분류: 분류되지 않음 (고체 금속, 통상 취급 조건). 절단·용접 시 발생하는 흄은 금속열·호흡기 자극을 일으킬 수 있다.", size=8)
    d.section("3. 구성성분의 명칭 및 함유량")
    d.grid(["물질명", "CAS 번호", "함유량 (wt%)", "비고"],
           [["철 (Iron)", "7439-89-6", "97.5 – 98.8", "잔부"],
            ["망간 (Manganese)", "7439-96-5", "0.8 – 1.6", ""],
            ["탄소 (Carbon)", "7440-44-0", "0.05 – 0.20", ""],
            ["규소 (Silicon)", "7440-21-3", "≤ 0.55", ""],
            ["구리 (Copper)", "7440-50-8", "≤ 0.55", "잔류원소"]],
           [34, 22, 22, 22], align={1: "c", 2: "c"})
    d.section("4~14. 응급조치 · 폭발·화재 · 누출 · 취급·저장 · 노출방지 · 물리화학적 특성 · 안정성 · 독성 · 환경 · 폐기 · 운송")
    d.para("• 흄 흡입 시 신선한 공기가 있는 곳으로 옮긴다. • 불연성 고체. • 분진 발생 시 국소배기 사용.\n"
           "• 외관: 은회색 고체, 녹는점 약 1,450 ℃, 비중 7.85. • 통상 조건에서 안정. • 수생 환경 유해성 없음.\n"
           "• 폐기: 금속 스크랩으로 재활용. • 운송: 위험물 아님 (UN 번호 해당 없음).", size=7.8)
    d.section("15. 법적 규제 현황 (REACH SVHC · RoHS)")
    d.kv(kv_fields(["SVHC_SUBSTANCE_NAME", "SVHC_CAS_NUMBER", "SVHC_CONCENTRATION_PCT", "SVHC_PRESENCE_IN_COATING",
                    "ROHS_COMPLIANT_STATUS", "HEXAVALENT_CHROMIUM_CR6_PRESENCE"]) +
         [("기준 목록", "ECHA Candidate List (2026-06 갱신, 247종)"), ("판정 기준", "SVHC 0.1 wt% 초과 여부 (REACH Art.33)")],
         cols=2, label_w=170)
    d.section("16. 그 밖의 참고사항")
    d.para(f"작성일 2023-03-15 · 개정일 {ISSUE_DATE} (Rev.4: SVHC 후보목록 갱신 반영)", size=7.8)
    d.signature(("작성 / Prepared", SUPPLIER["signer"], SUPPLIER["signer_title"]), stamp="한빛자원")
    d.save()


# ═══════════════════════════════════════════════════════════════════════
# 시험·인증기관(대한시험인증) 서류 - 협력사 TEST_LAB
# ═══════════════════════════════════════════════════════════════════════

def lab_head(d, title_ko, title_en):
    d.letterhead(LAB["ko"], LAB["en"], LAB["addr"],
                 f"KOLAS 인정번호 {LAB['kolas']}  ·  CBAM 검증기관 {LAB['verifier_no']}  ·  Tel {LAB['tel']}",
                 accent=Color(0.45, 0.12, 0.38))
    d.title(title_ko, title_en)


def build_pcf_report(path):
    """탄소발자국 산정·검증 보고서 - ISO 14067 PCF + CBAM 내재배출량 제3자 검증."""
    doc_no = "DTC-PCF-2610-0412"
    d = Doc(path, doc_no, "Product Carbon Footprint & CBAM Verification Report " + doc_no, LAB["en"])
    lab_head(d, "탄소발자국 산정 및 CBAM 내재배출량 검증 보고서",
             "PRODUCT CARBON FOOTPRINT (ISO 14067) & CBAM EMBEDDED EMISSIONS VERIFICATION REPORT")
    d.doc_box([("문서번호", doc_no), ("발행일", ISSUE_DATE), ("의뢰인", MFR["ko"]), ("검증 수준", "합리적 보증")])
    d.section("1. 검증 개요")
    d.kv([("대상 제품", f"{PRODUCT['name']} {PRODUCT['grade']}"), ("대상 설비", f"{MFR['plant']} ({MFR['inst_id']})"),
          ("기능 단위", "제품 1 t (출하 기준)"), ("시스템 경계", "Cradle-to-gate (A1–A3)"),
          ("검증 기간", "2026-09-29 ~ 2026-10-06 (현장 검증 2026-10-01)"), ("대상 기간", "2026-07-01 ~ 2026-09-30")],
         cols=2, label_w=120)
    d.para("산정 방법론 ISO 14067:2018 · CBAM 집행규정 (EU) 2023/1773 부속서 III · 배경DB ecoinvent 3.10", size=8)
    d.section("2. 산정 결과 (Results)")
    d.kv(kv_fields(["PCF_VALUE", "CBAM_DIRECT_EMISSIONS_TCO2E_PER_T", "CBAM_INDIRECT_EMISSIONS_TCO2E_PER_T",
                    "CBAM_ACTUAL_DATA_USED_RATIO_PCT", "CBAM_DEFAULT_VALUE_USED_RATIO_PCT"]), cols=2, label_w=190)
    d.grid(["구분", "배출원", "배출량 (tCO2e/t)", "비중"],
           [["Scope 1 (직접)", "고로·전로 연료/환원제, 석회 소성", "1.108", "78.0 %"],
            ["Scope 2 (간접)", "구매 전력 (계통)", "0.312", "22.0 %"],
            ["합계", "", "1.420", "100 %"]],
           [22, 44, 20, 14], align={2: "r", 3: "r"})
    d.kpi([("총 탄소발자국 (PCF)", "1420 kgCO2e/t"), ("CBAM 총 내재배출량", "1.420 tCO2e/t"), ("검증 의견", "적정")])
    d.section("3. 전력 및 전구체 (영업비밀 · 비공개 제출 자료 검증 결과)")
    d.kv(kv_fields(["ELECTRICITY_EMISSION_FACTOR_TCO2E_PER_MWH", "ELECTRICITY_SOURCE"]), cols=4, label_w=96)
    d.kv(precursor_rows(), cols=4, label_w=96)
    d.para("위 항목은 의뢰인의 영업비밀로 DPP 에는 실측값 대신 영지식증명 판정(충족 여부)만 공개된다.", size=7.6, color=GREY)
    d.section("4. 검증 의견 (Verification Opinion)")
    d.kv(kv_fields(["CBAM_EMISSIONS_VERIFIED_BY_THIRD_PARTY", "CBAM_VERIFICATION_BODY_NAME", "CBAM_VERIFICATION_REPORT_URL"]) +
         [("검증 기준", "ISO 14064-3:2019 · ISO 14065 인정"), ("중요성 기준", "5 %"), ("검증 의견", "적정 - 중요한 오류 없음")],
         cols=2, label_w=190)
    d.para("검증팀은 위 내재배출량 및 탄소발자국이 중요성 측면에서 적정하게 산정되었다는 합리적 보증 의견을 표명한다.", size=8)
    d.signature(("선임 검증심사원 / Lead Verifier", LAB["signer"], LAB["signer_title"]),
                ("검토 / Independent Reviewer", LAB["reviewer"], LAB["reviewer_title"]), stamp="대한시험인증")
    d.save()


def build_lca_epd(path):
    """환경성적표지(EPD) - EN 15804+A2 / ISO 14025 Type III 요약."""
    doc_no = "EPD-DTC-STR-2026-07"
    d = Doc(path, doc_no, "Environmental Product Declaration " + doc_no, LAB["en"])
    lab_head(d, "환경성적표지 (EPD)", "ENVIRONMENTAL PRODUCT DECLARATION  ·  ISO 14025 · EN 15804:2012+A2:2019")
    d.doc_box([("문서번호", doc_no), ("발행일", ISSUE_DATE), ("유효기간", "2031-10-06"), ("프로그램", "EPD Korea (가상)")])
    d.section("1. 제품 및 선언 정보")
    d.kv([("선언 단위", "열연후판 1 t"), ("대상 제품", f"{PRODUCT['grade']} 후판 (t 8–100 mm)"),
          ("제품범주규칙(PCR)", "PCR 철강 구조재 2023:01 v1.2"), ("검증", "독립 제3자 외부 검증 (ISO 14025 8.1.3)"),
          ("선언 보유자", MFR["ko"]), ("작성·검증", LAB["ko"])], cols=2, label_w=130)
    d.section("2. 환경 영향 (A1–A3, 1 t 당)")
    d.grid(["지표", "단위", "A1", "A2", "A3", "A1–A3"],
           [["GWP-total", "kg CO2 eq", "1,251", "38", "131", "1,420"],
            ["GWP-fossil", "kg CO2 eq", "1,247", "38", "129", "1,414"],
            ["ODP", "kg CFC-11 eq", "2.1E-06", "8.3E-09", "6.0E-07", "2.7E-06"],
            ["AP", "mol H+ eq", "3.92", "0.21", "0.48", "4.61"],
            ["EP-freshwater", "kg P eq", "0.012", "0.0004", "0.003", "0.015"],
            ["PERT", "MJ", "512", "4", "96", "612"]],
           [22, 18, 14, 12, 14, 20], align={2: "r", 3: "r", 4: "r", 5: "r"})
    d.kv(kv_fields(["PCF_VALUE"]) + [("재활용 가능성", "92 %"), ("재생 원료 투입", "21 % (스크랩)")], cols=2, label_w=130)
    d.kpi([("총 탄소발자국 (PCF)", "1420 kgCO2e/t"), ("재활용 가능성", "92 %"), ("모듈 D", "-1,086 kgCO2e/t")])
    d.section("3. 모듈 D (재활용 편익)")
    d.para("수명 종료 후 회수율 95 % 가정 시 모듈 D 의 GWP 편익은 -1,086 kg CO2 eq/t 이다.", size=8)
    d.signature(("EPD 검증인 / Verifier", LAB["signer"], LAB["signer_title"]), stamp="대한시험인증")
    d.save()


def build_test_report(path):
    """시험성적서 - KOLAS(ISO/IEC 17025) 공인시험 성적서."""
    doc_no = "DTC-TR-2610-0331"
    d = Doc(path, doc_no, "Test Report " + doc_no, LAB["en"])
    lab_head(d, "시 험 성 적 서", "TEST REPORT  ·  KOLAS Accredited (ISO/IEC 17025)")
    d.doc_box([("문서번호", doc_no), ("발행일", ISSUE_DATE), ("접수일", "2026-09-30"), ("시험기간", "2026-10-01 ~ 10-05")])
    d.section("1. 의뢰자 및 시료")
    d.kv([("의뢰자", f"{MFR['ko']} ({MFR['addr']})"), ("시료명", f"{PRODUCT['name']} {PRODUCT['grade']}"),
          ("시료 식별", f"Heat {PRODUCT['heat']} / Plate {PRODUCT['plate']} · 두께 20 mm"),
          ("채취 위치", "판 폭 1/4 지점, 압연 직각(T) 방향"), ("시험 목적", "EN 10025-2 적합성 확인 (제3자 입회 시험)")],
         cols=2, label_w=110)
    d.section("2. 시험 결과")
    d.grid(["시험 항목", "시험 방법", "단위", "결과", "기준", "판정"],
           [["항복강도 ReH", "ISO 6892-1:2019 B", "MPa", "381", "≥ 345", "적합"],
            ["인장강도 Rm", "ISO 6892-1:2019 B", "MPa", "527", "470 – 630", "적합"],
            ["연신율 A (L0=5.65√S0)", "ISO 6892-1:2019 B", "%", "27", "≥ 22", "적합"],
            ["샤르피 충격 KV2 (-20 ℃)", "ISO 148-1:2016", "J", "94 / 98 / 96", "평균 ≥ 27", "적합"],
            ["화학성분 C", "ASTM E415-21", "%", "0.161", "≤ 0.20", "적합"],
            ["화학성분 Mn", "ASTM E415-21", "%", "1.41", "≤ 1.60", "적합"],
            ["화학성분 P / S", "ASTM E415-21", "%", "0.014 / 0.004", "≤ 0.025", "적합"],
            ["탄소당량 CEV", "EN 10025-1 계산", "%", "0.41", "≤ 0.45", "적합"]],
           [26, 21, 8, 16, 15, 10], align={2: "c", 3: "c", 4: "c", 5: "c"})
    d.section("3. 종합 판정")
    d.para("종합 판정\n적합 (PASS) - 의뢰 시료는 EN 10025-2:2019 S355J2+N 의 기계적 성질 및 화학성분 요구사항을 만족함.", size=8.4)
    d.para("※ 본 성적서는 의뢰자가 제시한 시료에 한정되며, 전체 로트의 품질을 보증하지 않는다. "
           "본 성적서는 KOLAS 인정 범위 내 시험 결과이며 당 기관의 서면 승인 없이 일부 복제할 수 없다.", size=7.4, color=GREY)
    d.signature(("시험 담당 / Tested by", "윤가람", "선임 연구원"), ("기술책임자 / Approved by", LAB["signer"], LAB["signer_title"]),
                stamp="대한시험인증")
    d.save()


DOCS = [
    ("Q2_06_CBAM_REPORT_승인_수입량초과.pdf", lambda p: build_cbam(p, "62.4", "CBAM-STR-2026Q3-001")),
    ("Q2_06_CBAM_REPORT_승인_수입량미만.pdf", lambda p: build_cbam(p, "38.5", "CBAM-STR-2026Q3-002")),
    ("DOC_COO.pdf", build_coo),
    ("DOC_EU_DOC.pdf", build_eu_doc),
    ("DOC_LABEL.pdf", build_label),
    ("DOC_MANUAL.pdf", build_manual),
    ("DOC_TECH_FILE.pdf", build_tech_file),
    ("DOC_SCRAP_PROOF.pdf", build_scrap_proof),
    ("DOC_SOC_SDS.pdf", build_sds),
    ("DOC_PCF_REPORT.pdf", build_pcf_report),
    ("DOC_LCA_EPD.pdf", build_lca_epd),
    ("DOC_TEST_REPORT.pdf", build_test_report),
]


def build_all(out_dir=OUT_DIR):
    real_style_mill._font()
    os.makedirs(out_dir, exist_ok=True)
    made = []
    for name, fn in DOCS:
        p = os.path.join(out_dir, name)
        fn(p)
        made.append(p)
    return made


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=OUT_DIR)
    args = ap.parse_args()
    for p in build_all(args.out):
        print("생성:", p)


if __name__ == "__main__":
    main()
