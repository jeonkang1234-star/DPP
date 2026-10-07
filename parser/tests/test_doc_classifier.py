# -*- coding: utf-8 -*-
"""문서 분류기(doc_classifier) 회귀 테스트 - 저장소에 있는 목 문서로 돈다.

1) 맞는 칸에 올린 목 문서는 전부 MATCH여야 한다(맞는 문서를 반려하면 안 된다).
2) 다른 칸에 올리면 전부 MISMATCH로 반려돼야 한다.
3) DPP 서류가 아닌 엉뚱한 파일(이력서·뉴스·청구서)·글자 없는 파일도 반려돼야 한다.
4) 실제 제철소 양식(영문 가로표) 밀시트 텍스트도 제강 성적서로 본다.
"""
import glob
import os

import fitz
import pytest

import doc_classifier
from training.labels import label_for_filename

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MOCK_DIR = os.path.join(REPO, "docker", "mock-documents")


def _mock_docs():
    out = []
    for path in sorted(glob.glob(os.path.join(MOCK_DIR, "*", "*.pdf"))):
        label = label_for_filename(os.path.basename(path))
        if label:
            with fitz.open(path) as doc:
                text = "\n".join(p.get_text() for p in doc)
            if text.strip():
                out.append((path, label, text))
    return out


DOCS = _mock_docs()


@pytest.mark.skipif(not DOCS, reason="목 문서 없음")
def test_right_slot_is_match():
    bad = [(os.path.basename(p), doc_classifier.check(t, lab)) for p, lab, t in DOCS
           if doc_classifier.check(t, lab)["verdict"] != "MATCH"]
    assert not bad, bad


@pytest.mark.skipif(not DOCS, reason="목 문서 없음")
def test_wrong_slot_is_mismatch():
    model = doc_classifier.get_model()
    passed = []
    for path, lab, text in DOCS:
        for slot in model.classes:
            if slot in (lab, "BIZ_REG_CERT", "OTHER"):
                continue
            if doc_classifier.check(text, slot)["verdict"] != "MISMATCH":
                passed.append((os.path.basename(path), slot))
    assert not passed, passed


UNRELATED = {
    "news": "서울시는 7일 내년도 예산안을 발표했다. 시장은 기자회견에서 복지 예산을 늘리고 교통 인프라에 "
            "투자하겠다고 밝혔다. 야당은 재정 건전성을 우려했다. 시민단체는 환영 입장을 냈다.",
    "resume": "이력서 성명 홍길동 학력 한국공학대학교 컴퓨터공학과 경력 인턴십 프로젝트 자기소개 저는 성실하고 "
              "책임감 있는 사람입니다 자격증 정보처리기사 토익 900 지원동기 입사 후 포부",
    "invoice": "INVOICE Invoice No 2026-114 Bill To ABC Corp Description Qty Unit Price Amount Consulting "
               "services 10 100 1000 Subtotal Tax Total Due Payment terms Net 30 bank transfer",
}


@pytest.mark.parametrize("name", sorted(UNRELATED))
def test_unrelated_file_is_rejected(name):
    for slot in ("MILL_SHEET", "TECH_FILE", "SOC_SDS", "COO", "CARE_LABEL"):
        r = doc_classifier.check(UNRELATED[name], slot)
        assert r["verdict"] == "MISMATCH", (name, slot, r)


REAL_STYLE_MILL = """Mill Test Certificate
検査証明書
Order No. :
PO No. :
Supplier :
Commodity : HOT ROLLED COIL
Customer :
Spec & Type : JS-SPHT1
Size Product No. Quantity Weight Heat No. Country of Melt & Pour Position Tensile Test YP TS EL Bend Test Division Chemical Composition C Si Mn P S
2.95x925xC 1 18,720 KOR B 228 352 45 Good L 0.0381 0.002 0.167 0.0108 0.0050
2.95x925xC 1 18,920 KOR B 228 352 45 Good L 0.0381 0.002 0.167 0.0108 0.0050
*** Grand Total *** 4 75,540(kg)
* Position - T : Top, M : Middle, B : Bottom
* Tensile Test. Direction : Longitudinal, Gauge Length : 50 mm(Rectangular)
We certify that the material has been made in accordance with the order and is in compliance.
Test Certificate is issued according to ISO 10474/EN 10204 3.1.
"""


def test_real_style_mill_sheet():
    assert doc_classifier.check(REAL_STYLE_MILL, "MILL_SHEET")["verdict"] == "MATCH"
    assert doc_classifier.check(REAL_STYLE_MILL, "SOC_SDS")["verdict"] == "MISMATCH"


def test_too_little_text_is_rejected():
    r = doc_classifier.check("hello", "MILL_SHEET")
    assert r["verdict"] == "MISMATCH" and r["reason"] == "NO_TEXT"


def test_unknown_slot_passes():
    assert doc_classifier.check(REAL_STYLE_MILL, "SOMETHING_NEW")["verdict"] == "UNKNOWN_TYPE"
