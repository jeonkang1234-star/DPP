-- 제조사가 DPP 데이터 입력 화면에서 등록하는 제품 사진. 파일 자체는 업로드 볼륨
-- (document.upload-dir/dpp-photos)에 저장하고, 여기엔 경로와 MIME 타입만 둔다.
ALTER TABLE dpp
    ADD COLUMN IF NOT EXISTS product_photo_uri          TEXT,
    ADD COLUMN IF NOT EXISTS product_photo_content_type VARCHAR(100);
