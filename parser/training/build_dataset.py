# -*- coding: utf-8 -*-
"""문서 분류기 학습 데이터 만들기 - PDF 폴더들을 훑어 (라벨, 텍스트) jsonl로 뽑는다.

라벨은 파일명으로 붙인다(학습 데이터를 만들 때만 - 서비스에서는 파일명을 보지 않는다).
  - 시연용 대량 데이터 docker/document-uploads/demo-bulk/<회사>/<모델>_<문서명>.pdf
  - 목 문서 docker/mock-documents/<도메인>/{Q2_05_..., DOC_<유형>.pdf, 루멘셀_...}
  - 가입 서류 docker/mock-documents/signup/사업자등록증_*.pdf  → BIZ_REG_CERT(엉뚱한 서류 반려용)

사용법:
    python3 parser/training/build_dataset.py <pdf 폴더> [<pdf 폴더> ...] --out dataset.jsonl
"""
import argparse
import json
import os
import sys

import fitz  # PyMuPDF

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from training.labels import label_for_filename  # noqa: E402


def pdf_text(path: str) -> str:
    with fitz.open(path) as doc:
        return "\n".join(page.get_text() for page in doc)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dirs", nargs="+")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    n, skipped = 0, 0
    counts = {}
    with open(args.out, "w", encoding="utf-8") as out:
        for d in args.dirs:
            for root, _, files in os.walk(d):
                for name in sorted(files):
                    if not name.lower().endswith(".pdf"):
                        continue
                    label = label_for_filename(name)
                    if not label:
                        skipped += 1
                        continue
                    text = pdf_text(os.path.join(root, name))
                    if len(text.strip()) < 50:
                        skipped += 1
                        continue
                    out.write(json.dumps({"label": label, "source": os.path.join(root, name), "text": text},
                                         ensure_ascii=False) + "\n")
                    counts[label] = counts.get(label, 0) + 1
                    n += 1
    print(f"{n}건 저장, {skipped}건 제외(라벨 없음/텍스트 없음)")
    for k in sorted(counts):
        print(f"  {k:24s} {counts[k]}")


if __name__ == "__main__":
    main()
