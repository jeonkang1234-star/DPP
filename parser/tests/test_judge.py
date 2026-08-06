# -*- coding: utf-8 -*-
"""test_judge.py(27개 ZKP 판정 규칙 엔진) 검증.

instance 1의 기대 판정은 '한계치 정리.xlsx'(판정 규칙 v4) "판정 결과" 컬럼을
그대로 옮긴 것 - 즉 "엔진이 계산한 결과가 사람이 엑셀에 미리 정리해둔 정답과
같은가"를 검증하는 정답 대조 테스트. 나머지 9건은 예외 없이 항목이 다 나오는지
(구조 검증)만 확인한다.

실행법:
    cd dpp-doc-parser
    pytest tests/test_judge.py -v
"""
import pytest

import test_judge


def _by_item(results, name):
    for r in results:
        if r["item"] == name:
            return r
    raise KeyError(f"'{name}' 항목이 결과에 없음: {[r['item'] for r in results]}")


# ---------------------------------------------------------------------------
# 철강 - Q2_05(12) + Q2_06(2) = 14항목
# ---------------------------------------------------------------------------

def test_steel_mill_instance1_matches_excel_verdicts(get_processed):
    r = get_processed("Q2_05")["records"][0]
    results = test_judge.evaluate(r)
    assert len(results) == 12
    expected_pass = ["화학성분 C", "화학성분 Si", "화학성분 Mn", "화학성분 P", "화학성분 S",
                     "화학성분 N", "화학성분 Cu", "화학성분 CEV",
                     "기계적성질 ReH", "기계적성질 Rm", "기계적성질 A", "기계적성질 KV"]
    for name in expected_pass:
        assert _by_item(results, name)["verdict"] == test_judge.PASS, name


def test_cbam_instance1_matches_excel_verdicts(get_processed):
    r = get_processed("Q2_06")["records"][0]
    results = test_judge.evaluate(r)
    assert len(results) == 2
    qty = _by_item(results, "CBAM de minimis 연간누적 수입수량")
    assert qty["verdict"] == test_judge.OBLIGATED
    assert qty["measured"] == pytest.approx(62.4)
    emissions = _by_item(results, "CBAM 내재배출량")
    assert emissions["verdict"] == test_judge.NOT_JUDGED


@pytest.mark.parametrize("code", ["Q2_05", "Q2_06"])
def test_steel_domain_no_indeterminate_in_any_instance(code, get_processed):
    """10건 전부 INDETERMINATE(판정 못함) 없이 항목이 나와야 함 - 추출 실패 회귀 방지."""
    for r in get_processed(code)["records"]:
        results = test_judge.evaluate(r)
        bad = [x for x in results if x["verdict"] == test_judge.INDETERMINATE]
        assert not bad, f"{code} instance {r['instance_index']}: {bad}"


# ---------------------------------------------------------------------------
# 섬유 - Q1_04(2) + Q3_10(1) = 3항목
# ---------------------------------------------------------------------------

def test_fiber_care_label_instance1_matches_excel_verdicts(get_processed):
    r = get_processed("Q1_04")["records"][0]
    results = test_judge.evaluate(r)
    assert len(results) == 2
    total = _by_item(results, "섬유 혼용률 합계")
    assert total["verdict"] == test_judge.PASS
    assert total["measured"] == pytest.approx(100.0)
    name_check = _by_item(results, "섬유명칭 Annex I 유효성")
    assert name_check["verdict"] == test_judge.SUSPECTED_FAIL
    assert "재생 폴리아미드" in name_check["note"]


def test_oekotex_instance1_matches_excel_verdicts(get_processed):
    r = get_processed("Q3_10")["records"][0]
    results = test_judge.evaluate(r)
    assert len(results) == 1
    ph = _by_item(results, "pH")
    assert ph["verdict"] == test_judge.PASS
    assert ph["measured"] == pytest.approx(6.4)


# ---------------------------------------------------------------------------
# 배터리 - Q2_07(6) + Q4_15(4) = 10항목
# ---------------------------------------------------------------------------

def test_battery_pcf_instance1_matches_excel_verdicts(get_processed):
    r = get_processed("Q2_07")["records"][0]
    results = test_judge.evaluate(r)
    assert len(results) == 6
    assert _by_item(results, "재생원료 Co(2031~)")["verdict"] == test_judge.FAIL
    assert _by_item(results, "재생원료 Li(2031~)")["verdict"] == test_judge.PASS
    assert _by_item(results, "재생원료 Ni(2031~)")["verdict"] == test_judge.PASS
    assert _by_item(results, "재생원료 Pb(2031~)")["verdict"] == test_judge.EXEMPT
    assert _by_item(results, "탄소발자국 선언 의무 용량")["verdict"] == test_judge.CONDITIONAL
    assert _by_item(results, "최대 생애주기 탄소발자국 임계값")["verdict"] == test_judge.INDETERMINATE


def test_recycling_result_instance1_matches_excel_verdicts(get_processed):
    r = get_processed("Q4_15")["records"][0]
    results = test_judge.evaluate(r)
    assert len(results) == 4
    cu = _by_item(results, "물질회수율 구리(2027~)")
    assert cu["verdict"] == test_judge.PASS
    li = _by_item(results, "물질회수율 리튬(2027~, 파생)")
    assert li["verdict"] == f"{test_judge.PASS} (가정 성립 시)"
    co = _by_item(results, "물질회수율 코발트(2027~, 파생)")
    assert co["verdict"] == f"{test_judge.FAIL} (가정 성립 시)"
    overall = _by_item(results, "재활용효율(2025~)")
    assert overall["verdict"] == test_judge.HOLD
    assert "분모 기준 충돌" in overall["note"]


@pytest.mark.parametrize("code,expected_count", [
    ("Q2_07", 6), ("Q4_15", 4), ("Q1_04", 2), ("Q3_10", 1), ("Q2_05", 12), ("Q2_06", 2),
])
def test_every_instance_produces_full_item_count(code, expected_count, get_processed):
    """10건 전부 예외 없이 항목 개수가 일정해야 함 (일부 인스턴스에서만 필드가 비어
    개수가 줄어들면 추출 회귀를 의심해야 함)."""
    for r in get_processed(code)["records"]:
        results = test_judge.evaluate(r)
        assert len(results) == expected_count, f"{code} instance {r['instance_index']}: {len(results)}개"


def test_evaluate_returns_empty_for_non_judged_doc_types(get_processed):
    """판정 대상이 아닌 문서유형(예: Q1_01)은 조용히 빈 리스트를 리턴해야 함."""
    r = get_processed("Q1_01")["records"][0]
    assert test_judge.evaluate(r) == []
