-- =====================================================================
-- product_model.model_name 을 '제품명'(MODEL_NAME) 값으로 소급 교체
-- 2026-08-23 강 요청: "이미 만든 DPP들이어도 무조건 QR 찍었을 때 맨 위에
--                      S355JR 말고 제품명이 나오게"
--
-- ■ 왜 강종이 떠 있었나
--   ProductNaming.nameFieldCode(STEEL) 이 'STEEL_GRADE' 를 돌려줬다. 그래서
--   임시저장할 때마다 product_model.model_name 에 강종(S355JR)이 들어갔고,
--   공개 여권(QR)·대시보드·EU 레지스트리가 전부 그 컬럼을 읽었다. 정작
--   requirement_field 의 MODEL_NAME('제품명', 필수)은 자바 코드 어디에서도
--   읽히지 않는 죽은 필드였다.
--
-- ■ 이 마이그레이션이 하는 일
--   dpp_field_value 에 MODEL_NAME 값이 들어 있는 DPP 는 그 값으로 model_name 을
--   덮는다. 앞으로 저장되는 DPP 는 FieldFormService.syncModelName 이 같은 규칙으로
--   맞추므로 결과가 같아야 한다 - 한쪽을 고치면 다른 쪽도 같이 봐야 한다.
--
-- ■ 안 건드리는 것
--   MODEL_NAME 값이 없거나 공백인 DPP. 그 경우 지울 이름이 아니라 대체할 이름이
--   없는 것이므로 기존 값(강종 등)을 그대로 둔다 - 빈칸보다는 강종이 낫다.
--   공개 여권은 읽는 쪽에서도 MODEL_NAME 을 먼저 보므로(PublicPassportService.
--   resolveProductName), 이 마이그레이션을 못 돌린 환경에서도 QR 제목은 맞게 나온다.
--   이 UPDATE 는 목록·대시보드·레지스트리처럼 model_name 컬럼을 그대로 읽는
--   화면까지 같이 맞추기 위한 것이다.
-- =====================================================================

UPDATE product_model pm
   SET model_name = TRIM(v.value_text)
  FROM dpp d
  JOIN dpp_field_value v
    ON v.dpp_id = d.dpp_id
   AND v.field_code = 'MODEL_NAME'
 WHERE d.model_id = pm.model_id
   AND v.value_text IS NOT NULL
   AND TRIM(v.value_text) <> ''
   AND pm.model_name IS DISTINCT FROM TRIM(v.value_text);
