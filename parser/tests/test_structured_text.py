# -*- coding: utf-8 -*-
"""structured_text(표 펼치기 + OCR 폴백) 테스트. 목데이터 없이 PDF를 즉석에서 만든다."""
import os
import sys

import fitz
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import structured_text  # noqa: E402


def _cjk_font_path():
    for p in ("/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
              "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
              "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc"):
        if os.path.exists(p):
            return p
    return None


def _table_pdf(rows, col_w=140, row_h=28):
    doc = fitz.open()
    page = doc.new_page()
    x0, y0 = 50, 60
    for ri, row in enumerate(rows):
        for ci, text in enumerate(row):
            rect = fitz.Rect(x0 + ci * col_w, y0 + ri * row_h, x0 + (ci + 1) * col_w, y0 + (ri + 1) * row_h)
            page.draw_rect(rect, color=(0, 0, 0), width=0.8)
            page.insert_textbox(rect + (4, 4, -4, -2), text, fontsize=10, fontname="helv")
    return doc


def test_two_column_table_becomes_label_value_lines():
    doc = _table_pdf([["Manufacturer", "Gaon Steel"], ["Heat No", "H12345"]])
    lines = structured_text.table_lines(doc)
    assert "Manufacturer: Gaon Steel" in lines
    assert "Heat No: H12345" in lines


def test_horizontal_table_uses_header_as_label():
    doc = _table_pdf([["C", "Mn", "P"], ["0.18", "1.20", "0.02"]])
    lines = structured_text.table_lines(doc)
    assert "C: 0.18" in lines and "Mn: 1.20" in lines and "P: 0.02" in lines


def test_no_tables_returns_empty():
    doc = fitz.open()
    doc.new_page().insert_text((72, 72), "plain text only")
    assert structured_text.table_lines(doc) == []


@pytest.mark.skipif(not os.path.exists("/usr/bin/tesseract") and not os.path.exists("/usr/local/bin/tesseract"),
                    reason="tesseract 미설치")
def test_ocr_reads_scanned_pdf():
    src = fitz.open()
    src.new_page().insert_text((72, 100), "Heat Number H987654", fontsize=28)
    pix = src[0].get_pixmap(dpi=200)
    scanned = fitz.open()
    pg = scanned.new_page(width=src[0].rect.width, height=src[0].rect.height)
    pg.insert_image(pg.rect, pixmap=pix)
    assert scanned[0].get_text().strip() == ""
    os.environ["PARSER_OCR_LANG"] = "eng"
    text = structured_text.ocr_text(scanned)
    assert "H987654" in text
