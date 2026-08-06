# -*- coding: utf-8 -*-
"""ZKP 판정 규칙 엔진 (한계치 정리.xlsx "판정 규칙 v4" 기준, 30개 항목 중 27개).

Q2_04(RoHS/SVHC)·Q3_09(CE마킹 최소높이) 관련 3개 항목은 mock 문서 자체에 개별
실측값이 없어서(선언·사양값만 존재) 판정 엔진 대상에서 제외했다 - 이건 파서/엔진의
한계가 아니라 mock 데이터 자체의 한계 (인텔리제이_로컬테스트_가이드.md 6절 참고).

원칙: extractor.py가 뽑은 raw 값(steel_mill_values 등)을 입력으로 받아서,
엑셀에 정의된 기준과 비교해 판정 결과를 계산한다. 각 evaluate_* 함수는
pipeline.process_pdf()가 리턴하는 문서 인스턴스 1건(dict)을 받는다 -
문서 유형 간 인스턴스 번호가 같은 제품을 가리킨다는 보장이 없어서(예: Q4_15는
배터리·전자·섬유 등 전 제품군에 걸쳐 쓰이는 공용 문서유형이라 인스턴스마다
제품이 다름), 여러 문서를 조합하는 "제품 단위" 판정은 이 엔진의 범위 밖이고
문서 1건 단위로만 판정한다.

예외 케이스 처리 방침 (엑셀 "파생규칙·가정" 컬럼 근거):
- CEV 등 철강 화학/기계적 성질: 엑셀의 범용 참고값 대신 **해당 성적서 자체에 인쇄된
  규격 한계(limit_text/spec_text)를 기준으로 판정**한다. EN 10204 Type 3.1
  성적서는 그 Heat/제품에 대해 공인검사원이 발행한 값이라 일반 참고표보다 우선한다고
  보는 게 타당하고, 이렇게 하면 엑셀 자체에 있던 "CEV 0.45(엑셀) vs 0.47(원문)" 같은
  이중기준 문제가 애초에 발생하지 않는다.
- 재생원료 납 Pb: 실측 0%면 "미달"이 아니라 "적용 제외"로 판정한다(리튬이온전지
  활물질엔 원래 Pb가 없음 - v3 결함으로 지적됐던 그 케이스).
- 물질회수율 Li/Co(재활용처리결과): 문서가 "리튬코발트산화물" 화합물 단위로만
  보고하는 경우, 화학양론 분해·조성비 보존을 가정해 화합물 회수율을 그대로
  Li/Co 각각의 회수율로 쓴다 - 단 이 가정이 실제로 성립하는지는 검증된 바 없으므로
  판정 결과에 "(가정 성립 시)"를 항상 붙인다.
- 종합재활용율 분모 충돌: 소재별 표의 투입량 합계('합계' 행)와 문서의
  '입고/처리완료' 중량이 크게 다르면(15% 초과 괴리) 문서 내부 기준이 안 맞는다는
  뜻이라 실적 자체를 신뢰할 수 없다고 보고 "판정 보류"로 뺀다.
- 섬유명칭 유효성: Annex I 지정 명칭 목록과 정확히 일치하는지 본다(재생/유기농/천연
  같은 수식어가 붙은 이름은 불일치로 판정 - 원칙적으로 재생 여부는 별도 주장으로
  표기해야 하고 섬유명 자체에 섞으면 안 됨). 아래 ANNEX_I_FIBER_NAMES는 원문
  Annex I를 직접 대조해서 만든 게 아니라 통용되는 한국어 명칭으로 구성한
  비전수(non-exhaustive) 목록이다 - 실제 판정 전 원문(Regulation (EU) 1007/2011
  Annex I) 대조가 필요하다는 걸 명시적으로 남겨둔다.
"""
import re

# 판정 결과 상수 (엑셀 "판정 결과" 컬럼 표현을 그대로 따름)
PASS = "적합"
FAIL = "미달"
CONDITIONAL = "조건부 해당"
NOT_JUDGED = "판정 대상 아님"
EXEMPT = "적용 제외"
INDETERMINATE = "판정 불가"
HOLD = "판정 보류"
SUSPECTED_FAIL = "부적합 의심"
OBLIGATED = "의무 발생"
NOT_OBLIGATED = "면제 대상"


def _spec_check(measured, spec_text):
    """성적서에 인쇄된 규격 문자열(예: '≤0.24', '≥355', '470–630')을 파싱해서
    measured 값이 그 기준을 만족하는지 판정. 파싱 실패 시 (None, None) 리턴."""
    if measured is None or not spec_text:
        return None, None
    spec_text = spec_text.strip()
    if spec_text.startswith("≤"):
        limit = float(spec_text[1:])
        return (PASS if measured <= limit else FAIL), f"≤{limit}"
    if spec_text.startswith("≥"):
        limit = float(spec_text[1:])
        return (PASS if measured >= limit else FAIL), f"≥{limit}"
    m = re.match(r"^([\d.]+)\s*[–-]\s*([\d.]+)$", spec_text)
    if m:
        low, high = float(m.group(1)), float(m.group(2))
        return (PASS if low <= measured <= high else FAIL), f"{low}–{high}"
    return None, None


def _item(name, verdict, measured=None, limit=None, unit=None, note=None):
    return {
        "item": name, "verdict": verdict,
        "measured": measured, "limit": limit, "unit": unit, "note": note,
    }


# ---------------------------------------------------------------------------
# 철강 (Q2_05 제강성적서: 12항목, Q2_06 CBAM: 2항목) - 총 14항목
# ---------------------------------------------------------------------------

def evaluate_steel_mill(record: dict) -> list:
    """Q2_05 레코드 전용 - 화학성분 8개 + 기계적성질 4개 = 12항목."""
    v = record.get("steel_mill_values") or {}
    results = []
    for el, data in (v.get("chemical_composition_wt_percent") or {}).items():
        verdict, limit_disp = _spec_check(data.get("measured"), data.get("limit_text"))
        results.append(_item(
            f"화학성분 {el}", verdict or INDETERMINATE,
            measured=data.get("measured"), limit=limit_disp or data.get("limit_text"),
            unit="wt%",
            note="성적서 자체 규격 한계 기준 판정" if el == "CEV" else None,
                          ))
    for key, data in (v.get("mechanical_properties") or {}).items():
        verdict, limit_disp = _spec_check(data.get("measured"), data.get("spec_text"))
        results.append(_item(
            f"기계적성질 {key}", verdict or INDETERMINATE,
            measured=data.get("measured"), limit=limit_disp or data.get("spec_text"),
            unit=data.get("unit"),
                            ))
    return results


def evaluate_cbam(record: dict, de_minimis_t: float = 50.0) -> list:
    """Q2_06 레코드 전용 - de minimis 수입수량(직접판정) + 내재배출량(정보성, 판정 없음)."""
    results = []
    qty = (record.get("cbam_values") or {}).get("import_quantity_t")
    if qty is None:
        results.append(_item("CBAM de minimis 연간누적 수입수량", INDETERMINATE))
    else:
        verdict = OBLIGATED if qty > de_minimis_t else NOT_OBLIGATED
        results.append(_item(
            "CBAM de minimis 연간누적 수입수량", verdict,
            measured=qty, limit=f"≤{de_minimis_t}", unit="t",
            note="면제 대상 아님" if verdict == OBLIGATED else None,
        ))
    emissions = (record.get("sustainability_metrics") or {}).get("total_carbon_footprint_kg_co2e")
    results.append(_item(
        "CBAM 내재배출량", NOT_JUDGED,
        measured=float(emissions) if emissions else None, unit="tCO2e/t",
        note="한계값 규제 아님 - 보고·정산 항목",
    ))
    return results


# ---------------------------------------------------------------------------
# 섬유 (Q1_04 섬유케어라벨: 2항목, Q3_10 OEKO-TEX: 1항목) - 총 3항목
# ---------------------------------------------------------------------------

# 비전수(non-exhaustive) 목록 - Regulation (EU) 1007/2011 Annex I 원문 직접
# 대조 전이므로 실제 판정에 쓰기 전 반드시 원문 확인 필요 (모듈 docstring 참고).
ANNEX_I_FIBER_NAMES = {
    "면", "마", "아마", "대마", "황마", "사이잘", "코이어", "라미",
    "모", "울", "캐시미어", "앙고라", "알파카", "라마모", "낙타모", "비쿠냐", "야크모",
    "견",
    "아세테이트", "알기네이트", "큐프라", "모달", "트리아세테이트", "비스코스", "라이오셀",
    "아크릴", "염화섬유", "불화섬유", "모다크릴", "폴리아미드", "나일론", "아라미드",
    "폴리이미드", "폴리락타이드", "폴리에스터", "폴리에틸렌", "폴리프로필렌", "폴리우레탄",
    "폴리염화비닐", "엘라스토올레핀", "엘라스토디엔", "엘라스테인", "유리섬유", "멜라민",
    "엘라스토멀티에스터",
}


def evaluate_fiber_care_label(record: dict, tolerance_percent: float = 0.5) -> list:
    """Q1_04 레코드 전용 - 혼용률 합계 100% + 섬유명칭 Annex I 유효성."""
    comp = record.get("fiber_composition") or []
    results = []
    total = sum(c.get("percent", 0) for c in comp)
    results.append(_item(
        "섬유 혼용률 합계", PASS if abs(total - 100.0) <= tolerance_percent else FAIL,
        measured=total, limit="≈100", unit="%",
    ))
    invalid = [c["fiber"] for c in comp if c["fiber"] not in ANNEX_I_FIBER_NAMES]
    if not comp:
        results.append(_item("섬유명칭 Annex I 유효성", INDETERMINATE, note="섬유 조성 못 뽑음"))
    elif invalid:
        results.append(_item(
            "섬유명칭 Annex I 유효성", SUSPECTED_FAIL,
            note=f"Annex I 미지정 명칭(비전수 목록 기준, 원문 대조 필요): {', '.join(invalid)}",
        ))
    else:
        results.append(_item("섬유명칭 Annex I 유효성", PASS))
    return results


def evaluate_oekotex(record: dict, ph_range=(4.0, 7.5)) -> list:
    """Q3_10 레코드 전용 - pH."""
    ph = (record.get("oekotex_values") or {}).get("ph")
    if ph is None:
        return [_item("pH", INDETERMINATE)]
    low, high = ph_range
    return [_item("pH", PASS if low <= ph <= high else FAIL, measured=ph, limit=f"{low}–{high}")]


# ---------------------------------------------------------------------------
# 배터리 (Q2_07 배터리PCF: 6항목, Q4_15 재활용처리결과: 4항목) - 총 10항목
# ---------------------------------------------------------------------------

def evaluate_battery_pcf(record: dict) -> list:
    """Q2_07 레코드 전용 - 재생원료 4원소 + 정격용량 선언의무 + 생애주기 임계값."""
    v = record.get("battery_pcf_values") or {}
    results = []
    recycled = v.get("recycled_content_percent") or {}
    thresholds = {"Co": 16.0, "Li": 6.0, "Ni": 6.0, "Pb": 85.0}
    for el, threshold in thresholds.items():
        measured = recycled.get(el)
        note = "⚠ 제품범주 미확정(SLI/2kWh초과 산업용/EV 여부에 따라 적용대상 자체가 미결)"
        if measured is None:
            results.append(_item(f"재생원료 {el}(2031~)", INDETERMINATE, note=note))
        elif el == "Pb" and measured == 0:
            results.append(_item(
                f"재생원료 {el}(2031~)", EXEMPT, measured=measured, limit=f"≥{threshold}", unit="%",
                note="리튬이온전지 활물질엔 Pb가 존재하지 않음 - 적용 대상 아님",
            ))
        else:
            results.append(_item(
                f"재생원료 {el}(2031~)", PASS if measured >= threshold else FAIL,
                measured=measured, limit=f"≥{threshold}", unit="%", note=note,
            ))
    capacity = v.get("rated_capacity_kwh")
    if capacity is None:
        results.append(_item("탄소발자국 선언 의무 용량", INDETERMINATE))
    else:
        verdict = CONDITIONAL if capacity > 2.0 else NOT_JUDGED
        results.append(_item(
            "탄소발자국 선언 의무 용량", verdict, measured=capacity, limit="＞2", unit="kWh",
            note="산업용이면 선언 의무 발생, 휴대용이면 비대상 - 제품범주 미확정" if verdict == CONDITIONAL else None,
        ))
    per_unit = v.get("carbon_footprint_per_functional_unit_kg_co2e_kwh")
    results.append(_item(
        "최대 생애주기 탄소발자국 임계값", INDETERMINATE,
        measured=per_unit, unit="kgCO2e/kWh", note="위임법령 미확정 - 기준값 자체가 없음",
    ))
    return results


def evaluate_recycling_result(record: dict, denominator_conflict_tolerance: float = 0.15) -> list:
    """Q4_15 레코드 전용 - 물질회수율 Cu(직접) + Li/Co(파생, LiCoO2 가정) + 종합재활용효율."""
    v = record.get("recycling_result_values") or {}
    materials = v.get("material_recovery") or {}
    results = []

    cu = materials.get("구리")
    if cu is None:
        results.append(_item("물질회수율 구리(2027~)", INDETERMINATE))
    else:
        rate = cu["recovery_rate_percent"]
        results.append(_item(
            "물질회수율 구리(2027~)", PASS if rate >= 90 else FAIL,
            measured=rate, limit="≥90", unit="%",
        ))

    compound = materials.get("리튬코발트산화물")
    for el, threshold in (("리튬", 50.0), ("코발트", 90.0)):
        item_name = f"물질회수율 {el}(2027~, 파생)"
        if compound is None:
            results.append(_item(item_name, NOT_JUDGED, note="문서에 리튬코발트산화물 화합물 보고 없음"))
            continue
        rate = compound["recovery_rate_percent"]
        verdict = PASS if rate >= threshold else FAIL
        results.append(_item(
            item_name, f"{verdict} (가정 성립 시)", measured=rate, limit=f"≥{threshold}", unit="%",
            note="LiCoO2 화학양론 분해·조성비 보존 가정 - 실제 성립 여부 미검증",
        ))

    overall = v.get("overall_recycling_rate_percent")
    total_row = materials.get("합계")
    intake = v.get("intake_weight_kg")
    if overall is None:
        results.append(_item("재활용효율(2025~)", INDETERMINATE))
    elif total_row is not None and intake:
        diff_ratio = abs(total_row["input_kg"] - intake) / intake
        if diff_ratio > denominator_conflict_tolerance:
            results.append(_item(
                "재활용효율(2025~)", HOLD, measured=overall, limit="≥65", unit="%",
                note=(f"소재별 표 투입합계 {total_row['input_kg']}kg vs 입고중량 {intake}kg "
                      f"불일치(괴리 {diff_ratio:.0%}) - 분모 기준 충돌로 판정 보류"),
            ))
        else:
            results.append(_item(
                "재활용효율(2025~)", PASS if overall >= 65 else FAIL,
                measured=overall, limit="≥65", unit="%",
            ))
    else:
        results.append(_item(
            "재활용효율(2025~)", PASS if overall >= 65 else FAIL,
            measured=overall, limit="≥65", unit="%", note="분모 정합성 확인 불가(입고중량 없음)",
        ))
    return results


# ---------------------------------------------------------------------------
# 디스패치
# ---------------------------------------------------------------------------

EVALUATORS = {
    "Q2_05": evaluate_steel_mill,
    "Q2_06": evaluate_cbam,
    "Q1_04": evaluate_fiber_care_label,
    "Q3_10": evaluate_oekotex,
    "Q2_07": evaluate_battery_pcf,
    "Q4_15": evaluate_recycling_result,
}


def evaluate(record: dict) -> list:
    """레코드의 registry_code에 맞는 판정 함수를 찾아 실행. 대상 아니면 빈 리스트."""
    fn = EVALUATORS.get(record.get("registry_code"))
    return fn(record) if fn else []
