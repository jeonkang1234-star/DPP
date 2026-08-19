# -*- coding: utf-8 -*-
"""FastAPI로 감싼 문서 파싱 서비스.
Spring Boot BE(document 패키지)가 이 서비스를 HTTP로 호출해서 단일 업로드 문서를 파싱한다.
main.py(CLI, 목데이터 배치 테스트용)와는 별개 경로 - 여기는 "실제 업로드된 문서 1건" 처리 전용."""
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
import fitz

import registry
import extractor
import qr
import hasher
import biz_reg

app = FastAPI(title="DPP Document Parser", version="0.1.0")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/verify-biz-cert")
async def verify_biz_cert(
    file: UploadFile = File(...),
    biz_reg_no: str = Form(...),
    company_name: str = Form(...),
):
    """가입 자동승인용 - 업로드된 사업자등록증에서 사업자등록번호/상호를 뽑아 가입 입력값과
    대조한다(2026-08-19 강 요청 - 체크섬 단독 자동승인 대신 문서 형식·데이터 확인으로 대체).
    실제 국세청 DB 실시간 대조는 이 프로토타입 범위 밖이라 여전히 안 하지만, "파일 첨부
    여부"만 보는 것보다는 실질적인 검증이다. BE(OrganizationService)가 이 결과를 보고
    auto_approvable=true일 때만 즉시 승인하고, 그 외엔 관리자 수동 심사(PENDING)로 보낸다."""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="빈 파일입니다.")

    extracted = biz_reg.extract_biz_reg_fields(content)
    verdict = biz_reg.verify_against_signup(extracted, biz_reg_no, company_name)
    return verdict


@app.get("/registry")
def list_registry():
    """문서 업로드 UI에서 문서유형 선택 드롭다운 채울 때 쓰라고 노출."""
    return [
        {
            "code": e["code"],
            "name_kr": e["name_kr"],
            "quadrant": e["quadrant"],
            "design_fixed": e["design_fixed"],
            "data_fixed": e["data_fixed"],
            "doc_type_slug": e["doc_type_slug"],
        }
        for e in registry.REGISTRY
    ]


@app.post("/parse")
async def parse_document(
    file: UploadFile = File(...),
    registry_code: str = Form(...),
    include_raw_text: bool = Form(False),
):
    entry = next((e for e in registry.REGISTRY if e["code"] == registry_code), None)
    if entry is None:
        raise HTTPException(status_code=400, detail=f"알 수 없는 registry_code: {registry_code}")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="빈 파일입니다.")

    try:
        doc = fitz.open(stream=content, filetype="pdf")
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"PDF를 열 수 없습니다: {exc}")

    try:
        pages_text = []
        qr_payloads = []
        for page in doc:
            pages_text.append(page.get_text())
            qr_payloads.extend(qr.decode_qr_on_page(page))
        raw_text = "\n".join(pages_text)
        page_count = doc.page_count
    finally:
        doc.close()

    if not raw_text.strip():
        raise HTTPException(
            status_code=422,
            detail="텍스트를 추출하지 못했습니다 (스캔본/이미지 PDF일 수 있음 - 현재 OCR 미지원)",
        )

    common = extractor.extract_common_fields(raw_text)
    extended = extractor.extract_extended_fields(entry["code"], raw_text)
    text_sha256 = hasher.sha256_of_text(raw_text)

    record = {
        "source_filename": file.filename,
        "registry_code": entry["code"],
        "doc_type_name": entry["name_kr"],
        "doc_type_slug": entry["doc_type_slug"],
        "quadrant": entry["quadrant"],
        "design_fixed": entry["design_fixed"],
        "data_fixed": entry["data_fixed"],
        "page_count": page_count,
        **common,
        **extended,
        "qr_payloads": qr_payloads,
        "text_sha256": text_sha256,
    }
    if include_raw_text:
        record["raw_text"] = raw_text

    return record
