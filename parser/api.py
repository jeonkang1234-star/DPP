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

app = FastAPI(title="DPP Document Parser", version="0.1.0")


@app.get("/health")
def health():
    return {"status": "ok"}


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
