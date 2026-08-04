# DPP 문서 파싱 테스트

목표: 블록체인 해싱 → ZKP로 이어지기 전에, **23종 × 10건 = 230개 목데이터 PDF가 안정적으로 파싱되는지** 검증.

> **이 폴더는 별도 목데이터 검증 워크스페이스(`새 폴더`)에서 옮겨진 코드입니다.**
> 230개 목데이터 PDF 원본(노 고정/데 고정/디 고정/디, 데 고정)은 용량 문제로 이 저장소에는
> 안 옮겼고, 가벼운 스모크테스트용 샘플 3개만 `sample_docs/`에 있습니다. `tests/`의 pytest
> 스위트(134개)는 그 230개 PDF가 있어야 전부 도는데, 여기선 못 찾으면 PDF 관련 테스트만
> 자동 skip되고 레지스트리/해셔 같은 순수 로직 테스트만 돕니다. 전체 스위트를 여기서 돌리려면
> 환경변수로 원본 위치를 알려주면 됩니다:
> ```bash
> export DPP_MOCK_DATA_DIR="/path/to/새 폴더"
> pytest tests/ -v
> ```

## 설치

```bash
pip install -r requirements.txt
```

(참고: QR 디코딩은 OpenCV 내장 `QRCodeDetector`만 사용해서 `zbar` 같은 외부 시스템 라이브러리 설치가 필요 없습니다.)

## 실행

```bash
python main.py "새 폴더" "output"
```

`새 폴더` 아래 하위 폴더(노 고정 / 데 고정 / 디 고정 / 디, 데 고정 등)를 재귀적으로 훑어서 PDF를 전부 찾고, `output/`에 문서유형 코드별 JSON 파일과 커버리지 리포트를 만듭니다. 230건 QR 디코딩까지 포함하면 1~2분 정도 걸립니다.

## 실제 테스트 결과 (2026-07-31 재실행, 확장 필드 포함)

```
총 PDF 파일: 23개 / 레지스트리 종류: 23개
분류 매칭된 종류: 23개 / 미매칭: 0개
총 생성된 문서 인스턴스: 230개 (기대: 230개)
```

23종 전부 파일명으로 정확히 분류됐고, 230개 문서 인스턴스로 정확히 분할됐고, `document_id`/`mock_id`는 230건 전부 추출 성공. `DPP: doc_type=...` 내부 주석은 6개 문서 유형(원래 그 주석이 있는 유형만)에서, QR코드는 2개 유형(EU 에너지라벨, 라벨/데이터캐리어)에서 정상 디코딩됨.

여기에 더해 2단계 확장 필드(`sustainability_metrics`/`numbered_sections`/타입별 전용 필드)도 230건 전체에 재실행해서 검증함. 유형별 상세는 `sample_output/_coverage_report.txt` 참고, 각 필드가 뭘 뽑는지는 아래 "확장 필드" 섹션 참고.

## 파이프라인 구조

1. **registry.py** — 23종 문서 타입 메타데이터(코드, 이름, 4분면, 디자인/데이터 고정 여부)와 파일명 매칭 규칙
2. **splitter.py** — 합본 PDF(문서 10건이 이어붙은 파일)를 개별 문서로 분할. 1순위로 "총 페이지 수 ÷ 10"이 정확히 나누어떨어지는 균등분할을 쓰고, 문서 하단의 "1 / 2" 같은 쪽번호 패턴으로 교차검증. 균등분할이 안 되는 예외 상황에 대비해 쪽번호 기반 분할과 폴백 로직도 있음
3. **extractor.py** — 공통 메타데이터(문서번호/발행일/사업자번호/EORI/GTIN) + `DPP: doc_type=...` 설계 주석 + 2단계 확장 필드(지속가능성 지표/번호매김 섹션/타입별 전용 필드)를 정규식으로 추출
4. **qr.py** — 페이지를 이미지로 렌더링해 QR코드 디코딩 (라벨류 문서용)
5. **hasher.py** — 공백/줄바꿈을 정규화한 텍스트 기준 SHA-256 계산. 다음 단계(블록체인 앵커링)에서 이 해시를 그대로 쓸 수 있게 설계
6. **pipeline.py** — 위 전부를 엮어서 폴더 전체 처리 + 커버리지 리포트 생성
7. **main.py** — CLI 진입점

## 출력 형식 (문서 1건당)

```json
{
  "source_file": "Q1_02_EU에너지라벨_10건.pdf",
  "registry_code": "Q1_02",
  "doc_type_name": "EU 에너지라벨",
  "doc_type_slug": "energy_label",
  "quadrant": "Q1",
  "design_fixed": true,
  "data_fixed": true,
  "instance_index": 1,
  "page_range": [1, 1],
  "document_id": "100000",
  "mock_id": "ELBL-FRIDGE-2025-001",
  "issue_date": null,
  "biz_reg_no": null,
  "eori": null,
  "gtin": "08806091000133",
  "dpp_annotation": null,
  "sustainability_metrics": {
    "recyclability_percent": null,
    "recycled_content_percent": null,
    "recycled_content_weighted_avg_percent": null,
    "repairability_grade": null,
    "total_carbon_footprint_kg_co2e": null,
    "overall_recycling_rate_percent": null,
    "energy_efficiency_grade": "D",
    "carbon_performance_class": null,
    "overall_judgement": null
  },
  "numbered_sections": {},
  "qr_payloads": ["https://eprel.ec.europa.eu/qr/100000"],
  "raw_text": "...전체 텍스트...",
  "text_sha256": "..."
}
```

`registry_code`가 `Q1_03`(GRS 거래증명서)이면 `grs_boxes` 필드가, `Q1_04`(섬유 케어라벨)이면 `fiber_composition` 필드가 위 딕셔너리에 추가로 붙는다 (`extractor.TYPE_SPECIFIC_EXTRACTORS` 참고).

## HTTP 서비스로 실행 (Spring Boot BE 연동용)

`main.py`는 목데이터 배치 테스트용 CLI고, 실제 서비스에서 BE가 업로드된 문서 1건을 파싱시킬 땐 `api.py`(FastAPI)를 씁니다.

```bash
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

엔드포인트 3개:

- `GET /health` — 헬스체크
- `GET /registry` — 지원하는 23종 문서유형 목록 (code/name_kr/quadrant/design_fixed/data_fixed). 업로드 UI 드롭다운용
- `POST /parse` — multipart form: `file`(PDF), `registry_code`(예: `Q1_02`), `include_raw_text`(선택, 기본 false)

`/parse` 응답 예시 (실제 테스트한 결과):

```json
{
  "source_filename": "test_single_doc.pdf",
  "registry_code": "Q1_02",
  "doc_type_name": "EU 에너지라벨",
  "doc_type_slug": "energy_label",
  "quadrant": "Q1",
  "design_fixed": true,
  "data_fixed": true,
  "page_count": 1,
  "document_id": "100000",
  "mock_id": "ELBL-FRIDGE-2025-001",
  "issue_date": null,
  "biz_reg_no": null,
  "eori": null,
  "gtin": "08806091000133",
  "dpp_annotation": null,
  "qr_payloads": ["https://eprel.ec.europa.eu/qr/100000"],
  "text_sha256": "87986c2351124b8317b27b80e4b2a89b8c5b725753ed9b9f72b0dd8157fed726"
}
```

에러 처리도 확인함: 잘못된 `registry_code` → `400`, 텍스트 추출 안 되는(손상되거나 이미지뿐인) PDF → `422`.

`include_raw_text=false`가 기본값인 이유 — 응답에 문서 원문 전체가 실려나가는 걸 기본으로 막아둔 것. BE에서 원문이 필요 없고 구조화된 필드 + 해시만 쓸 거면 그대로 두면 됨.

`Dockerfile`도 만들어놨어서, 나중에 `docker/docker-compose.yml`에 `postgres`/`backend`/`frontend`처럼 네 번째 서비스로 추가하면 BE가 내부 도커 네트워크로 `http://parser:8000`에 바로 호출할 수 있음 (아직 compose엔 안 넣었음 - 필요하면 추가).

## 확장 필드 (2단계 - 2026-07-31 추가)

공통 필드 이후에 `extractor.extract_extended_fields(registry_code, text)`가 붙이는 필드들. **원칙: 모든 필드를 다 뽑는 게 아니라, 뽑히면 확실히 맞는 것만 뽑는다.** 처음에 "라벨/값을 통째로 다 페어링하는" 범용 휴리스틱을 시도했다가 표나 줄바꿈 섞인 실제 문서에서 그럴듯하지만 틀린 값을 뽑아내는 문제가 있어서 폐기하고, 23종 원문을 직접 읽고 검증된 정규식 패턴만 남겼다. 안 뽑히는 항목은 `null`/`{}`/`[]`로 조용히 빠진다.

- **`sustainability_metrics`** — 23종을 가로지르는 헤드라인 지표 9개(재활용가능성 %, 재생함량 %, 수리가능성 등급, 탄소발자국, 종합재활용율, 에너지효율 등급, 탄소성능등급, 종합판정 등). 실제 검증된 유형: `Q1_02`(에너지등급 D), `Q2_01`(SDS), `Q2_02`(DoC), `Q2_03`(EPD), `Q2_04`(시험성적서), `Q2_05`(제강성적서), `Q2_06`(CBAM), `Q2_07`(PCF), `Q2_08`(재생함량인증서), `Q3_07`(라벨), `Q4_05`(기술문서), `Q4_06`(사용설명서), `Q4_13`~`Q4_16`(재활용/재생 관련 4종) — 총 230건 중 126건에서 1개 이상 지표 검출.
- **`numbered_sections`** — "1. 화학제품과 회사에 관한 정보" 처럼 번호 붙은 섹션이 있는 문서에서 섹션 번호 → `{title, body}`. `Q2_01`(SDS, 16개 섹션 전부 검증 완료), `Q4_05`(기술문서), `Q4_11`(공급망실사보고서) 3개 유형, 30건 전부에서 검출. `Q2_02`(DoC)는 조항이 번호 뒤에 마침표 없이 나열돼서 이 패턴으로는 안 잡힘(아래 한계 참고).
- **`grs_boxes`** (`Q1_03` GRS 거래증명서 전용) — `certified_material_composition`/`total_certified_net_weight`/`certified_weight_of_product` 3개 박스.
- **`fiber_composition`** (`Q1_04` 섬유 케어라벨 전용) — `[{"fiber": "메리노 울", "percent": 80.0}, ...]` 형태 섬유 조성 리스트.

### 확장 필드가 안 잡히는 유형 (알려진 한계)

`Q1_01`(EUR.1), `Q3_09`(CE마킹), `Q3_10`(OEKO-TEX), `Q4_12`(CoC 추적서)는 지금 패턴으로는 헤드라인 지표/섹션이 안 잡힌다. 공통 원인: 표 형태(줄바꿈으로 열/행 구조가 깨짐) 또는 법적 조항 나열형(번호 뒤에 마침표가 없는 등 패턴 불일치). 이건 좌표 기반 파싱(pdfplumber의 단어 bounding box)이 있어야 신뢰성 있게 풀리는 문제라 지금은 의도적으로 손대지 않았다.

## 현재 범위와 한계 (다음 단계에서 채울 것)

- 23종 문서마다 법적으로 요구되는 세부 항목을 **전부** 구조화하는 건 아님. 표 형태 데이터(조성표, 기계적 물성표 등)는 선형화된 PDF 텍스트에서 열/행 구조가 깨져서 정규식으로는 신뢰성 있게 복원이 안 되므로 의도적으로 손대지 않음 — 필요해지면 pdfplumber 좌표 기반 파싱으로 넘어가야 함.
- `document_id` 정규식은 지금까지 관찰된 6가지 표기 패턴(문서번호/EUR.1 No/TC 번호/인증번호/EPREL 등록번호/보고서)만 커버. 새로운 표기 방식이 나오면 `DOC_ID_PATTERNS`에 패턴 추가.
- 다음 단계(스마트컨트랙트 해싱 → ZKP)에서는 `text_sha256`을 온체인에 앵커링하고, `dpp_annotation`에 있는 힌트(예: `ZKP 재활용함량/원산지 검증 입력`)를 참고해 어떤 필드를 ZKP 선택적 공개 대상으로 삼을지 설계하면 됨. `sustainability_metrics`에 이미 뽑혀있는 값들이 그 선택적 공개 후보 필드 목록의 출발점이 될 수 있음.
