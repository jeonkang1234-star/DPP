# -*- coding: utf-8 -*-
"""
DPP 문서 파서 로컬 검증 테스트 (IntelliJ에서 pytest로 실행).

이 파일은 dpp-doc-parser/tests/test_pipeline.py 로 배치한다 (conftest.py와 같은 폴더).
검증 기준은 00_분류근거_및_출처.txt에 명시된 "강제사항"을 그대로 assertion으로 옮긴 것이다.
즉 "이 필드가 이 문서 유형에서 왜 반드시 뽑혀야 하는가"는 전부 그 문서의 근거 조항에서 온다.

실행법 (IntelliJ 터미널 또는 pytest 실행 구성):
    cd dpp-doc-parser
    pytest tests/ -v

PDF를 실제로 여는 테스트(2~4번 섹션)는 get_processed(code) 픽스처를 통해
"그 테스트가 요청한 문서유형만" 지연 파싱한다. 즉 pytest -k로 Q1_02만 돌리면
Q1_02 PDF 1개만 열리고 나머지 22개는 건드리지 않는다 (conftest.py 참고).
"""
import os

import pytest

import extractor
import hasher
import registry


# ---------------------------------------------------------------------------
# 0. 레지스트리 자체의 무결성 (PDF 안 열어봄 - 빠름)
# ---------------------------------------------------------------------------

def test_registry_has_23_unique_codes():
    codes = [e["code"] for e in registry.REGISTRY]
    assert len(codes) == 23, f"00_분류근거_및_출처.txt 기준 23종이어야 하는데 {len(codes)}종 등록됨"
    assert len(set(codes)) == len(codes), "registry_code 중복 있음"


def test_registry_quadrant_cousnts_match_source_doc():
    """00_분류근거_및_출처.txt: Q1=4종, Q2=8종, Q3=3종, Q4=8종."""
    expected = {"Q1": 4, "Q2": 8, "Q3": 3, "Q4": 8}
    actual = {}
    for e in registry.REGISTRY:
        actual[e["quadrant"]] = actual.get(e["quadrant"], 0) + 1
    assert actual == expected


@pytest.mark.parametrize("quadrant,design_fixed,data_fixed", [
    ("Q1", True, True),
    ("Q2", False, True),
    ("Q3", True, False),
    ("Q4", False, False),
])
def test_quadrant_design_data_flags_consistent(quadrant, design_fixed, data_fixed):
    """4분면 정의: Q1=디자인+데이터 고정, Q2=데이터만, Q3=디자인만, Q4=둘다 자유."""
    entries = [e for e in registry.REGISTRY if e["quadrant"] == quadrant]
    assert entries, f"{quadrant} 항목이 없음"
    for e in entries:
        assert e["design_fixed"] is design_fixed, e["code"]
        assert e["data_fixed"] is data_fixed, e["code"]


# ---------------------------------------------------------------------------
# 1. 파일명 -> 문서유형 분류 (실제 파일 존재 + 정확히 매칭되는지, PDF는 안 엶)
# ---------------------------------------------------------------------------

def test_every_registry_code_matches_exactly_one_pdf(code_to_file, registry_codes):
    missing = [c for c in registry_codes if c not in code_to_file]
    assert not missing, f"파일명으로 분류 안 되는 코드: {missing}"


def test_no_pdf_matches_multiple_or_wrong_code(all_pdf_files):
    """모든 PDF가 정확히 1개 registry_code로만 분류되는지 (오분류/미분류 없음)."""
    unmatched = []
    for path in all_pdf_files:
        entry = registry.classify_filename(os.path.basename(path))
        if entry is None:
            unmatched.append(path)
    assert not unmatched, f"분류 실패한 파일: {unmatched}"


# ---------------------------------------------------------------------------
# 2. 문서 분할 - 합본 PDF 1개 -> 10건 (목데이터 규칙: 유형당 10건)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("code", [e["code"] for e in registry.REGISTRY])
def test_splits_into_exactly_10_instances(code, get_processed):
    stats = get_processed(code)["stats"]
    assert stats["instances_produced"] == 10, (
        f"{code}: {stats['instances_produced']}건 생성됨 (기대 10건), "
        f"분할방식={stats['split_method']}, 경고={stats['split_warning']}"
    )
    assert stats["split_warning"] is None, (
        f"{code}: 분할은 10건 됐지만 경고 있음 -> {stats['split_warning']}"
    )


# ---------------------------------------------------------------------------
# 3. 공통 필드 - 모든 유형에 공통으로 있어야 하는 것
#    (00_분류근거_및_출처.txt "한계" 절: "모든 문서에 MOCK 표기가 있습니다")
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("code", [e["code"] for e in registry.REGISTRY])
def test_mock_marking_present_in_every_instance(code, get_processed):
    records = get_processed(code)["records"]
    assert len(records) == 10
    missing = [r["instance_index"] for r in records if not r["mock_id"]]
    assert not missing, f"{code}: MOCK 표기 없는 인스턴스 {missing}"


@pytest.mark.parametrize("code", [e["code"] for e in registry.REGISTRY])
def test_document_id_present_in_every_instance(code, get_processed):
    records = get_processed(code)["records"]
    missing = [r["instance_index"] for r in records if not r["document_id"]]
    assert not missing, f"{code}: document_id 없는 인스턴스 {missing}"


@pytest.mark.parametrize("code", [e["code"] for e in registry.REGISTRY])
def test_text_sha256_present_and_wellformed(code, get_processed):
    for r in get_processed(code)["records"]:
        h = r["text_sha256"]
        assert isinstance(h, str) and len(h) == 64
        int(h, 16)  # hex여야 함


@pytest.mark.parametrize("code", [e["code"] for e in registry.REGISTRY])
def test_dpp_annotation_consistent_within_doc_type(code, get_processed):
    """같은 문서유형(합본 파일)이면 DPP 설계주석이 전부 있거나 전부 없어야 정상.
    일부만 있으면 splitter가 페이지를 잘못 잘랐다는 신호."""
    flags = [bool(r["dpp_annotation"]) for r in get_processed(code)["records"]]
    assert len(set(flags)) == 1, f"{code}: DPP 주석 존재 여부가 인스턴스마다 다름 -> {flags}"


# ---------------------------------------------------------------------------
# 4. 타입별 확장 필드 - 00_분류근거_및_출처.txt의 "확인된 강제사항"을 근거로 한 검증
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("code", ["Q1_02", "Q3_07"])
def test_qr_required_types_decode_in_every_instance(code, get_processed):
    """Q1_02(EU 에너지라벨): 'EPREL DB가 라벨을 자동 생성, QR 필수'
    Q3_07(라벨/데이터캐리어): 문서 유형 자체가 QR."""
    records = get_processed(code)["records"]
    missing = [r["instance_index"] for r in records if not r["qr_payloads"]]
    assert not missing, f"{code}: QR 디코딩 안 된 인스턴스 {missing}"


def test_grs_boxes_present_for_q1_03(get_processed):
    """Q1_03(GRS 거래증명서): '박스 1~20 번호·문구 고정' 중 3개 핵심 박스."""
    expected_keys = {
        "certified_material_composition",
        "total_certified_net_weight",
        "certified_weight_of_product",
    }
    for r in get_processed("Q1_03")["records"]:
        boxes = r.get("grs_boxes", {})
        missing_keys = expected_keys - boxes.keys()
        assert not missing_keys, f"instance {r['instance_index']}: 누락된 박스 {missing_keys}"
        for k in expected_keys:
            assert boxes[k], f"instance {r['instance_index']}: {k} 값이 비어있음"


def test_fiber_composition_sums_to_100_for_q1_04(get_processed):
    """Q1_04(섬유 케어라벨): '혼용률 합계 100%' (Regulation (EU) 1007/2011)."""
    for r in get_processed("Q1_04")["records"]:
        comp = r.get("fiber_composition", [])
        assert comp, f"instance {r['instance_index']}: 섬유 조성이 하나도 안 뽑힘"
        total = sum(c["percent"] for c in comp)
        assert abs(total - 100.0) < 0.5, (
            f"instance {r['instance_index']}: 혼용률 합계 {total}% (100%여야 함) - {comp}"
        )


def test_sds_16_sections_present_for_q2_01(get_processed):
    """Q2_01(소재성분표 SDS): 'REACH Annex II / GHS Rev.9 — 16개 항목의 순서·제목 고정'."""
    for r in get_processed("Q2_01")["records"]:
        sections = r["numbered_sections"]
        found = sorted(int(k) for k in sections.keys())
        assert found == list(range(1, 17)), (
            f"instance {r['instance_index']}: SDS 섹션 {found} (1~16 전부 있어야 함)"
        )


@pytest.mark.parametrize("code,expected_grade_field", [
    ("Q1_02", "energy_efficiency_grade"),
])
def test_energy_label_grade_is_a_to_g(code, expected_grade_field, get_processed):
    """Q1_02: 'A~G 7색 화살표' 등급 문자는 A~G 범위여야 함."""
    for r in get_processed(code)["records"]:
        grade = r["sustainability_metrics"][expected_grade_field]
        assert grade in list("ABCDEFG"), f"instance {r['instance_index']}: 등급값 {grade!r}"


# ---------------------------------------------------------------------------
# 5. 순수 함수 단위 테스트 (PDF 없이 문자열만으로 검증 - 빠름, 회귀 방지용)
# ---------------------------------------------------------------------------

def test_canonicalize_text_normalizes_whitespace():
    raw = "A\r\n\r\nB   C\n\n\nD"
    canon = hasher.canonicalize_text(raw)
    assert "\r" not in canon
    assert "   " not in canon
    assert canon == canon.strip()


def test_sha256_of_text_is_deterministic():
    text = "동일한 문서 텍스트입니다."
    h1 = hasher.sha256_of_text(text)
    h2 = hasher.sha256_of_text(text)
    assert h1 == h2
    assert len(h1) == 64


def test_sha256_ignores_whitespace_only_differences():
    """공백/줄바꿈만 다른 텍스트는 같은 해시가 나와야 한다 (hasher.py 설계 의도)."""
    t1 = "line1\nline2"
    t2 = "line1\r\n\r\nline2   "
    assert hasher.sha256_of_text(t1) == hasher.sha256_of_text(t2)


def test_extract_dpp_annotation_parses_key_value_pairs():
    text = "머리말\nDPP: doc_type=energy_label · ZKP 재활용함량 검증 입력 · 비고\n본문"
    result = extractor.extract_dpp_annotation(text)
    assert result is not None
    assert result["doc_type"] == "energy_label"
    assert "ZKP 재활용함량 검증 입력" in result["notes"]


def test_extract_dpp_annotation_returns_none_when_absent():
    assert extractor.extract_dpp_annotation("이 문서에는 주석이 없습니다.") is None
