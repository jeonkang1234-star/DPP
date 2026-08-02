# -*- coding: utf-8 -*-
"""문서 인스턴스 텍스트에서 공통 메타데이터 + DPP 주석(있는 경우) 추출."""
import re

MOCK_ID_PAT = re.compile(r"MOCK\s*/\s*DEMONSTRATION DATA\s*[·\-]\s*([A-Za-z0-9\-\._]+)")
ISSUE_DATE_PAT = re.compile(r"발행일\s+(\d{4}-\d{2}-\d{2})")
BIZ_REG_PAT = re.compile(r"사업자/법인번호\s+([0-9\-]+)")
EORI_PAT = re.compile(r"EORI\s+([A-Z0-9]+)")
GTIN_PAT = re.compile(r"GTIN\s+(\d+)")
DPP_ANNOTATION_PAT = re.compile(r"^DPP:\s*(.+)$", re.MULTILINE)

# 문서번호는 문서 유형별로 표기 방식이 달라서 우선순위대로 시도.
# 새 문서 유형을 추가할 때 이 리스트에 패턴만 추가하면 됨.
DOC_ID_PATTERNS = [
    re.compile(r"문서번호\s+(\S+)"),
    re.compile(r"EUR\.?1\s*No\.?\s*([A-Za-z0-9]+(?:\s+[A-Za-z0-9]+)?)"),
    re.compile(r"TC\s*(?:No|번호)\.?\s*[:\s]\s*(\S+)"),
    re.compile(r"인증(?:서)?\s*번호\s+(\S+)"),
    re.compile(r"EPREL\s*등록번호\s+(\S+)"),
    re.compile(r"^보고서\s+(\S+)", re.MULTILINE),
]


def extract_document_id(text: str):
    for pat in DOC_ID_PATTERNS:
        m = pat.search(text)
        if m:
            return m.group(1).strip()
    return None


def extract_dpp_annotation(text: str):
    """'DPP: doc_type=xxx · ... · ...' 형태의 내부 설계 주석을 파싱.
    이 목데이터 세트는 일부 문서 유형(01~07, Q4_05, Q3_07 등)에만 이 주석이 있고
    나머지는 없으므로 None이 나오는 게 정상이다."""
    m = DPP_ANNOTATION_PAT.search(text)
    if not m:
        return None
    body = m.group(1)
    parts = [p.strip() for p in body.split("·") if p.strip()]
    result = {"raw": body, "notes": []}
    for p in parts:
        if "=" in p:
            k, v = p.split("=", 1)
            result[k.strip()] = v.strip()
        else:
            result["notes"].append(p)
    return result


def extract_common_fields(text: str) -> dict:
    def _first(pat):
        m = pat.search(text)
        return m.group(1) if m else None

    return {
        "document_id": extract_document_id(text),
        "mock_id": _first(MOCK_ID_PAT),
        "issue_date": _first(ISSUE_DATE_PAT),
        "biz_reg_no": _first(BIZ_REG_PAT),
        "eori": _first(EORI_PAT),
        "gtin": _first(GTIN_PAT),
        "dpp_annotation": extract_dpp_annotation(text),
    }


# ---------------------------------------------------------------------------
# 확장 필드 추출 (2단계: 타입별 세부 데이터)
#
# 아래 함수들은 "완전 범용 라벨/값 페어링" 방식(휴리스틱)을 한 번 시도했다가
# 표/줄바꿈 섞인 실제 문서에서 잘못된 값을 그럴듯하게 뽑아내는 문제가 있어서 폐기하고,
# 23종 문서 원문을 직접 검토해서 검증된 패턴만 남긴 것이다.
# 즉 "모든 필드를 다 뽑는다"가 아니라 "뽑히면 확실히 맞는 것만 뽑는다"가 원칙.
# 매칭 안 되면 None/{}/[] 로 조용히 빠지고, 어떤 타입에서 뭐가 비는지는
# README.md의 커버리지 표에 정리해둔다.
# ---------------------------------------------------------------------------

# 문서 유형을 가로지르는 "헤드라인 지표"들. 해당 안 되는 문서에서는 전부 None.
SUSTAINABILITY_METRIC_PATTERNS = {
    "recyclability_percent": re.compile(r"재활용\s*가능성\s*\n?\s*([\d.]+)\s*%"),
    "recycled_content_percent": re.compile(r"재생\s*(?:원료|스크랩)\s*함유율(?:\s*\([^)]*\))?\s*\n?\s*([\d.]+)\s*%"),
    "recycled_content_weighted_avg_percent": re.compile(r"제품\s*전체\s*\(가중\s*평균\)\s*\n?\s*([\d.]+)\s*%"),
    "repairability_grade": re.compile(r"수리\s*가능성?\s*등급[:\s]*\n?\s*([A-E])\b"),
    "total_carbon_footprint_kg_co2e": re.compile(r"(?:총\s*)?(?:탄소발자국(?:\s*\(PCF\))?|내재\s*배출량)\s*\n?\s*([\d.]+)"),
    "overall_recycling_rate_percent": re.compile(r"종합\s*재활용율\s*\n?\s*([\d.]+)\s*%"),
    "energy_efficiency_grade": re.compile(r"에너지효율\s*등급\s*\n?\s*([A-G])\b"),
    "carbon_performance_class": re.compile(r"탄소\s*성능등급[^\n]*\n?\s*([A-G])\s*등급"),
    "overall_judgement": re.compile(r"종합\s*판정\s*\n?\s*([^\n(—]+)"),
}


def extract_sustainability_metrics(text: str) -> dict:
    """23종을 가로지르는 지속가능성/등급 관련 헤드라인 지표. 문서 유형별로
    해당 없는 항목은 전부 None으로 남는다 (있는 것만 채워지는 방식)."""
    result = {}
    for key, pat in SUSTAINABILITY_METRIC_PATTERNS.items():
        m = pat.search(text)
        result[key] = m.group(1) if m else None
    return result


_FIBER_LINE_PAT = re.compile(r"^([\d.]+)\s*%$")


def extract_fiber_composition(text: str) -> list:
    """Q1_04(케어라벨/섬유조성) 전용 - '면 60%' 처럼 줄바꿈으로 분리된
    섬유명/비율 쌍을 뽑는다. 다른 문서 유형에 돌려도 대부분 빈 리스트가 나온다."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    out = []
    for i in range(len(lines) - 1):
        m = _FIBER_LINE_PAT.match(lines[i + 1])
        if m and 1 <= len(lines[i]) <= 12 and not re.search(r"\d", lines[i]):
            out.append({"fiber": lines[i], "percent": float(m.group(1))})
    return out


def extract_grs_boxes(text: str) -> dict:
    """Q1_03(GRS 거래인증서) 전용 - 규제상 고정된 3개 박스 필드."""
    result = {}
    m = re.search(r"Certified material composition\s*\n(.+)", text)
    if m:
        result["certified_material_composition"] = m.group(1).strip()
    m = re.search(r"Total certified net shipping weight\s*\n([\d.]+\s*kg)", text)
    if m:
        result["total_certified_net_weight"] = m.group(1).strip()
    m = re.search(r"Certified weight of product\s*\n([^\n]+)", text)
    if m:
        result["certified_weight_of_product"] = m.group(1).strip()
    return result


_NUMBERED_SECTION_PAT = re.compile(r"^(\d{1,2})\.\s+(\S.*)$")
_NUMBERED_SECTION_STOP_PAT = re.compile(r"^(DPP:|MOCK\s*/)")
_TRAILING_PAGE_MARKER_PAT = re.compile(r"\s*\d{1,3}\s*/\s*\d{1,3}\s*$")


def extract_numbered_sections(text: str) -> dict:
    """'1. 화학제품과 회사에 관한 정보' 처럼 번호 붙은 섹션 구조를 갖는 문서
    (SDS 16개 섹션, 실사 5단계 등)에서 섹션 번호 -> {title, body}를 뽑는다.

    두 가지를 특히 조심함:
    - 소수점 숫자("18.0 %")를 섹션 번호로 오인하지 않도록 점 뒤에 공백 1개 이상 요구
    - 섹션 번호가 1,2,3... 순서대로 연속될 때만 인정해서 본문 중 우연히 숫자로
      시작하는 줄을 새 섹션으로 잘못 잡는 걸 방지
    """
    lines = text.split("\n")
    sections = {}
    cur_num = None
    cur_title = None
    cur_body = []
    last_num = 0

    def flush():
        if cur_num is not None:
            body = " ".join(cur_body).strip()
            body = _TRAILING_PAGE_MARKER_PAT.sub("", body).strip()
            sections[cur_num] = {"title": cur_title, "body": body}

    for line in lines:
        line = line.strip()
        if not line:
            continue
        m = _NUMBERED_SECTION_PAT.match(line)
        if m:
            n = int(m.group(1))
            if 1 <= n <= 20 and n == last_num + 1:
                flush()
                cur_num = m.group(1)
                cur_title = m.group(2)
                cur_body = []
                last_num = n
                continue
        if _NUMBERED_SECTION_STOP_PAT.match(line):
            flush()
            cur_num = None
            continue
        if cur_num is not None:
            cur_body.append(line)
    flush()
    return sections


# registry_code -> 그 유형에만 의미 있는 전용 추출기.
TYPE_SPECIFIC_EXTRACTORS = {
    "Q1_03": ("grs_boxes", extract_grs_boxes),
    "Q1_04": ("fiber_composition", extract_fiber_composition),
}


def extract_extended_fields(registry_code: str, text: str) -> dict:
    """공통 필드 이후에 붙이는 2단계 확장 필드.
    - sustainability_metrics: 모든 유형에 시도 (해당 없으면 전부 None)
    - numbered_sections: 모든 유형에 시도 (섹션 번호 구조 없으면 빈 dict)
    - 그 외 registry_code별 전용 필드는 TYPE_SPECIFIC_EXTRACTORS에 등록된 것만 추가
    """
    result = {
        "sustainability_metrics": extract_sustainability_metrics(text),
        "numbered_sections": extract_numbered_sections(text),
    }
    specific = TYPE_SPECIFIC_EXTRACTORS.get(registry_code)
    if specific:
        key, fn = specific
        result[key] = fn(text)
    return result
