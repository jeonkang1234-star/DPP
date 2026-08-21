-- =====================================================================
-- 영업비밀 필드에 평문으로 저장돼 있던 실측값 제거 - 2026-08-20 강 지적
--   "영업비밀(ZKP 대체)라고 되어있는 항목들은 O/X만 보여줘야 하는 것 아닌지.
--    파싱을 하더라도 결국엔 ZKP를 거치면 다른 값이 되고, 영업비밀이라면 사이트에
--    올라오면 안 되기 때문에"
--
-- 맞는 지적이다. DocumentIngestService는 처음부터 "실측값(private input)은 어디에도
-- 저장하지 않는다"를 원칙으로 삼았는데, 2026-08-19에 붙인 SpecFieldAutoFillService가
-- 파서 결과를 그대로 dpp_field_value에 넣으면서 그 원칙이 깨져 있었다. 화학성분
-- Mn/Cr/Ni 실측치 같은 값이 평문으로 DB에 들어갔고 제조사 입력 폼에도 그대로 보였다.
--
-- 코드는 고쳤고(SpecFieldAutoFillService: 영업비밀 필드에는 판정 토큰만 기록,
-- FieldFormService.upsertValues: 직접 입력 차단), 이 마이그레이션은 이미 들어간 값을
-- 지운다.
--
--   - 그 DPP에 VERIFIED ZKP 증명이 있으면 -> '충족'으로 치환(완성도 유지)
--   - 증명이 없으면 -> 행 자체를 삭제. 증명 없이 "충족"이라고 쓰는 게 제일 나쁜
--     거짓말이라는 PublicPassportService의 원칙과 같다. 완성도가 그만큼 떨어지는 게
--     정직한 상태다.
--
-- 판정 토큰('충족'/'미충족')이 이미 들어 있는 행은 건드리지 않는다(재실행 안전).
-- =====================================================================

WITH secret_fields AS (
    SELECT field_code
      FROM requirement_field
     WHERE disclosure_scope = 'TRADE_SECRET'
       AND storage_target = 'FIELD_VALUE'
       AND field_kind = 'DATA'
)
UPDATE dpp_field_value v
   SET value_text = '충족',
       updated_at = now()
  FROM secret_fields s
 WHERE v.field_code = s.field_code
   AND v.value_text IS NOT NULL
   AND btrim(v.value_text) NOT IN ('충족', '미충족', '')
   AND EXISTS (
        SELECT 1 FROM zkp_proof z
         WHERE z.dpp_id = v.dpp_id AND z.status = 'VERIFIED'
   );

WITH secret_fields AS (
    SELECT field_code
      FROM requirement_field
     WHERE disclosure_scope = 'TRADE_SECRET'
       AND storage_target = 'FIELD_VALUE'
       AND field_kind = 'DATA'
)
DELETE FROM dpp_field_value v
 USING secret_fields s
 WHERE v.field_code = s.field_code
   AND v.value_text IS NOT NULL
   AND btrim(v.value_text) NOT IN ('충족', '미충족', '');

-- 값이 바뀌었으니 완성도를 다시 계산한다.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT dpp_id FROM dpp WHERE deleted_at IS NULL LOOP
        PERFORM fn_recalc_completeness(r.dpp_id);
    END LOOP;
END $$;
