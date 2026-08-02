# -*- coding: utf-8 -*-
"""pytest 공용 픽스처.

IntelliJ에서 이 파일을 dpp-doc-parser/tests/conftest.py 로 두고 실행하면,
이 파일 위치를 기준으로 "새 폴더"(원본 목데이터 4개 하위폴더가 있는 최상위 폴더)를
자동으로 찾아 올라간다. 즉 IntelliJ 프로젝트 루트를 "새 폴더"로 잡든
"dpp-doc-parser"로 잡든 상관없이 동작한다.

이 파서 코드가 DPP 모노레포(예: DPP/parser)로 옮겨진 뒤에는 230개 목데이터 PDF가
같은 트리에 없을 수 있다. 그런 경우엔:
  1) 환경변수 DPP_MOCK_DATA_DIR 로 목데이터 루트를 직접 지정하거나
  2) 아무것도 못 찾으면 PDF를 여는 테스트만 자동으로 skip 처리하고,
     레지스트리/해셔 등 순수 로직 테스트는 그대로 돈다 (import 시점에 죽지 않음).
"""
import glob
import os
import sys

import pytest

# tests/ 의 부모(dpp-doc-parser)를 sys.path에 추가해서 registry/extractor/... import 가능하게
THIS_DIR = os.path.dirname(os.path.abspath(__file__))
PARSER_DIR = os.path.dirname(THIS_DIR)  # dpp-doc-parser
sys.path.insert(0, PARSER_DIR)

import pipeline  # noqa: E402
import registry  # noqa: E402

SUBFOLDERS = ["노 고정", "데 고정", "디 고정", "디, 데 고정"]


def _find_base_dir():
    """1) DPP_MOCK_DATA_DIR 환경변수 2) PARSER_DIR에서 위로 올라가며 SUBFOLDERS가
    전부 존재하는 폴더를 찾는다. 둘 다 실패하면 None (에러로 죽이지 않음 -
    PDF 없이도 순수 로직 테스트는 돌아야 하므로)."""
    env_dir = os.environ.get("DPP_MOCK_DATA_DIR")
    if env_dir and all(os.path.isdir(os.path.join(env_dir, sub)) for sub in SUBFOLDERS):
        return env_dir

    candidate = PARSER_DIR
    for _ in range(5):
        if all(os.path.isdir(os.path.join(candidate, sub)) for sub in SUBFOLDERS):
            return candidate
        parent = os.path.dirname(candidate)
        if parent == candidate:
            break
        candidate = parent
    return None


BASE_DIR = _find_base_dir()


@pytest.fixture(scope="session")
def base_dir():
    return BASE_DIR


@pytest.fixture(scope="session")
def all_pdf_files():
    """4개 하위폴더 아래 모든 PDF 절대경로 (정렬됨). 목데이터 루트를 못 찾으면
    이 픽스처를 쓰는 테스트는 skip된다 (에러로 전체 수집이 죽지 않게)."""
    if BASE_DIR is None:
        pytest.skip(
            "목데이터 루트(노 고정/데 고정/디 고정/디, 데 고정)를 못 찾음. "
            "DPP_MOCK_DATA_DIR 환경변수로 원본 목데이터 폴더를 지정하세요."
        )
    files = []
    for sub in SUBFOLDERS:
        files.extend(glob.glob(os.path.join(BASE_DIR, sub, "**", "*.pdf"), recursive=True))
    return sorted(files)


@pytest.fixture(scope="session")
def code_to_file(all_pdf_files):
    """registry_code -> PDF 절대경로. 파일명 매칭 기준(registry.classify_filename)."""
    mapping = {}
    for path in all_pdf_files:
        entry = registry.classify_filename(os.path.basename(path))
        if entry:
            mapping[entry["code"]] = path
    return mapping


@pytest.fixture(scope="session")
def _process_cache():
    return {}


@pytest.fixture(scope="session")
def get_processed(code_to_file, _process_cache):
    """code -> {"records": [...10개...], "stats": {...}} 를 **필요할 때만** 파싱해서
    세션 동안 캐싱하는 함수를 반환한다.

    23개 전부를 한꺼번에 파싱하면(QR 디코딩 포함) 파일당 수 초씩 걸려 전체 1~2분
    소요된다. pytest -k로 특정 유형 테스트만 골라 돌릴 때 그 파일만 파싱하도록
    지연 평가(lazy) + 캐싱으로 설계했다 - IntelliJ에서 테스트 하나만 실행/디버깅할 때
    나머지 22개 PDF까지 기다릴 필요가 없다."""

    def _get(code):
        if code not in _process_cache:
            if code not in code_to_file:
                raise KeyError(f"{code}: 매칭되는 PDF 파일을 찾지 못함 (code_to_file 확인)")
            records, stats = pipeline.process_pdf(code_to_file[code])
            _process_cache[code] = {"records": records, "stats": stats}
        return _process_cache[code]

    return _get


@pytest.fixture(scope="session")
def registry_codes():
    return sorted(e["code"] for e in registry.REGISTRY)
