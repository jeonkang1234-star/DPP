# 문서 분류 모델 학습

업로드한 칸과 실제 문서가 맞는지 판별하는 모델(`parser/doc_classifier.py`)의 학습 도구.
서비스 이미지에는 결과물 `parser/models/doc_classifier.json`만 들어간다(scikit-learn 불필요).

| 파일 | 하는 일 |
|---|---|
| `labels.py` | 라벨 19종(업로드 칸 코드 18 + 사업자등록증) · 학습용 파일명 → 라벨 규칙 |
| `build_dataset.py` | PDF 폴더 → `(라벨, 텍스트)` jsonl |
| `synthetic_real_style.py` | 실제 제철소 양식(영문 가로표 Mill Test Certificate) 밀시트 텍스트 생성 |
| `train_doc_classifier.py` | TF-IDF + 로지스틱 회귀 학습 · 회사 단위 검증 · JSON 내보내기 |

```bash
pip install scikit-learn pymupdf
python3 parser/training/build_dataset.py docker/document-uploads/demo-bulk docker/mock-documents --out /tmp/ds.jsonl
python3 parser/training/synthetic_real_style.py --out /tmp/real.jsonl
cat /tmp/ds.jsonl /tmp/real.jsonl > /tmp/all.jsonl
python3 parser/training/train_doc_classifier.py /tmp/all.jsonl
python3 -m pytest parser/tests/test_doc_classifier.py
```

2026-10-07 학습 결과: 문서 1,887건(시연용 대량 데이터 1,691 + 목 문서 76 + 실제 양식 밀시트 120),
증강 포함 5,6xx건 · 학습에 안 쓴 회사 문서 검증 정확도 99.7% · 실제 POSCO 밀시트(OCR) → 제강 성적서 99.5%.

판정은 `doc_classifier.check()` - 다른 유형이라고 확신할 때(1순위 ≥ 0.6, 올린 칸 유형 < 0.1)만
`MISMATCH`로 반려하고, 애매하면 통과시킨다. BE는 `ParserClient.requireDocumentType()`으로 호출한다.
