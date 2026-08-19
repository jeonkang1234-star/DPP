# -*- coding: utf-8 -*-
"""사업자등록증(Business Registration Certificate) 텍스트 추출 + 형식/일치 검증.

2026-08-19 강 요청 대응 - 가입 자동승인을 국세청 체크섬(형식 검증만, 실제 DB 대조 아님)
단독 대신 "사업자등록증 첨부 + 형식·데이터 확인"으로 바꾸기 위한 모듈. 실제 국세청
사업자등록정보 진위확인 API(계약·인증키 필요)는 이 프로토타입 범위 밖이라 여전히 붙지
않는다 - 그 대신 다음 두 단계로 "첨부 여부만 확인"보다는 실질적인 검증을 한다:

  1) 문서에서 "사업자등록증" 문서 자체의 특징적인 문구(사업자등록증/등록번호/상호 등)와
     실제 사업자등록번호·상호 값을 뽑는다 - PDF에 텍스트 레이어가 있으면(국세청 홈택스
     발급 PDF 대부분이 여기 해당) PyMuPDF로 바로 뽑고, 스캔 이미지라 텍스트 레이어가
     없으면 pytesseract(Tesseract OCR)로 폴백한다.
  2) 뽑힌 사업자등록번호가 가입 시 입력한 번호와 정확히 일치하는지, 상호가 입력한
     회사명과 (공백/괄호/주식회사 표기 차이를 무시하고) 유사한지 비교한다.

국세청 실물 DB 대조가 아니라는 한계는 분명히 남지만, 최소한 "이 파일이 진짜 사업자등록증
내용을 담고 있고 입력값과 실제로 일치하는지"는 확인하므로 단순 "파일 첨부 여부" 확인보다
훨씬 신뢰도가 높다.
"""
import re
import io

try:
    import fitz  # PyMuPDF
except ImportError:  # pragma: no cover
    fitz = None

# 사업자등록증 특유의 문구 - 이게 없으면 아예 다른 문서를 잘못 올린 것으로 본다.
_TITLE_PAT = re.compile(r"사업자\s*등록증")

# "등록번호 : 123-45-67890" / "사업자등록번호: 1234567890" 둘 다 받는다.
_BIZ_NO_PAT = re.compile(r"(?:사업자)?\s*등록\s*번호\s*[:：]?\s*(\d{3}\s*-?\s*\d{2}\s*-?\s*\d{5})")

# "상호 : (주)회사명" / "법인명(단체명): 회사명" 둘 다 받는다. 줄 끝까지, 다음 라벨 전까지만.
_COMPANY_NAME_PAT = re.compile(
    r"(?:상\s*호|법인명\s*\(?\s*단체명\s*\)?)\s*[:：]?\s*([^\n]+?)(?:\s{2,}|$)", re.MULTILINE)

# "대표자 : 홍길동" / "성명(대표자): 홍길동"
_REP_NAME_PAT = re.compile(r"(?:대\s*표\s*자|성명\s*\(?\s*대표자\s*\)?)\s*[:：]?\s*([^\n]+?)(?:\s{2,}|$)",
                            re.MULTILINE)

# "개업연월일 : 2020년 03월 15일" / "개업연월일: 2020-03-15"
_OPEN_DATE_PAT = re.compile(r"개업\s*연월일\s*[:：]?\s*([0-9]{4}[.\-년]\s*[0-9]{1,2}[.\-월]\s*[0-9]{1,2}\s*일?)")


def _normalize_biz_no(raw: str) -> str:
    return re.sub(r"[^0-9]", "", raw)


def extract_text_layer(file_bytes: bytes) -> str:
    """PDF 텍스트 레이어를 우선 시도. 이미지 PDF/텍스트 레이어 없음이면 빈 문자열."""
    if fitz is None:
        return ""
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception:
        return ""
    try:
        text = "\n".join(page.get_text() for page in doc)
    finally:
        doc.close()
    return text


def extract_text_ocr(file_bytes: bytes) -> str:
    """텍스트 레이어가 없는 스캔 이미지 PDF/이미지 파일용 OCR 폴백.
    pytesseract/시스템 tesseract-ocr(한국어 학습데이터 kor 포함)가 없으면 빈 문자열을
    반환한다 - 이 경우 문서 하단에서 "OCR 사용 불가"로 표시되고 관리자 수동 심사로 빠진다."""
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        return ""

    texts = []
    try:
        if fitz is not None:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            try:
                for page in doc:
                    # 200dpi 정도면 사업자등록증 표 형태 텍스트 인식에 충분하다.
                    pix = page.get_pixmap(dpi=200)
                    img = Image.open(io.BytesIO(pix.tobytes("png")))
                    texts.append(pytesseract.image_to_string(img, lang="kor+eng"))
            finally:
                doc.close()
        else:
            img = Image.open(io.BytesIO(file_bytes))
            texts.append(pytesseract.image_to_string(img, lang="kor+eng"))
    except Exception:
        return ""
    return "\n".join(texts)


def extract_biz_reg_fields(file_bytes: bytes) -> dict:
    """사업자등록증에서 뽑을 수 있는 필드 + 어떤 경로(텍스트 레이어/OCR)로 뽑았는지 반환."""
    text = extract_text_layer(file_bytes)
    source = "text_layer"
    if not text.strip():
        text = extract_text_ocr(file_bytes)
        source = "ocr"
        if not text.strip():
            source = "none"

    is_biz_reg_doc = bool(_TITLE_PAT.search(text))
    biz_no_match = _BIZ_NO_PAT.search(text)
    company_match = _COMPANY_NAME_PAT.search(text)
    rep_match = _REP_NAME_PAT.search(text)
    open_date_match = _OPEN_DATE_PAT.search(text)

    return {
        "extraction_source": source,  # "text_layer" | "ocr" | "none"
        "is_biz_reg_document": is_biz_reg_doc,
        "biz_reg_no": _normalize_biz_no(biz_no_match.group(1)) if biz_no_match else None,
        "company_name": company_match.group(1).strip() if company_match else None,
        "representative_name": rep_match.group(1).strip() if rep_match else None,
        "open_date": open_date_match.group(1).strip() if open_date_match else None,
        "raw_text_length": len(text),
    }


def _normalize_company_name(name: str) -> str:
    """"(주)회사명"/"주식회사 회사명"/"회사명 주식회사" 표기 차이·공백·특수문자를 무시하고
    비교하기 위한 정규화. 완전 문자열 일치가 아니라 포함 관계로 비교하는 이유는, 사업자
    등록증엔 종종 대표자 개인명이나 지점명이 덧붙어 완전 일치가 오히려 더 잘 실패하기
    때문이다."""
    if not name:
        return ""
    n = name.strip()
    n = re.sub(r"\(주\)|주식회사|㈜|\(유\)|유한회사|\(합\)|합자회사", "", n)
    n = re.sub(r"\s+", "", n)
    return n.lower()


def verify_against_signup(extracted: dict, expected_biz_reg_no: str, expected_company_name: str) -> dict:
    """가입 입력값과 대조해서 최종 판정(자동승인 가능/불가)을 내린다.
    자동승인 가능 조건: (1) 사업자등록증 문서로 인식됨 (2) 사업자등록번호가 정확히 일치
    (3) 상호가 (정규화 후) 부분 일치. 셋 중 하나라도 어긋나면 관리자 수동 심사로 보낸다 -
    "첨부 여부만 확인"이 아니라 실제 내용 대조를 요구하기 위함(2026-08-19 강 요청)."""
    reasons = []

    if extracted["extraction_source"] == "none":
        reasons.append("문서에서 텍스트를 전혀 읽지 못했습니다(스캔 품질 문제이거나 OCR 엔진 미설치).")
    if not extracted["is_biz_reg_document"]:
        reasons.append("사업자등록증 문서로 보이지 않습니다('사업자등록증' 문구를 찾지 못함).")

    extracted_no = extracted.get("biz_reg_no")
    expected_no_norm = _normalize_biz_no(expected_biz_reg_no or "")
    biz_no_match = extracted_no is not None and extracted_no == expected_no_norm
    if extracted_no is None:
        reasons.append("사업자등록번호를 문서에서 읽지 못했습니다.")
    elif not biz_no_match:
        reasons.append(f"사업자등록번호 불일치 (가입 입력: {expected_no_norm}, 문서: {extracted_no}).")

    extracted_name = extracted.get("company_name")
    name_match = False
    if extracted_name:
        norm_extracted = _normalize_company_name(extracted_name)
        norm_expected = _normalize_company_name(expected_company_name or "")
        name_match = bool(norm_expected) and (norm_expected in norm_extracted or norm_extracted in norm_expected)
        if not name_match:
            reasons.append(f"상호 불일치 (가입 입력: {expected_company_name}, 문서: {extracted_name}).")
    else:
        reasons.append("상호를 문서에서 읽지 못했습니다.")

    auto_approvable = extracted["is_biz_reg_document"] and biz_no_match and name_match

    return {
        "auto_approvable": auto_approvable,
        "biz_reg_no_match": biz_no_match,
        "company_name_match": name_match,
        "reasons": reasons,
        "extracted": extracted,
    }
