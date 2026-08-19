# -*- coding: utf-8 -*-
"""생성된 목데이터 PDF를 실제 파서·판정 로직으로 검증한다.

사용법:
    python3 docker/mock-documents/generator/verify.py [--dir docker/mock-documents]

검사 항목 4가지. 하나라도 실패하면 종료 코드가 0이 아니다.

  1. 텍스트 추출     - PyMuPDF(운영 고정 버전 1.24.9)로 글자가 제대로 나오는가.
                       2026-08-16에 폰트 임베딩 문제로 배터리 문서 전체가 "텍스트를
                       추출하지 못했습니다"로 죽은 적이 있어서 맨 앞에 둔다.
  2. ZKP 판정        - 파일명의 PASS/FAIL이 parser/judge.py의 실제 판정과 일치하는가.
                       문서를 다시 그리다 표의 줄 구조가 한 줄이라도 어긋나면 여기서 걸린다.
  3. 필드 추출       - spec_extractor가 각 문서에서 뽑아낸 field_code 수.
  4. 도메인 커버리지 - 그 도메인의 PARSER 대상 필드가 전부 어느 한 문서에는 실려 있는가.
                       빠진 게 있으면 화면의 자동 채움 칸이 영영 비어 있게 된다.
"""
import argparse
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(REPO, "parser"))

import fitz

import extractor
import judge
import registry
import spec_extractor
import spec_fields

DOMAIN_BY_DIR = {"steel": "STEEL", "textile": "TEXTILE", "battery": "BATTERY"}

# 파일명 앞자리가 곧 레지스트리 코드다(Q2_05_..., Q4_15_...). registry.classify_filename은
# 파일명에 든 한글 힌트로 찾는 방식이라 'Q2_07_BATTERY_CARBON_PASS_1' 같은 이름은 못 맞춘다 -
# 이 세트는 코드가 파일명에 그대로 있으니 그걸 먼저 쓴다. 실제 업로드 경로에서는 BE가
# 문서 유형에서 레지스트리 코드를 정해서 넘기므로(DocumentSlotService), 파일명 추측에
# 의존하지 않는다.
def registry_code_of(name):
    head = name.split("_")
    if len(head) >= 2 and head[0].startswith("Q") and head[1].isdigit():
        code = head[0] + "_" + head[1]
        if any(e["code"] == code for e in registry.REGISTRY):
            return code
    entry = registry.classify_filename(name)
    return entry["code"] if entry else None


# ── 무엇이 승인/반려를 가르는가 ────────────────────────────────────────────
# judge.py는 규정 해석상 알아둘 가치가 있는 항목을 전부 돌려준다 - 위임법 미확정이라
# '판정 불가'인 항목, 섬유명칭이 Annex I 지정 명칭인지 보는 '부적합 의심' 항목 등이 섞여 있다.
# 하지만 BE가 실제로 업로드를 승인/반려하는 기준(specPassed)은 문서 유형마다 더 좁다.
# 여기서는 그 좁은 기준을 그대로 흉내낸다 - 그러지 않으면 PASS 문서가 "미달"로 잡힌다.
#   Q2_05 제강성적서   : 화학 8 + 기계 4, 전 항목 적합    (DocumentIngestService)
#   Q1_04 케어라벨     : 혼용률 합계만                     (CareLabelIngestService, ZKP 회로 결과)
#   Q3_10 OEKO-TEX     : pH만                              (OekotexIngestService)
#   Q2_07 배터리 PCF   : 재생원료 4원소만 - 용량 선언의무는 정보성 플래그라 제외
#                                                          (BatteryCarbonIngestService 주석 그대로)
#   Q4_15 재활용 결과  : 물질회수율 항목                    (RecyclingIngestService)
#   Q2_06 CBAM         : de minimis 초과 여부는 정보성이라 반려 케이스가 없다
OK_PREFIX = (judge.PASS, judge.EXEMPT)


def decisive(code, verdicts):
    """승인 여부를 가르는 항목만 남긴다. 남은 게 없으면 None(판정 불가로 본다)."""
    if code == "Q2_05":
        picked = verdicts
    elif code == "Q1_04":
        picked = [v for v in verdicts if v["item"].startswith("섬유 혼용률")]
    elif code == "Q3_10":
        picked = [v for v in verdicts if v["item"] == "pH"]
    elif code == "Q2_07":
        picked = [v for v in verdicts if v["item"].startswith("재생원료 ")]
    elif code == "Q4_15":
        picked = [v for v in verdicts if v["item"].startswith("물질회수율")]
    else:
        return None
    return picked or None


# 파일명 -> 기대 판정.
#   True  = 승인되어야 한다   False = 반려되어야 한다
#   None  = 판정 대상이지만 승인/반려 구분이 없다(CBAM de minimis 플래그)
#   "SKIP"= ZKP 판정 대상이 아닌 문서(형식만 갖추면 업로드 즉시 승인)
def expected_pass(filename):
    if "_PASS_" in filename:
        return True
    if "_FAIL_" in filename:
        return False
    if filename.startswith("Q2_06_CBAM"):
        return None
    return "SKIP"


def check(pdf_dir):
    problems = []
    covered = {"STEEL": set(), "TEXTILE": set(), "BATTERY": set()}
    rows = []

    for domain_dir in sorted(os.listdir(pdf_dir)):
        domain = DOMAIN_BY_DIR.get(domain_dir)
        if domain is None:
            continue
        for name in sorted(os.listdir(os.path.join(pdf_dir, domain_dir))):
            if not name.endswith(".pdf"):
                continue
            path = os.path.join(pdf_dir, domain_dir, name)
            doc = fitz.open(path)
            text = "\n".join(pg.get_text() for pg in doc)
            pages = doc.page_count
            doc.close()

            # 1. 텍스트 추출
            if not text.strip():
                problems.append(f"{domain_dir}/{name}: 텍스트가 전혀 추출되지 않음")
                continue
            if "MOCK / DEMONSTRATION DATA" not in text:
                problems.append(f"{domain_dir}/{name}: MOCK 표기 줄이 없음(문서번호 추출 경로가 끊긴다)")

            code = registry_code_of(name)
            common = extractor.extract_common_fields(text)
            ext = extractor.extract_extended_fields(code, text, domain)
            record = dict(registry_code=code, **common, **ext)

            # 2. ZKP 판정
            want = expected_pass(name)
            verdicts = judge.evaluate(record)
            verdict_ok = "-"
            if want in (True, False):
                picked = decisive(code, verdicts)
                if not picked:
                    problems.append(f"{domain_dir}/{name}: 판정 대상인데 판정 항목이 비었음(registry_code={code})")
                    verdict_ok = "판정없음"
                else:
                    passed = all(v["verdict"].startswith(OK_PREFIX) for v in picked)
                    if want is True and not passed:
                        bad = [(v["item"], v["verdict"], v.get("measured")) for v in picked
                               if not v["verdict"].startswith(OK_PREFIX)]
                        problems.append(f"{domain_dir}/{name}: PASS여야 하는데 미달 -> {bad}")
                    if want is False and passed:
                        problems.append(f"{domain_dir}/{name}: FAIL이어야 하는데 전 항목 적합으로 나옴")
                    verdict_ok = "적합" if passed else "미달"
            elif want is None:
                cbam = record.get("cbam_values") or {}
                qty = cbam.get("import_quantity_t")
                if qty is None:
                    problems.append(f"{domain_dir}/{name}: CBAM 수입 수량을 못 뽑았다(de minimis 판정 불가)")
                verdict_ok = "정보성" 

            # 3. 필드 추출
            got = ext.get("spec_fields", {})
            covered[domain] |= set(got)
            rows.append((f"{domain_dir}/{name}", pages, len(got), verdict_ok,
                         common.get("document_id") or "-"))

    # 4. 도메인 커버리지
    for domain in ["STEEL", "TEXTILE", "BATTERY"]:
        want = {f["code"] for f in spec_fields.SPEC_FIELDS
                if f["domain"] in ("COMMON", domain)}
        missing = want - covered[domain]
        if missing:
            problems.append(f"{domain}: 어느 문서에서도 안 뽑히는 필드 {len(missing)}개 -> {sorted(missing)}")

    return rows, covered, problems


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=os.path.join(REPO, "docker", "mock-documents"))
    args = ap.parse_args()

    rows, covered, problems = check(args.dir)

    print(f"{'문서':<58}{'쪽':>3}{'필드':>5}  {'판정':<6}문서번호")
    print("-" * 100)
    for name, pages, nfields, verdict, doc_id in rows:
        print(f"{name:<58}{pages:>3}{nfields:>5}  {verdict:<6}{doc_id}")

    print()
    for domain in ["STEEL", "TEXTILE", "BATTERY"]:
        want = {f["code"] for f in spec_fields.SPEC_FIELDS if f["domain"] in ("COMMON", domain)}
        print(f"{domain:<9} 파서 대상 {len(want):>3}개 중 {len(covered[domain] & want):>3}개 문서에서 추출 가능")

    if problems:
        print("\n실패 " + str(len(problems)) + "건")
        for p in problems:
            print("  ✗ " + p)
        return 1
    print("\n전부 통과")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
