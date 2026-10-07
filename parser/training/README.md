# 문서 분류 모델 학습

업로드한 칸과 실제 문서가 맞는지 판별하는 모델(`parser/doc_classifier.py`)의 학습 도구.
서비스 이미지에는 결과물 `parser/models/doc_classifier.json`만 들어간다(scikit-learn 불필요).

| 파일 | 하는 일 |
|---|---|
| `labels.py` | 라벨 20종(업로드 칸 코드 18 + 사업자등록증 + OTHER) · 학습용 파일명 → 라벨 규칙 |
| `build_dataset.py` | PDF 폴더 → `(라벨, 텍스트)` jsonl |
| `synthetic_real_style.py` | 실제 제철소 양식(영문 가로표 Mill Test Certificate) 밀시트 텍스트 생성 |
| `synthetic_other.py` | DPP 서류가 아닌 문서(이력서·뉴스·청구서·계약서·회의록 등 14장르) 텍스트 생성 → OTHER |
| `train_doc_classifier.py` | TF-IDF + 로지스틱 회귀 학습 · 회사 단위 검증 · JSON 내보내기 |

```bash
pip install scikit-learn pymupdf
python3 parser/training/build_dataset.py docker/document-uploads/demo-bulk docker/mock-documents --out /tmp/ds.jsonl
python3 parser/training/synthetic_real_style.py --out /tmp/real.jsonl
python3 parser/training/synthetic_other.py --out /tmp/other.jsonl
cat /tmp/ds.jsonl /tmp/real.jsonl /tmp/other.jsonl > /tmp/all.jsonl
python3 parser/training/train_doc_classifier.py /tmp/all.jsonl
python3 -m pytest parser/tests/test_doc_classifier.py
```

2026-10-07 학습 결과: 문서 2,787건(시연용 대량 데이터 1,691 + 목 문서 76 + 실제 양식 밀시트 120 +
DPP 서류 아닌 문서 900), 증강 포함 5,544건 · 학습에 안 쓴 회사·문서 검증 정확도 99.8% ·
시연용 데이터 1,767건 전부 맞는 칸에서 통과(최저 확률 0.67) · 실제 POSCO 밀시트(OCR) → 제강 성적서 99.6%.

판정은 `doc_classifier.check()` - **이 칸의 문서라고 확신할 때만 통과**(1순위가 그 칸 유형이고 확률 ≥ 0.4)하고,
다른 서류·DPP 서류가 아닌 문서·글자 없는 파일은 전부 `MISMATCH`로 반려한다. 모델이 모르는 칸만
판단 없이 통과(`UNKNOWN_TYPE`). BE는 `ParserClient.requireDocumentType()`으로 호출하고, 반려 시
사용자에게는 "파일을 잘못 올렸습니다."만 보여준다(무엇으로 판별됐는지는 서버 로그에만).
