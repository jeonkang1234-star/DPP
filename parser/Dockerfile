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

# 모듈을 손으로 나열하지 않고 최상위 .py 전부를 복사한다.
#
# 예전에는 파일명을 하나씩 적었는데, 2026-08-19에 파서 모듈이 2개 늘면서(spec_extractor.py,
# spec_fields.py) 그 목록에 추가하는 걸 빠뜨렸다. 결과는 이미지 빌드는 멀쩡히 성공하고
# 컨테이너를 띄우는 순간 ModuleNotFoundError로 죽는 것 - docker compose up 로그에는
# "dependency parser failed to start"만 뜨고 진짜 원인은 컨테이너 로그를 따로 봐야 보인다.
#
# 최상위에는 서비스 모듈만 있고 테스트는 tests/ 아래라 이 패턴에 안 걸린다. main.py(배치
# CLI)가 같이 들어오지만 몇 KB짜리고, 목록 누락으로 서비스가 죽는 것보다 낫다.
COPY *.py ./

EXPOSE 8000

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
