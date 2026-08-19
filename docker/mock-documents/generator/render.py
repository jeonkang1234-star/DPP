# -*- coding: utf-8 -*-
"""PDF 렌더링 원시 도구.

■ 왜 이렇게 나눠 그리는가 (중요)
PyMuPDF는 같은 y에 x를 벌려 그린 문자열들을 **각각 별도의 줄**로 추출한다. 이 성질이
parser/extractor.py의 표 파싱 방식(줄 단위 오프셋 - '원소 다음 줄이 측정값, 그 다음 줄이
규격 한계')의 전제다. 그래서 여기서는 두 가지를 엄격히 구분한다.

  line(text)  : drawString 한 번 -> 추출 시 한 줄. 라벨과 값이 같은 줄에 있어야 하는
                곳(부속서의 '라벨 : 값')에 쓴다.
  row(cells)  : 같은 y에 여러 번 drawString -> 추출 시 셀 개수만큼의 줄. 화학성분표처럼
                파서가 줄 오프셋으로 읽는 표에 쓴다.

둘을 섞어 쓰면 안 되는 이유가 실제로 있다. 부속서를 row()로 그리면 '충전재 혼용률'과
'0 %'가 서로 다른 줄이 되는데, 그러면 (1) spec_extractor는 라벨과 값이 한 줄에 있어야
매칭하므로 아무것도 못 뽑고 (2) 케어라벨의 섬유조성 파서는 '짧은 라벨 다음 줄에 N %'를
섬유 항목으로 오인해서 없는 섬유를 만들어낸다. 그래서 부속서는 반드시 line()이다.

■ 폰트
한글 글리프가 실제로 임베드된 TrueType(glyf) 폰트가 필요하다. 2026-08-16에 한 번
데인 적이 있는데, reportlab의 UnicodeCIDFont는 폰트를 임베드하지 않고 '표준 CJK 폰트
참조'만 남겨서 운영 고정 버전(PyMuPDF 1.24.9)이 텍스트를 단어 중간에 공백이 끼는 형태로
깨뜨렸다. 로컬 최신 PyMuPDF에서는 재현되지 않아 처음엔 못 잡았다. 반드시 TTFont로 등록한
실제 .ttf 를 쓴다.
"""
import os

from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

# 배포판마다 경로가 달라서 후보를 훑는다. 전부 없으면 어떤 패키지를 깔면 되는지 알려준다.
FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
    "/usr/share/fonts/truetype/nanum/NanumBarunGothic.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansKR-Regular.ttf",
    "/Library/Fonts/AppleGothic.ttf",
    "C:/Windows/Fonts/malgun.ttf",
]
FONT_CANDIDATES_BOLD = [
    "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf",
    "/usr/share/fonts/truetype/nanum/NanumBarunGothicBold.ttf",
    "C:/Windows/Fonts/malgunbd.ttf",
]

FONT = "MockKR"
FONT_BOLD = "MockKR-Bold"

PAGE_W, PAGE_H = A4
MARGIN_X = 42
TOP_Y = PAGE_H - 52
BOTTOM_Y = 58


def _pick(paths):
    for p in paths:
        if os.path.exists(p):
            return p
    return None


def register_fonts():
    regular = _pick(FONT_CANDIDATES)
    if regular is None:
        raise SystemExit(
            "한글 TrueType 폰트를 찾지 못했습니다.\n"
            "  Debian/Ubuntu : sudo apt-get install -y fonts-nanum\n"
            "  macOS         : 시스템 기본 AppleGothic 사용\n"
            "찾아본 경로: " + ", ".join(FONT_CANDIDATES)
        )
    pdfmetrics.registerFont(TTFont(FONT, regular))
    bold = _pick(FONT_CANDIDATES_BOLD) or regular
    pdfmetrics.registerFont(TTFont(FONT_BOLD, bold))
    return regular, bold


class Doc:
    """세로로 흘려 쓰는 아주 단순한 렌더러. 페이지가 넘치면 자동으로 넘긴다."""

    def __init__(self, path):
        self.c = canvas.Canvas(path, pagesize=A4)
        self.y = TOP_Y
        self._page_started = False

    # ── 원시 출력 ────────────────────────────────────────────────────
    def _ensure_space(self, need=0):
        if self.y - need < BOTTOM_Y:
            self.c.showPage()
            self.y = TOP_Y

    def line(self, text, size=9.5, bold=False, gap=13, color=(0, 0, 0), indent=0):
        """한 줄 = drawString 한 번. 추출했을 때도 한 줄이다."""
        self._ensure_space(gap)
        self.c.setFont(FONT_BOLD if bold else FONT, size)
        self.c.setFillColorRGB(*color)
        self.c.drawString(MARGIN_X + indent, self.y, text)
        self.y -= gap

    def row(self, cells, size=9.5, bold=False, gap=13, color=(0, 0, 0)):
        """같은 y에 여러 셀. 추출하면 셀마다 한 줄씩 나온다(파서가 이 성질에 의존한다).
        cells = [(x_offset, text), ...]"""
        self._ensure_space(gap)
        self.c.setFont(FONT_BOLD if bold else FONT, size)
        self.c.setFillColorRGB(*color)
        for x, text in cells:
            self.c.drawString(MARGIN_X + x, self.y, str(text))
        self.y -= gap

    def rule(self, gap=8, color=(0.72, 0.75, 0.80)):
        self._ensure_space(gap)
        self.c.setStrokeColorRGB(*color)
        self.c.setLineWidth(0.5)
        self.c.line(MARGIN_X, self.y + 4, PAGE_W - MARGIN_X, self.y + 4)
        self.y -= gap

    def band(self, text, size=10, gap=18):
        """옅은 배경의 소제목 띠. 텍스트는 line()과 동일하게 한 줄이다."""
        self._ensure_space(gap)
        self.c.setFillColorRGB(0.93, 0.95, 0.98)
        self.c.rect(MARGIN_X - 4, self.y - 4, PAGE_W - 2 * MARGIN_X + 8, gap - 2, stroke=0, fill=1)
        self.c.setFillColorRGB(0.05, 0.11, 0.20)
        self.c.setFont(FONT_BOLD, size)
        self.c.drawString(MARGIN_X, self.y, text)
        self.y -= gap

    def space(self, gap=8):
        self.y -= gap

    def pad(self, label, width_pt=190, size=9.5):
        """라벨 뒤를 공백으로 채워 값 열(콜론)을 세로로 맞춘다.

        라벨과 값을 drawString 두 번으로 나눠 그리면 추출 시 두 줄로 쪼개져서
        라벨 사전 파서가 아무것도 못 뽑는다(클래스 주석 참고). 그래서 한 줄을 유지한 채
        공백으로 민다 - size는 실제로 그릴 때 쓰는 글자 크기와 반드시 같아야 한다.
        다르면 폭 계산이 어긋나서 콜론이 들쭉날쭉해진다."""
        space_w = pdfmetrics.stringWidth(" ", FONT, size)
        cur = pdfmetrics.stringWidth(label, FONT, size)
        n = max(1, int(round((width_pt - cur) / space_w)))
        return label + " " * n

    def save(self):
        self.c.save()
