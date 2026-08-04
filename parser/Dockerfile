# 저장소 경로: dpp-doc-parser/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# opencv-python이 필요로 하는 최소 시스템 라이브러리 (GUI 없는 headless 환경)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
