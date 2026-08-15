-- MILL_SHEET는 DocumentIngestService(/document/upload/steel-mill)가 화학성분 ZKP 증명
-- (steel-mill-check 회로)까지 실제로 돌리는 유일한 문서 유형인데, V3__seed_master.sql
-- 시딩 당시 is_zkp_target이 FALSE로 잘못 들어갔다(2026-08-15 발견 - FE "입력 검증 결과"
-- 패널을 문서 유형별 is_zkp_target 기준 3분류로 나누는 작업 중 확인됨).
-- 이미 적용된 V3 마이그레이션은 체크섬 때문에 직접 고칠 수 없어 별도 마이그레이션으로 정정.
UPDATE document_type SET is_zkp_target = TRUE WHERE doc_type_code = 'MILL_SHEET';
