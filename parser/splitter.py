# -*- coding: utf-8 -*-
"""합본 PDF(문서 10건이 한 파일에 이어붙은 형태)를 개별 문서 단위로 분할."""
import re
from typing import Optional

FOOTER_PAT = re.compile(r"(\d+)\s*/\s*(\d+)\s*$")

EXPECTED_INSTANCES = 10  # 목데이터 규칙: 문서 1종당 10건


def _last_nonempty_line(text: str) -> str:
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    return lines[-1] if lines else ""


def detect_footer_pages_per_doc(doc) -> Optional[int]:
    """1페이지 마지막 줄에서 'i / N' 패턴을 찾아 페이지당 문서 쪽수 N을 추정.
    못 찾거나 신뢰할 수 없으면 None."""
    last_line = _last_nonempty_line(doc[0].get_text())
    m = FOOTER_PAT.search(last_line)
    if not m:
        return None
    i, n = int(m.group(1)), int(m.group(2))
    if i != 1 or n < 1 or n > 5:  # 너무 큰 N은 오탐(예: 규정번호) 가능성
        return None
    return n


def split_pages(doc, expected_instances: int = EXPECTED_INSTANCES):
    """returns: (list of (start_page, end_page) 0-based inclusive), method, warning"""
    total = doc.page_count
    warning = None

    # 1순위: 총 페이지수가 기대 문서 수로 나누어떨어지면 균등분할 (가장 신뢰도 높음)
    if total % expected_instances == 0:
        per = total // expected_instances
        ranges = [(i * per, i * per + per - 1) for i in range(expected_instances)]
        method = f"even_split(pages_per_doc={per})"

        # 교차검증: 실제 footer 'i/N' 패턴과 일치하는지 확인 (신뢰도 표시용)
        footer_n = detect_footer_pages_per_doc(doc)
        if footer_n is not None and footer_n != per:
            warning = f"footer 감지 쪽수({footer_n})와 균등분할 쪽수({per})가 다름 - 확인 필요"
        return ranges, method, warning

    # 2순위: footer 패턴으로 그룹 경계 탐색
    footer_n = detect_footer_pages_per_doc(doc)
    if footer_n:
        ranges = []
        start = 0
        while start < total:
            end = min(start + footer_n - 1, total - 1)
            ranges.append((start, end))
            start = end + 1
        method = f"footer_split(pages_per_doc={footer_n})"
        if len(ranges) != expected_instances:
            warning = f"footer 분할 결과 {len(ranges)}건 (기대 {expected_instances}건) - 확인 필요"
        return ranges, method, warning

    # 3순위: 실패 - 파일 전체를 1건으로 처리하고 경고
    warning = f"분할 실패: 총 {total}페이지를 {expected_instances}건으로 나눌 수 없음. 전체를 1건으로 처리."
    return [(0, total - 1)], "fallback_whole_file", warning
