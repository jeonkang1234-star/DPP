# -*- coding: utf-8 -*-
"""분류 라벨 = BE document_type.doc_type_code(업로드 칸 코드) + 엉뚱한 서류 1종.

학습 데이터 파일명 → 라벨 규칙. 서비스는 파일명을 보지 않는다 - 여기서만 쓴다.
"""
import re

# 화면에 보여줄 이름 - 모델 파일에도 같이 실린다.
LABELS = {
    "MILL_SHEET": "제강 성적서(Mill Sheet)",
    "CBAM_REPORT": "CBAM 탄소보고서",
    "SCRAP_PROOF": "스크랩 매입증빙",
    "CARE_LABEL": "섬유 케어라벨",
    "OEKOTEX_LABEL": "OEKO-TEX 인증서",
    "GRS_CERTIFICATE": "GRS 거래증명서",
    "BATTERY_CARBON_REPORT": "배터리 탄소발자국 선언서",
    "RECYCLING_REPORT": "재활용 처리 결과 보고서",
    "DUE_DILIGENCE_REPORT": "공급망 실사 보고서",
    "PCF_REPORT": "탄소발자국 산정보고서",
    "LCA_EPD": "LCA/EPD 환경성적표지",
    "COO": "원산지증명서",
    "TEST_REPORT": "시험성적서",
    "MANUAL": "사용설명서",
    "LABEL": "제품 라벨",
    "TECH_FILE": "기술문서",
    "SOC_SDS": "물질안전보건자료(SDS)",
    "EU_DOC": "EU 적합성선언서",
    "BIZ_REG_CERT": "사업자등록증",
    "OTHER": "DPP 제출 서류가 아닌 문서",
}

# 시연용 대량 데이터: <모델>_<문서명>.pdf 의 마지막 '_' 뒤 문서명
_DEMO_SUFFIX = {
    "제강성적서": "MILL_SHEET", "CBAM보고서": "CBAM_REPORT", "스크랩매입증빙": "SCRAP_PROOF",
    "케어라벨": "CARE_LABEL", "OEKO-TEX인증서": "OEKOTEX_LABEL", "GRS거래증명서": "GRS_CERTIFICATE",
    "배터리탄소발자국선언서": "BATTERY_CARBON_REPORT", "재활용결과보고서": "RECYCLING_REPORT",
    "공급망실사보고서": "DUE_DILIGENCE_REPORT", "탄소발자국보고서": "PCF_REPORT", "EPD": "LCA_EPD",
    "원산지증명서": "COO", "시험성적서": "TEST_REPORT", "사용설명서": "MANUAL", "라벨": "LABEL",
    "기술문서": "TECH_FILE", "SDS": "SOC_SDS", "EU적합성선언서": "EU_DOC",
}

# 목 문서: Q 코드 접두어
_Q_PREFIX = {
    "Q2_05": "MILL_SHEET", "Q2_06": "CBAM_REPORT", "Q1_04": "CARE_LABEL", "Q3_10": "OEKOTEX_LABEL",
    "Q2_07": "BATTERY_CARBON_REPORT", "Q4_15": "RECYCLING_REPORT",
}

# 23종 레지스트리 스타일 목 문서(루멘셀 등) - 파일명 키워드. 위에서부터 먼저 맞는 것.
_KEYWORDS = [
    ("배터리탄소발자국", "BATTERY_CARBON_REPORT"), ("공급망실사", "DUE_DILIGENCE_REPORT"),
    ("EU적합성선언서", "EU_DOC"), ("시험성적서", "TEST_REPORT"), ("라벨_데이터캐리어", "LABEL"),
    ("사용설명서", "MANUAL"), ("소재성분표_SDS", "SOC_SDS"), ("사업자등록증", "BIZ_REG_CERT"),
]


def label_for_filename(name: str):
    stem = re.sub(r"\.pdf$", "", name, flags=re.I)
    if stem.startswith("DOC_"):
        code = stem[4:]
        return code if code in LABELS else None
    for prefix, label in _Q_PREFIX.items():
        if stem.startswith(prefix):
            return label
    if "_" in stem:
        suffix = stem.rsplit("_", 1)[1]
        if suffix in _DEMO_SUFFIX:
            return _DEMO_SUFFIX[suffix]
    for kw, label in _KEYWORDS:
        if kw in stem:
            return label
    return None
