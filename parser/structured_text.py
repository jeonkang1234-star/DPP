# -*- coding: utf-8 -*-
"""구조 인식 텍스트 보강 - 표(table) 추출 + 스캔본 OCR 폴백.

■ 왜 필요한가
기존 파서는 page.get_text() 한 줄씩을 훑어 '라벨: 값' 꼴만 잡았다(spec_extractor.py). 그래서
  1) 표 안에 들어 있는 항목(라벨 칸 | 값 칸)은 셀이 줄바꿈으로 쪼개져 통째로 놓치고,
  2) 스캔본/이미지 PDF는 텍스트가 없어 422로 실패했다.
이 모듈이 그 두 구멍을 메운다. 새 모델 학습이나 무거운 의존성 없이 PyMuPDF(이미 사용 중)의
표 검출(find_tables)과 OCR(tesseract, 이미 이미지에 설치됨)만 쓴다.

■ 지켜야 할 원칙
- 여기서 만든 텍스트는 "후보"일 뿐이다. 값은 그대로 spec_extractor의 세 관문(어휘/형태/타입)을
  통과해야 채워진다 - 표에서 뽑았다고 검증을 건너뛰지 않는다.
- 문서 해시(text_sha256)는 기존과 같이 page.get_text() 원문으로만 계산한다. 표/OCR 결과를
  섞으면 이미 올라간 문서의 해시(체인 앵커, 중복 방지 키)가 달라진다. 단, 원문이 아예 없는
  스캔본은 OCR 텍스트가 원문 역할을 한다.
"""
import os
import re

import fitz

_WS = re.compile(r"\s+")


def _cell(v) -> str:
    if v is None:
        return ""
    return _WS.sub(" ", str(v)).strip()


def table_lines(doc) -> list:
    """모든 페이지의 표를 '라벨: 값' 줄로 펼친다.

    - 2열 표(라벨 | 값): 각 행이 '라벨: 값'.
    - 3열 이상이고 첫 행이 머리글인 표: 머리글이 열 이름이다. 각 데이터 행의 첫 칸을 행 이름으로 두고
      '열이름: 값' 줄을 만든다(가로형 성분표 - C | Mn | P ... / 0.18 | 1.2 | 0.02).
    - 라벨 칸이 짝수 칸마다 반복되는 4열 표(라벨 | 값 | 라벨 | 값): 두 쌍으로 나눈다.
    """
    lines = []
    for page in doc:
        try:
            found = page.find_tables()
        except Exception:
            continue
        for table in found.tables:
            try:
                rows = [[_cell(c) for c in r] for r in table.extract()]
            except Exception:
                continue
            rows = [r for r in rows if any(r)]
            if not rows:
                continue
            width = max(len(r) for r in rows)
            if width == 2:
                for r in rows:
                    if r[0] and len(r) > 1 and r[1]:
                        lines.append(f"{r[0]}: {r[1]}")
            elif width == 4 and all(len(r) == 4 for r in rows):
                for r in rows:
                    for a, b in ((0, 1), (2, 3)):
                        if r[a] and r[b]:
                            lines.append(f"{r[a]}: {r[b]}")
            elif width >= 3 and len(rows) >= 2:
                header = rows[0]
                for r in rows[1:]:
                    for i, name in enumerate(header):
                        if i < len(r) and name and r[i]:
                            lines.append(f"{name}: {r[i]}")
    return lines


def _find_tessdata():
    """PyMuPDF OCR은 TESSDATA_PREFIX가 없으면 'No OCR support'로 죽는다. apt로 깐 tesseract는
    이 변수를 안 세팅하므로 흔한 경로에서 찾아 tessdata= 인자로 직접 넘긴다."""
    if os.environ.get("TESSDATA_PREFIX"):
        return os.environ["TESSDATA_PREFIX"]
    for base in ("/usr/share/tesseract-ocr", "/usr/share/tessdata", "/usr/local/share/tessdata"):
        if os.path.isdir(base):
            subs = sorted(os.listdir(base), reverse=True)
            for cand in [base] + [os.path.join(base, x) for x in subs]:
                td = os.path.join(cand, "tessdata")
                if os.path.exists(os.path.join(td, "eng.traineddata")):
                    return td
                if os.path.exists(os.path.join(cand, "eng.traineddata")):
                    return cand


def ocr_text(doc) -> str:
    """텍스트 레이어가 없는(스캔본) PDF를 tesseract로 읽는다. 실패하면 빈 문자열.

    PARSER_OCR_LANG(기본 kor+eng), PARSER_OCR_DPI(기본 200)로 조절한다. tesseract 한국어
    학습데이터는 parser/Dockerfile에서 이미 설치한다(tesseract-ocr-kor).
    """
    tessdata = _find_tessdata()
    lang = os.environ.get("PARSER_OCR_LANG", "kor+eng")
    dpi = int(os.environ.get("PARSER_OCR_DPI", "200"))
    parts = []
    for page in doc:
        try:
            tp = page.get_textpage_ocr(language=lang, dpi=dpi, full=True, tessdata=tessdata)
            parts.append(page.get_text(textpage=tp))
        except Exception:
            return ""
    return "\n".join(parts)
