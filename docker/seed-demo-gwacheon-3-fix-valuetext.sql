-- =====================================================================
--  시연용 과천제철 세트 - 3차: value_text 복구 (필수 실행)
--
--  ■ 왜 필요한가 (1·2차 시드의 버그 수정)
--    백엔드는 모든 필드값을 value_text 하나에만 저장한다 - 불리언도 'true'/
--    'false' 문자열, JSON도 원문 문자열(FieldFormService.setValueText 참고).
--    그런데 1차 시드가 NUMBER/BOOLEAN/JSON/DATE 값을 타입별 컬럼에 넣고
--    value_text를 NULL로 뒀다. 읽는 쪽은 전부
--      Collectors.toMap(fieldCode, getValueText)
--    라서 value_text가 NULL인 행이 하나라도 있으면 NPE로 500이 난다.
--      - GET /public/dpp/{uuid} 500  -> EU 열람 모달 "No message available"
--      - GET /me/field-form   500    -> 입력 화면이 목데이터 구화면으로 폴백
--
--  *** 실행 (docker/ 디렉터리에서) ***
--    docker cp seed-demo-gwacheon-3-fix-valuetext.sql dpp-postgres:/tmp/s3.sql
--    docker exec -i dpp-postgres psql -U dpp -d dpp -f /tmp/s3.sql
-- =====================================================================
\set ON_ERROR_STOP on
BEGIN;

-- value_text가 빈 행을 타입별 컬럼에서 문자열로 복원한다.
--   NUMBER : trim_scale로 뒷자리 0 제거 ('21.300000' -> '21.3')
--   BOOLEAN: 'true'/'false' (FE 드롭다운 value와 동일)
--   JSON   : 원문 문자열
--   DATE   : ISO 형식
UPDATE dpp_field_value f
   SET value_text = COALESCE(
         f.value_text,
         trim_scale(f.value_num)::text,
         CASE WHEN f.value_bool IS NOT NULL
              THEN CASE WHEN f.value_bool THEN 'true' ELSE 'false' END END,
         f.value_json::text,
         f.value_date::text),
       -- 실제 앱은 타입별 컬럼을 쓰지 않으므로 앱이 만든 행과 똑같이 비워
       -- 화면·스냅샷·attributes 캐시가 전부 문자열 기준으로 일관되게 한다
       value_num = NULL, value_bool = NULL, value_json = NULL, value_date = NULL,
       updated_at = now()
 WHERE f.dpp_id = (SELECT dpp_id FROM dpp WHERE serial_number = 'GCS-2026-0201-H400')
   AND (f.value_num IS NOT NULL OR f.value_bool IS NOT NULL
     OR f.value_json IS NOT NULL OR f.value_date IS NOT NULL);

COMMIT;

-- 캐시·완성도 재생성 + 발급 스냅샷 1건 생성(앵커 MOCK)
SELECT fn_recalc_completeness(dpp_id) AS 완성도,
       fn_refresh_dpp_attributes(dpp_id)
  FROM dpp WHERE serial_number = 'GCS-2026-0201-H400';

SELECT CASE WHEN EXISTS (SELECT 1 FROM dpp_snapshot s
                          WHERE s.dpp_id = d.dpp_id)
            THEN NULL
            ELSE fn_create_dpp_snapshot(d.dpp_id, 'ISSUE',
                   (SELECT user_id FROM user_account
                     WHERE email = 'jeonkang1234+t333@tukorea.ac.kr'), TRUE)
       END AS 스냅샷ID
  FROM dpp d WHERE d.serial_number = 'GCS-2026-0201-H400';

-- =====================================================================
--  확인
-- =====================================================================
\echo ''
\echo '--- value_text가 아직 NULL인 행 (0이어야 정상) ---'
SELECT count(*) AS null_value_text
  FROM dpp_field_value f
 WHERE f.dpp_id = (SELECT dpp_id FROM dpp WHERE serial_number = 'GCS-2026-0201-H400')
   AND f.value_text IS NULL;

\echo ''
\echo '--- 완성도 ---'
SELECT display_name, status, filled_count || '/' || required_count AS 채움, completeness
  FROM dpp WHERE serial_number = 'GCS-2026-0201-H400';

\echo ''
\echo '--- 값 샘플 (형태 확인) ---'
SELECT field_code, value_text
  FROM dpp_field_value
 WHERE dpp_id = (SELECT dpp_id FROM dpp WHERE serial_number = 'GCS-2026-0201-H400')
   AND field_code IN ('RECYCLED_SCRAP_RATE','TOTAL_SCRAP_INPUT_RATIO_PCT','SOC_PRESENT',
                      'CBAM_APPLICABLE','PCF_SCOPE_BREAKDOWN','DIMENSION','PRODUCTION_DATE')
 ORDER BY field_code;
