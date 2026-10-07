-- DPP 발급 단위(모델 / 배치 / 개별) - 2026-10-07.
--
-- ESPR (EU) 2024/1781 제9조는 제품군별 위임법령이 여권을 모델(model)·배치(batch)·개별(item)
-- 중 어느 단위로 만들지 정하게 하고, 표준(CEN-CENELEC JTC 24)도 세 단위를 다 다룰 수 있어야
-- 한다. 지금까지는 DPP 가 무엇을 대표하는지 기록하는 곳이 없었다(batch 테이블과 dpp.batch_id 는
-- V1 부터 있었지만 쓰는 코드가 없다).
--
-- 기본값은 도메인별로 다르다.
--   STEEL   BATCH - 제강 성적서·CBAM 이 용해 번호(Heat) 단위로 나온다. 같은 Heat 로 만든 코일·후판 묶음 = 여권 1개.
--   BATTERY ITEM  - EU 배터리규정 제77조: 배터리마다(개별) 여권.
--   TEXTILE MODEL - 섬유는 위임법령 전이라 모델 단위로 시작한다.
-- 단위의 식별 키(Heat No. · 개별 고유식별자 · GTIN)는 이미 dpp_field_value 에 있다 - 여기선 단위만 저장한다.
ALTER TABLE dpp ADD COLUMN passport_level VARCHAR(10) NOT NULL DEFAULT 'BATCH'
    CHECK (passport_level IN ('MODEL', 'BATCH', 'ITEM'));

UPDATE dpp SET passport_level = 'ITEM'  WHERE domain = 'BATTERY';
UPDATE dpp SET passport_level = 'MODEL' WHERE domain = 'TEXTILE';

COMMENT ON COLUMN dpp.passport_level IS
    'DPP 발급 단위 MODEL/BATCH/ITEM (ESPR 제9조). STEEL=BATCH, BATTERY=ITEM, TEXTILE=MODEL 이 기본';
