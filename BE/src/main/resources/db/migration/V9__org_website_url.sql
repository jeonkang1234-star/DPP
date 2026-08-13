-- FE 마이페이지 "기업 기본정보" 카드에 홈페이지 URL 입력란이 있었는데, organization 테이블에
-- 이걸 저장할 컬럼이 없었다(V1__schema.sql엔 아예 없음) - 지금까지는 FE 로컬 state에만
-- 남고 새로고침하면 사라지는 가짜 저장이었다. 실제로 PUT /me/organization에 반영되게
-- 컬럼을 추가한다.
ALTER TABLE organization ADD COLUMN website_url VARCHAR(300);
