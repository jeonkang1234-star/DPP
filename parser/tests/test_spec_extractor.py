# -*- coding: utf-8 -*-
"""spec_extractor 회귀 테스트.

이 파서의 설계 원칙은 "뽑히면 확실히 맞는 것만 뽑는다"이다. 그래서 테스트도 두 방향을
같은 비중으로 본다 - 뽑아야 할 걸 뽑는지, 그리고 **뽑으면 안 되는 걸 안 뽑는지**.
후자가 무너지면 화면에는 값이 차 있는데 전부 오답인 상태가 되고, 그건 비어 있는 것보다
훨씬 나쁘다.
"""
import spec_extractor as se
import spec_fields


# ── 표가 성립하는지 ────────────────────────────────────────────────────────
def test_spec_fields_are_unique_and_nonempty():
    codes = [f["code"] for f in spec_fields.SPEC_FIELDS]
    assert len(codes) == len(set(codes)), "field_code 중복 - requirement_field는 PK다"
    assert len(codes) > 100
    for f in spec_fields.SPEC_FIELDS:
        assert f["domain"] in {"COMMON", "STEEL", "TEXTILE", "BATTERY"}
        assert f["data_type"] in {"STRING", "NUMBER", "BOOLEAN", "DATE", "DATETIME", "CODE", "TEXT", "URL"}
        assert f["label_ko"]


def test_no_same_domain_label_collision():
    """같은 도메인 안에서 라벨이 겹치면 그 라벨은 통째로 버려진다. 지금은 0건이어야 한다 -
    새 필드를 추가하다 라벨이 겹치면 조용히 추출 대상에서 빠지므로 여기서 잡는다."""
    assert se.AMBIGUOUS_LABELS == set(), f"라벨 충돌: {sorted(se.AMBIGUOUS_LABELS)}"


# ── 뽑아야 하는 것 ─────────────────────────────────────────────────────────
MILL_SHEET = """
제강 성적서 (Mill Test Certificate)
문서번호  MTC-2026-0817
강종명            S355JR
적용 표준         EN 10025-2:2019
용강 배치/히트 번호 : H26-0817
제품 순중량        12,450 kg
제조일            2026-08-01
화학분석 구분      LADLE
항복강도 실측      412 MPa
인장강도 실측      538 MPa
연신율 실측        24.5 %
6가크롬 함유 여부   없음
성적서 종류        EN10204_3_1
"""


def test_mill_sheet_extracts_expected_fields():
    got = se.extract_spec_fields(MILL_SHEET, "STEEL")
    assert got["STEEL_GRADE"] == "S355JR"
    assert got["STEEL_STANDARD"] == "EN 10025-2:2019"
    assert got["HEAT_NO"] == "H26-0817"
    assert got["PRODUCTION_DATE"] == "2026-08-01"
    assert got["YIELD_STRENGTH_ACTUAL_MPA"] == "412"
    assert got["ELONGATION_ACTUAL_PCT"] == "24.5"
    assert got["HEXAVALENT_CHROMIUM_CR6_PRESENCE"] == "false"


def test_unit_conversion_kg_to_tonne():
    """성적서는 kg로 적고 NET_WEIGHT_T 필드는 톤이다. 기존 자바 인제스트 로직도 kg/1000을
    넣는다 - 파서가 같은 규칙을 따라야 두 경로가 같은 값을 만든다."""
    got = se.extract_spec_fields(MILL_SHEET, "STEEL")
    assert got["NET_WEIGHT_T"] == "12.45"


def test_english_labels_also_work():
    text = "Cell Chemistry Class: NMC\nNumber of Cells | 96\nNominal Voltage V   355.2 V\n"
    got = se.extract_spec_fields(text, "BATTERY")
    assert got["BATTERY_CHEMISTRY"] == "NMC"
    assert got["NUMBER_OF_CELLS"] == "96"
    assert got["NOMINAL_VOLTAGE_V"] == "355.2"


def test_various_separators():
    for sep in [":", " : ", "\t", " | ", "    "]:
        text = "강종명" + sep + "S275JR"
        assert se.extract_spec_fields(text, "STEEL").get("STEEL_GRADE") == "S275JR", sep


# ── 뽑으면 안 되는 것 ──────────────────────────────────────────────────────
def test_type_gate_rejects_non_numeric():
    """숫자 칸에 문장이 들어오면 채우지 않는다."""
    got = se.extract_spec_fields("항복강도 실측   측정하지 않음\n", "STEEL")
    assert "YIELD_STRENGTH_ACTUAL_MPA" not in got


def test_type_gate_rejects_wrong_unit():
    """단위가 다른데 변환표에 없으면 버린다 - 단위 틀린 숫자는 값이 없는 것보다 나쁘다."""
    got = se.extract_spec_fields("항복강도 실측   412 psi\n", "STEEL")
    assert "YIELD_STRENGTH_ACTUAL_MPA" not in got


def test_type_gate_rejects_bad_date_and_url():
    got = se.extract_spec_fields("제조일  작년 여름\nCBAM 검증보고서 URL   문서 참조\n", "STEEL")
    assert "PRODUCTION_DATE" not in got
    assert "CBAM_VERIFICATION_REPORT_URL" not in got


def test_unknown_labels_are_ignored():
    """어휘를 닫아뒀으므로 모르는 라벨은 아무 필드에도 안 들어간다."""
    text = "담당자   김철수\n비고     내부 검토 완료\n수신처   구매팀\n"
    assert se.extract_spec_fields(text, "STEEL") == {}


def test_domain_filter_blocks_cross_domain():
    """철강 문서에서 배터리 필드를 채우지 않는다."""
    text = "셀 화학 계열   NMC\n양극 활물질 계열   NCM811\n"
    assert se.extract_spec_fields(text, "STEEL") == {}
    assert se.extract_spec_fields(text, "BATTERY")["BATTERY_CHEMISTRY"] == "NMC"


def test_domain_shared_label_needs_domain():
    """'SVHC 1 물질명'은 섬유에도 배터리에도 있다. 도메인을 모르면 채우지 않는다."""
    text = "SVHC 1 물질명   DEHP\n"
    assert se.extract_spec_fields(text, None) == {}
    assert se.extract_spec_fields(text, "TEXTILE")["SVHC_1_SUBSTANCE_NAME"] == "DEHP"


def test_first_occurrence_wins():
    text = "강종명  S355JR\n강종명  잘못된값\n"
    assert se.extract_spec_fields(text, "STEEL")["STEEL_GRADE"] == "S355JR"


def test_prose_is_not_captured_as_value():
    """라벨 뒤에 문단이 통째로 붙은 줄은 값이 아니다(200자 상한)."""
    text = "양극 조성 상세 : " + "가" * 250
    assert se.extract_spec_fields(text, "BATTERY") == {}


def test_empty_and_placeholder_values():
    text = "강종명   -\n적용 표준   N/A\n제조일\n"
    assert se.extract_spec_fields(text, "STEEL") == {}
