# -*- coding: utf-8 -*-
"""전체 파이프라인: PDF 파일 -> 문서 분할 -> 메타데이터/QR/해시 추출 -> JSON 저장 + 커버리지 리포트."""
import os
import glob
import json
import fitz

import registry
import splitter
import extractor
import qr
import hasher


# 목데이터 폴더 구조가 docker/mock-documents/{steel,textile,battery}/ 라서, 배치 처리에서는
# 경로에서 도메인을 알아낼 수 있다. 실 업로드 경로(api.py /parse)는 BE가 DPP의 domain을
# 직접 넘긴다.
DOMAIN_BY_PATH_SEGMENT = {"steel": "STEEL", "textile": "TEXTILE", "battery": "BATTERY"}


def domain_from_path(path: str):
    parts = {p.lower() for p in os.path.normpath(path).split(os.sep)}
    for segment, domain in DOMAIN_BY_PATH_SEGMENT.items():
        if segment in parts:
            return domain
    return None


def process_pdf(path: str):
    """하나의 합본 PDF -> (레코드 리스트, 파일수준 통계 dict)"""
    filename = os.path.basename(path)
    entry = registry.classify_filename(filename)
    domain = domain_from_path(path)

    doc = fitz.open(path)
    ranges, split_method, split_warning = splitter.split_pages(doc)

    records = []
    for idx, (start, end) in enumerate(ranges, start=1):
        pages_text = []
        qr_payloads = []
        for p in range(start, end + 1):
            page = doc[p]
            pages_text.append(page.get_text())
            qr_payloads.extend(qr.decode_qr_on_page(page))
        raw_text = "\n".join(pages_text)

        common = extractor.extract_common_fields(raw_text)
        code = entry["code"] if entry else None
        extended = extractor.extract_extended_fields(code, raw_text, domain)

        record = {
            "source_file": filename,
            "registry_code": code,
            "doc_type_name": entry["name_kr"] if entry else None,
            "doc_type_slug": entry["doc_type_slug"] if entry else None,
            "quadrant": entry["quadrant"] if entry else None,
            "design_fixed": entry["design_fixed"] if entry else None,
            "data_fixed": entry["data_fixed"] if entry else None,
            "instance_index": idx,
            "page_range": [start + 1, end + 1],  # 1-based, 사람이 읽기 편하게
            **common,
            **extended,
            "qr_payloads": qr_payloads,
            "raw_text": raw_text,
            "text_sha256": hasher.sha256_of_text(raw_text),
        }
        records.append(record)

    doc.close()

    stats = {
        "file": filename,
        "registry_code": entry["code"] if entry else "NO_MATCH",
        "total_pages": ranges[-1][1] + 1 if ranges else 0,
        "instances_produced": len(records),
        "instances_expected": splitter.EXPECTED_INSTANCES,
        "split_method": split_method,
        "split_warning": split_warning,
        "document_id_found": sum(1 for r in records if r["document_id"]),
        "mock_id_found": sum(1 for r in records if r["mock_id"]),
        "dpp_annotation_found": sum(1 for r in records if r["dpp_annotation"]),
        "qr_found": sum(1 for r in records if r["qr_payloads"]),
        "sustainability_metric_found": sum(
            1 for r in records
            if any(v is not None for v in r["sustainability_metrics"].values())
        ),
        "numbered_sections_found": sum(1 for r in records if r["numbered_sections"]),
        "spec_fields_found": sum(len(r["spec_fields"]) for r in records),
    }
    return records, stats


def _format_report(all_stats, all_codes, matched_codes, total_files):
    unmatched = all_codes - matched_codes
    total_instances = sum(s["instances_produced"] for s in all_stats)

    lines = []
    lines.append(f"총 PDF 파일: {total_files}개 / 레지스트리 종류: {len(all_codes)}개")
    lines.append(f"분류 매칭된 종류: {len(matched_codes)}개 / 미매칭: {len(unmatched)}개 {sorted(unmatched) if unmatched else ''}")
    lines.append(f"총 생성된 문서 인스턴스: {total_instances}개 (기대: {len(all_codes) * splitter.EXPECTED_INSTANCES}개)")
    lines.append("")
    header = (f"{'code':8s} {'file':45s} {'pages':>6s} {'분할결과':>10s} "
               f"{'ID':>4s} {'MOCK':>5s} {'DPP주석':>7s} {'QR':>4s} {'지표':>4s} {'섹션':>4s}  경고")
    lines.append(header)
    lines.append("-" * len(header))
    for s in sorted(all_stats, key=lambda x: x["registry_code"]):
        lines.append(
            f"{s['registry_code']:8s} {s['file']:45s} {s['total_pages']:6d} "
            f"{str(s['instances_produced']) + '/' + str(s['instances_expected']):>10s} "
            f"{s['document_id_found']:>4d} {s['mock_id_found']:>5d} {s['dpp_annotation_found']:>7d} {s['qr_found']:>4d} "
            f"{s['sustainability_metric_found']:>4d} {s['numbered_sections_found']:>4d} {s['spec_fields_found']:>7d}  "
            f"{s['split_warning'] or ''}"
        )
    return "\n".join(lines)


def run(input_dir: str, output_dir: str):
    """input_dir 아래 모든 PDF를 재귀적으로 찾아 처리하고,
    output_dir에 문서유형별 JSON + 커버리지 리포트를 저장한다."""
    os.makedirs(output_dir, exist_ok=True)
    pdf_files = sorted(glob.glob(os.path.join(input_dir, "**/*.pdf"), recursive=True))

    all_stats = []
    matched_codes = set()

    for path in pdf_files:
        records, stats = process_pdf(path)
        all_stats.append(stats)
        if stats["registry_code"] != "NO_MATCH":
            matched_codes.add(stats["registry_code"])

        out_name = f"{stats['registry_code']}.json"
        with open(os.path.join(output_dir, out_name), "w", encoding="utf-8") as f:
            json.dump(records, f, ensure_ascii=False, indent=2)

    all_codes = {e["code"] for e in registry.REGISTRY}
    report = _format_report(all_stats, all_codes, matched_codes, len(pdf_files))

    with open(os.path.join(output_dir, "_coverage_report.txt"), "w", encoding="utf-8") as f:
        f.write(report)
    with open(os.path.join(output_dir, "_coverage_report.json"), "w", encoding="utf-8") as f:
        json.dump(all_stats, f, ensure_ascii=False, indent=2)

    return report, all_stats
