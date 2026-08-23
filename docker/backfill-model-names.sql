-- =============================================================================
-- product_model.model_name 자리표시자 일괄 교정
--
-- 배경: FieldFormService.createDraftDpp는 "첫 임시저장" 시점에만 model_name을 정했다.
-- 그 순간 제품명 칸이 비어 있으면 "미입력 철강 제품" 같은 자리표시자가 박혔고,
-- 사용자가 나중에 제품명을 채워도 그 값은 dpp_field_value로만 들어가서 product_model
-- 쪽은 영원히 자리표시자였다. 그래서 QR(공개 여권)로 열면 제품명이 "미입력 ..."으로
-- 보였다(2026-08-23 강 지적).
--
-- 코드는 두 군데를 고쳤다.
--   1) FieldFormService.syncModelName - 저장할 때마다 model_name을 다시 맞춘다(앞으로).
--   2) PublicPassportService.resolveProductName - 읽을 때 대체 이름을 찾는다(과거분 화면).
--
-- 화면은 (2)로 이미 정상이지만, DB의 model_name 자체를 읽는 기능이 두 개 더 있다.
--   - 개인회원 제품 검색(PersonalProductSearchRepository: model_name/brand ILIKE)
--   - EU 레지스트리 검색(DppRegistrySearchRepository)
-- 이 검색들까지 맞추려면 저장된 값 자체를 고쳐야 해서 이 스크립트를 둔다.
--
-- 사용법(EC2):
--   docker cp docker/backfill-model-names.sql dpp-postgres:/tmp/
--   docker exec -it dpp-postgres psql -U dpp -d dppdb -f /tmp/backfill-model-names.sql
-- =============================================================================

BEGIN;

-- 확인용: 지금 자리표시자로 남아 있는 것들
SELECT m.model_id, m.domain, m.model_name AS before_name,
       COALESCE(
           NULLIF(TRIM(fv.value_text), ''),
           NULLIF(TRIM(d.display_name), '')
       ) AS after_name
FROM product_model m
JOIN dpp d ON d.model_id = m.model_id
LEFT JOIN dpp_field_value fv
       ON fv.dpp_id = d.dpp_id
      AND fv.field_code = CASE m.domain
                              WHEN 'TEXTILE' THEN 'FABRIC_TYPE'
                              WHEN 'BATTERY' THEN 'BATTERY_MODEL_NO'
                              ELSE 'STEEL_GRADE'
                          END
WHERE m.model_name IN ('미입력 철강 제품', '미입력 섬유 제품', '미입력 배터리 제품')
ORDER BY m.model_id;

-- 실제 교정. 대체할 이름을 못 찾은 행은 건드리지 않는다(자리표시자 그대로 남는다).
UPDATE product_model m
SET model_name = LEFT(src.new_name, 200)
FROM (
    SELECT DISTINCT ON (m2.model_id)
           m2.model_id,
           COALESCE(
               NULLIF(TRIM(fv.value_text), ''),
               NULLIF(TRIM(d.display_name), '')
           ) AS new_name
    FROM product_model m2
    JOIN dpp d ON d.model_id = m2.model_id
    LEFT JOIN dpp_field_value fv
           ON fv.dpp_id = d.dpp_id
          AND fv.field_code = CASE m2.domain
                                  WHEN 'TEXTILE' THEN 'FABRIC_TYPE'
                                  WHEN 'BATTERY' THEN 'BATTERY_MODEL_NO'
                                  ELSE 'STEEL_GRADE'
                              END
    WHERE m2.model_name IN ('미입력 철강 제품', '미입력 섬유 제품', '미입력 배터리 제품')
    ORDER BY m2.model_id, d.issued_at DESC NULLS LAST, d.dpp_id DESC
) src
WHERE m.model_id = src.model_id
  AND src.new_name IS NOT NULL;

-- 결과 확인
SELECT m.model_id, m.domain, m.model_name
FROM product_model m
ORDER BY m.model_id;

COMMIT;
