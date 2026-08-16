# 도메인별 Pass/Fail 목데이터

기존 `노 고정`/`데 고정`/`디 고정`/`디, 데 고정` 폴더의 10건 합본 PDF 대신, 화면에서
**한 건씩 업로드해서 승인/반려를 바로 테스트**할 수 있도록 만든 개별 PDF 세트다.
`parser/extractor.py` 정규식과 BE `zkp/*.java` 임계값을 그대로 재현해서, 파일명이
PASS/FAIL로 표시된 문서는 실제로 업로드하면 그 판정이 나온다 (`verify.py`로 검증 완료).

내용은 기존 목데이터 스타일(회사명·문서번호·발행일 등)을 그대로 참고했고, 작업 자체는
원본 폴더가 아니라 이 새 폴더에서 했다.

## 사용법

각 도메인 폴더에서 파일 하나씩 골라 해당 업로드 슬롯에 넣으면 된다. 파일명에 PASS/FAIL이
없는 건 ZKP 판정 대상이 아닌 문서(형식만 갖추면 업로드 즉시 무조건 승인)라 1건씩만 있다.

### steel/ (16개)
- `Q2_05_MILL_SHEET_PASS_1/2.pdf`, `FAIL_1(탄소초과)/2(인장강도초과).pdf` — 제강성적서.
  화학성분 8개(C/Si/Mn/P/S/N/Cu/CEV) + 기계성질 4개(ReH/Rm/A/KV) 전부 규격 이내여야 승인.
- `Q2_06_CBAM_REPORT_승인_수입량초과/미만.pdf` — CBAM은 de minimis(50t) 초과 여부가
  **정보성 플래그**라 항상 승인이다(반려 케이스 자체가 존재하지 않음) - 그래서 PASS/FAIL이
  아니라 두 가지 수입량 상태(초과/미만)로만 구분했다.
- `DOC_*.pdf` 10종 - 비-ZKP 문서, 1건씩.

### textile/ (18개)
- `Q1_04_CARE_LABEL_PASS_1/2.pdf`, `FAIL_1(합계90)/2(합계110).pdf` — 섬유 혼용률 합계가
  100%±0.5%p 안이어야 승인.
- `Q3_10_OEKOTEX_LABEL_PASS_1/2.pdf`, `FAIL_1(pH초과)/2(pH미달).pdf` — pH 4.0~7.5 범위여야 승인.
- `DOC_GRS_CERTIFICATE.pdf` + `DOC_*.pdf` 9종(COMMON) - 비-ZKP 문서, 1건씩.

### battery/ (18개)
- `Q2_07_BATTERY_CARBON_PASS_1/2.pdf`, `FAIL_1(Co미달)/2(Pb미달).pdf` — 재생원료
  Co≥16.0% / Li≥6.0% / Ni≥6.0% / Pb≥85.0%(단 Pb=0%면 적용제외) 전부 충족해야 승인.
- `Q4_15_RECYCLING_REPORT_PASS_1/2.pdf`, `FAIL_1(리튬코발트미달)/2(구리미달).pdf` — 구리
  회수율≥90.0% AND 리튬코발트산화물 회수율≥90.0% 이어야 승인.
- `DOC_DUE_DILIGENCE_REPORT.pdf` + `DOC_*.pdf` 9종(COMMON) - 비-ZKP 문서, 1건씩.

## 알려진 이슈 (해결됨, 2026-08-16)

처음 만든 버전은 배터리 PDF를 실제로 업로드하면 "텍스트를 추출하지 못했습니다"로
실패했다. 원인은 reportlab이 한글 폰트를 PDF에 실제로 임베드하지 않고 "표준 CJK
폰트 참조"만 남기는 방식(UnicodeCIDFont)을 썼는데, `parser/requirements.txt`에 고정된
운영 버전(PyMuPDF==1.24.9)이 이걸 잘못 해석해서 단어 중간에 공백이 끼어드는 형태로
텍스트를 깨뜨렸기 때문이다(로컬 최신 PyMuPDF에서는 재현되지 않아서 처음엔 놓쳤음).
지금 폴더의 파일들은 폰트를 실제로 PDF에 임베드하도록 고쳐서(TTFont + glyf 아웃라인)
동일한 PyMuPDF 1.24.9로 재검증 완료했다 - 다시 이런 문제가 생기면 없다.

## 재생성/검증

`build.py`가 전체 52개를 생성하고, `verify.py`(ZKP 판정 재현) / `verify_all.py`(공통 필드+
보너스 확장필드)가 실제 파서 로직(`parser/extractor.py`)으로 재검증한다. 스크립트 자체는
이 폴더에 포함하지 않았고, 문서 내용/임계값을 바꾸고 싶으면 다시 요청하면 된다.
