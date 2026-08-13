# -*- coding: utf-8 -*-
"""문서 유형 레지스트리: 23종 문서 타입 메타데이터 + 파일명 매칭 규칙."""

REGISTRY = [
    # code, name_kr, quadrant, design_fixed, data_fixed, doc_type_slug, match_hints
    dict(code="Q1_01", name_kr="EUR.1 이동증명서", quadrant="Q1", design_fixed=True, data_fixed=True,
         doc_type_slug="eur1_movement_certificate", match_hints=["EUR1", "EUR.1", "이동증명서"]),
    dict(code="Q1_02", name_kr="EU 에너지라벨", quadrant="Q1", design_fixed=True, data_fixed=True,
         doc_type_slug="energy_label", match_hints=["에너지라벨", "energy", "Q1_02"]),
    dict(code="Q1_03", name_kr="GRS/RCS 거래증명서", quadrant="Q1", design_fixed=True, data_fixed=True,
         doc_type_slug="grs_transaction_certificate", match_hints=["GRS", "거래증명서", "Q1_03"]),
    dict(code="Q1_04", name_kr="섬유 케어라벨", quadrant="Q1", design_fixed=True, data_fixed=True,
         doc_type_slug="care_label", match_hints=["케어라벨", "Q1_04"]),

    dict(code="Q2_01", name_kr="소재성분표 SDS", quadrant="Q2", design_fixed=False, data_fixed=True,
         doc_type_slug="material_composition", match_hints=["소재성분표", "_SDS_", "SDS_합본"]),
    dict(code="Q2_02", name_kr="EU 적합성선언서 DoC", quadrant="Q2", design_fixed=False, data_fixed=True,
         doc_type_slug="conformity_declaration", match_hints=["적합성선언서", "_DoC_"]),
    dict(code="Q2_03", name_kr="LCA/EPD 환경성적표지", quadrant="Q2", design_fixed=False, data_fixed=True,
         doc_type_slug="esg_report", match_hints=["LCA_EPD", "환경성적표지"]),
    dict(code="Q2_04", name_kr="시험성적서", quadrant="Q2", design_fixed=False, data_fixed=True,
         doc_type_slug="test_report", match_hints=["시험성적서", "TestReport"]),
    dict(code="Q2_05", name_kr="제강 성적서 Mill Sheet", quadrant="Q2", design_fixed=False, data_fixed=True,
         doc_type_slug="mill_test_certificate", match_hints=["제강성적서", "Mill"]),
    dict(code="Q2_06", name_kr="CBAM 탄소보고서", quadrant="Q2", design_fixed=False, data_fixed=True,
         doc_type_slug="cbam_carbon_report", match_hints=["CBAM"]),
    dict(code="Q2_07", name_kr="배터리 탄소발자국 선언", quadrant="Q2", design_fixed=False, data_fixed=True,
         doc_type_slug="battery_carbon_footprint", match_hints=["탄소발자국", "PCF"]),
    dict(code="Q2_08", name_kr="재생함량 인증서", quadrant="Q2", design_fixed=False, data_fixed=True,
         doc_type_slug="recycled_content_certificate", match_hints=["재생함량인증서"]),

    dict(code="Q3_07", name_kr="라벨/데이터캐리어(QR)", quadrant="Q3", design_fixed=True, data_fixed=False,
         doc_type_slug="data_carrier_qr", match_hints=["데이터캐리어", "라벨_데이터캐리어"]),
    dict(code="Q3_09", name_kr="CE 마킹", quadrant="Q3", design_fixed=True, data_fixed=False,
         doc_type_slug="ce_marking", match_hints=["CE마킹", "CE마킹시트"]),
    dict(code="Q3_10", name_kr="OEKO-TEX 라벨", quadrant="Q3", design_fixed=True, data_fixed=False,
         doc_type_slug="oekotex_label", match_hints=["OEKOTEX", "OEKO-TEX"]),

    dict(code="Q4_05", name_kr="기술문서 Technical File", quadrant="Q4", design_fixed=False, data_fixed=False,
         doc_type_slug="technical_documentation", match_hints=["기술문서"]),
    dict(code="Q4_06", name_kr="사용설명서·안전정보", quadrant="Q4", design_fixed=False, data_fixed=False,
         doc_type_slug="user_manual", match_hints=["사용설명서"]),
    dict(code="Q4_11", name_kr="공급망 실사 보고서", quadrant="Q4", design_fixed=False, data_fixed=False,
         doc_type_slug="due_diligence_report", match_hints=["실사보고서"]),
    dict(code="Q4_12", name_kr="공급망 추적서 CoC", quadrant="Q4", design_fixed=False, data_fixed=False,
         doc_type_slug="supply_chain_coc", match_hints=["추적서CoC", "추적서"]),
    dict(code="Q4_13", name_kr="스크랩 매입증빙·재생원료 확인서", quadrant="Q4", design_fixed=False, data_fixed=False,
         doc_type_slug="scrap_certificate", match_hints=["스크랩재생원료", "스크랩"]),
    dict(code="Q4_14", name_kr="분해·정비 매뉴얼", quadrant="Q4", design_fixed=False, data_fixed=False,
         doc_type_slug="disassembly_manual", match_hints=["분해정비매뉴얼"]),
    dict(code="Q4_15", name_kr="재활용 처리 결과 보고서", quadrant="Q4", design_fixed=False, data_fixed=False,
         doc_type_slug="recycling_report", match_hints=["재활용처리결과"]),
    dict(code="Q4_16", name_kr="재활용성·소재분리 설계", quadrant="Q4", design_fixed=False, data_fixed=False,
         doc_type_slug="recyclability_design", match_hints=["재활용성소재분리설계"]),
]


def classify_filename(filename: str):
    """파일명(경로 아님)에 포함된 힌트로 레지스트리 항목을 찾는다. 못 찾으면 None.
    여러 힌트가 매칭되면 더 긴(더 구체적인) 힌트를 우선한다."""
    best = None
    for entry in REGISTRY:
        for hint in entry["match_hints"]:
            if hint.lower() in filename.lower():
                if best is None or len(hint) > best[1]:
                    best = (entry, len(hint))
    return best[0] if best else None
