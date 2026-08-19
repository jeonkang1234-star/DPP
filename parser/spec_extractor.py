# -*- coding: utf-8 -*-
"""라벨 사전 기반 DPP 필드 추출.

spec_fields.SPEC_FIELDS(=requirement_field 중 data_source='PARSER'인 192개)의 한글/영문
라벨을 사전으로 만들어두고, 문서 텍스트를 줄 단위로 훑으면서 '라벨 <구분자> 값' 꼴로
딱 떨어지는 줄만 골라낸다.

■ 자유 휴리스틱을 쓰지 않는 이유
extractor.py 상단 주석에 기록된 대로, 이 프로젝트는 예전에 범용 라벨/값 페어링을 시도했다가
표·줄바꿈이 섞인 실제 문서에서 "그럴듯한 오답"을 뽑는 문제로 폐기한 이력이 있다. 여기서도
같은 원칙을 지킨다 - 아래 세 관문을 전부 통과한 값만 인정한다.

  1. 어휘를 닫는다   : LABEL_INDEX에 없는 라벨은 아예 보지 않는다. 문서에 무슨 표가 있든
                       모르는 라벨이면 그냥 지나간다.
  2. 형태를 닫는다   : 한 줄이 라벨 + 구분자(콜론/탭/2칸 이상 공백/파이프) + 값 으로
                       깔끔히 갈라질 때만 후보로 본다. 값이 여러 줄에 걸치거나 표가
                       뒤엉킨 경우는 포기한다.
  3. 타입을 닫는다   : 뽑은 값이 그 필드의 data_type으로 파싱되지 않으면 버린다.
                       숫자 칸에 "해당 없음"이 들어오면 채우지 않는다.

못 뽑으면 그 필드는 결과에서 빠진다. 비는 건 정상이고, 틀린 값이 들어가는 것보다 낫다.

■ 도메인 제한
domain을 넘기면 그 도메인 + COMMON 필드만 본다. 철강 성적서에서 배터리 필드를 찾을 이유가
없고, 라벨이 겹칠 때(예: '제조일') 엉뚱한 도메인 필드로 새는 걸 막는다.
"""
import re
import unicodedata

import spec_fields

# ── 라벨 정규화 ──────────────────────────────────────────────────────────
# 문서마다 '제조사명', '제조사 명', '제조사명(Manufacturer Name)' 처럼 표기가 흔들린다.
# 공백·괄호·구두점을 걷어내고 소문자로 눕혀서 비교한다. 한글은 그대로 둔다.
_STRIP = re.compile(r"[\s ·:：\-_/()\[\]{}.,'\"]+")


def normalize_label(text: str) -> str:
    if text is None:
        return ""
    t = unicodedata.normalize("NFKC", str(text))
    return _STRIP.sub("", t).lower()


def _build_index():
    """라벨(정규화) -> 필드 dict.

    같은 라벨이 두 필드에 걸리는 경우가 두 가지 있다.
      - 도메인이 다른 경우(예: 'SVHC 1 물질명'은 섬유에도 배터리에도 있다):
        '라벨@도메인' 키를 따로 만들어 도메인 필터가 갈라주게 한다. 도메인을 모르는
        호출(domain=None)에서는 어느 쪽인지 알 수 없으므로 채우지 않는다.
      - 도메인이 같은 경우: 구제할 방법이 없다. 그 라벨은 통째로 버린다.
        모호한 라벨을 남겨두면 문서마다 다른 필드가 채워지는 최악의 실패가 된다 -
        조용히 틀리느니 아무것도 안 채우는 쪽이 낫다.
    """
    index = {}
    domain_only = set()   # 도메인을 알면 갈라지는 라벨
    ambiguous = set()     # 같은 도메인 안에서 충돌 - 사용 불가
    for f in spec_fields.SPEC_FIELDS:
        for raw in (f["label_ko"], f["label_en"], f["code"]):
            key = normalize_label(raw)
            if not key or len(key) < 2:
                continue
            index.setdefault(key + "@" + f["domain"], f)
            prev = index.get(key)
            if prev is None:
                index[key] = f
            elif prev["code"] != f["code"]:
                if prev["domain"] == f["domain"]:
                    ambiguous.add(key)
                else:
                    domain_only.add(key)
    for key in ambiguous | domain_only:
        index.pop(key, None)
    return index, domain_only, ambiguous


LABEL_INDEX, DOMAIN_QUALIFIED_LABELS, AMBIGUOUS_LABELS = _build_index()

# ── 줄 -> (라벨, 값) 분리 ────────────────────────────────────────────────
# 콜론, 탭, 파이프, 2칸 이상 공백 중 "가장 먼저 나오는" 구분자에서 한 번만 자른다.
# 값 안에 콜론이 들어가는 경우(URL, 시각)가 있어서 오른쪽은 자르지 않는다.
_SEPARATOR = re.compile(r"\s*(?:[:：|]|\t|\s{2,})\s*")
# 표에서 흔한 앞머리 장식(글머리표, 번호, 괄호 번호)을 떼어낸다.
_LEADING = re.compile(r"^\s*(?:[-•▪◦●○*]|\(?\d{1,3}[.)]|\d+\s*[.)]\s)\s*")

_NUMBER = re.compile(r"^[-+]?\d{1,3}(?:,\d{3})*(?:\.\d+)?$|^[-+]?\d+(?:\.\d+)?$")
_DATE = re.compile(r"^(\d{4}-\d{2}-\d{2}|\d{4}-\d{2}|\d{4}/\d{2}/\d{2}|\d{4}\.\d{2}\.\d{2})$")
_DATETIME = re.compile(r"^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?$")
_URL = re.compile(r"^https?://\S+$")

_TRUE = {"예", "y", "yes", "true", "해당", "해당됨", "있음", "함유", "적합", "합격", "포함"}
_FALSE = {"아니오", "아니요", "n", "no", "false", "해당없음", "없음", "미함유", "부적합", "불합격", "미포함"}


# 단위 변환. 문서가 쓰는 단위와 필드가 저장하는 단위가 다른 경우가 있다 - 대표적으로
# 제품 순중량은 성적서가 kg로 적지만 NET_WEIGHT_T 필드는 톤 단위다(기존 자바 인제스트
# 로직도 kg/1000으로 넣고 있다). 변환표에 없는 조합이면 값을 버린다 - 단위가 다른 숫자를
# 그대로 채우는 건 값이 없는 것보다 나쁘다.
_UNIT_ALIAS = {"kg": "kg", "㎏": "kg", "g": "g", "t": "t", "ton": "t", "tonne": "t",
               "mt": "t", "%": "%", "wt%": "%", "mpa": "MPa", "㎫": "MPa", "mm": "mm",
               "㎜": "mm", "ppm": "ppm", "ah": "Ah", "wh": "Wh", "kwh": "kWh",
               "v": "V", "w": "W", "a": "A", "℃": "℃", "°c": "℃", "c": "℃",
               "mΩ": "mΩ", "mohm": "mΩ", "h": "h", "min": "min",
               "tco2e/t": "tCO2e/t", "tco2e/mwh": "tCO2e/MWh", "t/t": "t/t",
               "kgco2e/t": "kgCO2e/t", "회": "회", "개월": "개월", "년": "년"}
_UNIT_FACTOR = {("kg", "t"): 0.001, ("g", "t"): 0.000001, ("t", "kg"): 1000.0,
                ("g", "kg"): 0.001, ("kg", "g"): 1000.0, ("t", "g"): 1000000.0}
# 단위 토큰은 숫자로 시작하지 않는 공백 없는 덩어리로 본다 - 'kg', '%', 'tCO2e/MWh',
# 't/t' 처럼 안에 숫자나 슬래시가 들어가는 것까지 받으려면 첫 글자만 제한하면 된다.
_TRAILING_UNIT = re.compile(r"^(?P<num>[-+]?[\d,]+(?:\.\d+)?)\s*(?P<unit>[^\s\d][^\s]{0,11})$")


def _clean_value(raw: str, unit) -> str:
    v = unicodedata.normalize("NFKC", raw).strip()
    return v.strip("|").strip()


def _apply_unit(value: str, field_unit):
    """'12,450 kg' + 필드단위 't' -> '12.45'. 단위가 없으면 그대로, 못 맞추면 None."""
    v = value.strip()
    m = _TRAILING_UNIT.match(v)
    if not m:
        return v                      # 단위 표기가 없다 - 그대로 숫자 검사로 넘긴다
    num, raw_unit = m.group("num"), m.group("unit")
    doc_unit = _UNIT_ALIAS.get(raw_unit.lower(), raw_unit)
    if not field_unit:
        return num                    # 필드에 단위 정의가 없으면 숫자만 취한다
    if doc_unit == field_unit:
        return num
    factor = _UNIT_FACTOR.get((doc_unit, field_unit))
    if factor is None:
        return None                   # 모르는 단위 조합 - 채우지 않는다
    try:
        converted = float(num.replace(",", "")) * factor
    except ValueError:
        return None
    # 부동소수 잔재(12.450000000000001)를 없앤다.
    return ("%.6f" % converted).rstrip("0").rstrip(".") or "0"


def _coerce(value: str, data_type: str, unit):
    """타입 관문. 통과하면 저장할 문자열, 실패하면 None."""
    v = _clean_value(value, unit)
    if not v or v in {"-", "—", "N/A", "n/a", "미정", "해당사항 없음"}:
        return None

    if data_type == "NUMBER":
        v = _apply_unit(v, unit)
        if v is None or not _NUMBER.match(v):
            return None
        return v.replace(",", "")
    if data_type == "BOOLEAN":
        low = normalize_label(v)
        if low in _TRUE:
            return "true"
        if low in _FALSE:
            return "false"
        return None
    if data_type == "DATE":
        if not _DATE.match(v):
            return None
        return v.replace("/", "-").replace(".", "-")
    if data_type == "DATETIME":
        return v if _DATETIME.match(v) else None
    if data_type == "URL":
        return v if _URL.match(v) else None
    # STRING / CODE / TEXT - 한 줄 안에 들어오는 짧은 값만 인정한다. 200자를 넘으면
    # 라벨 뒤에 문단이 통째로 붙은 경우라 값이 아니다.
    return v if len(v) <= 200 else None


def extract_spec_fields(text: str, domain: str = None) -> dict:
    """문서 텍스트 -> {field_code: value}. 못 뽑은 필드는 키 자체가 없다."""
    if not text:
        return {}
    allowed = None
    if domain:
        allowed = {"COMMON", domain}

    found = {}
    for line in text.splitlines():
        line = _LEADING.sub("", line.rstrip())
        if not line or len(line) > 400:
            continue
        m = _SEPARATOR.search(line)
        if not m:
            continue
        label_part = line[: m.start()]
        value_part = line[m.end():]
        if not label_part.strip() or not value_part.strip():
            continue

        key = normalize_label(label_part)
        field = None
        if domain:
            field = LABEL_INDEX.get(key + "@" + domain) or LABEL_INDEX.get(key + "@COMMON")
        if field is None:
            field = LABEL_INDEX.get(key)
        if field is None:
            continue
        if allowed is not None and field["domain"] not in allowed:
            continue
        if field["code"] in found:
            # 같은 필드가 문서에 두 번 나오면 첫 값을 신뢰한다. 요약표가 앞에 오고
            # 부록이 뒤에 오는 문서가 많아서, 뒤쪽이 더 맞다고 볼 근거가 없다.
            continue

        value = _coerce(value_part, field["data_type"], field["unit"])
        if value is not None:
            found[field["code"]] = value
    return found


def coverage(domain: str = None):
    """이 도메인에서 파서가 채울 수 있는 필드 목록 - 커버리지 리포트/테스트용."""
    return [f for f in spec_fields.SPEC_FIELDS
            if domain is None or f["domain"] in {"COMMON", domain}]
