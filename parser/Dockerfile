# DPP 문서 파서(FastAPI). Spring Boot BE(com.dpp.document)가 이 서비스를 HTTP로 호출한다.
FROM python:3.11-slim

WORKDIR /app

# opencv-python-headless가 필요로 하는 최소 시스템 라이브러리 + 사업자등록증 스캔본 OCR용
# tesseract-ocr(한국어 학습데이터 tesseract-ocr-kor 포함) - biz_reg.py의 OCR 폴백 경로.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libsm6 libxext6 libxrender1 \
    tesseract-ocr tesseract-ocr-kor \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY api.py extractor.py hasher.py judge.py qr.py registry.py splitter.py pipeline.py biz_reg.py ./

EXPOSE 8000

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
