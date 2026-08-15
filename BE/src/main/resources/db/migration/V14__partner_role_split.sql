-- 협력사 역할 세분화: 지금까지 MANUFACTURER 담당으로 잡혀있던 항목 중, 실제로는
-- 원자재/화학 공급사 또는 제3자 시험·인증기관이 발급/제공하는 게 맞는 것들을 재배정한다.
-- (2026-08-15, 강이 공유한 "데이터 출처 8분류" 참고자료 기준)
--
-- ② 원자재·소재·화학 공급사 (상류 공급망) -> RAW_SUPPLIER
--    SDS·화학물질 선언서(우려물질 SoC/PFAS)는 원자재 공급사가 낸다. 스크랩 매입증빙/
--    재생함유율(RECYCLED_SCRAP_RATE/SCRAP_SOURCE/SCRAP_PROOF)은 이미 RAW_SUPPLIER라
--    이번엔 안 건드림.
UPDATE requirement_field
   SET responsible_role = 'RAW_SUPPLIER'
 WHERE field_code IN ('SOC_PRESENT', 'SOC_LIST', 'SVHC_OVER_THRESHOLD')
    OR linked_doc_type = 'SOC_SDS';

-- ① 제3자 인증·시험기관 (검증된 문서) -> TEST_LAB (role 테이블에 이미 시딩되어 있었지만
--    지금까지 어떤 requirement_field도 안 쓰고 있었음 - V3__seed_master.sql 참고)
--    시험성적서/LCA·EPD·탄소보고서는 공인 시험소·LCA 검증기관이 낸다. 거기서 나오는
--    탄소발자국 수치(PCF_VALUE/PCF_METHOD/PCF_SCOPE_BREAKDOWN)도 같이 옮긴다.
UPDATE requirement_field
   SET responsible_role = 'TEST_LAB'
 WHERE field_code IN ('PCF_VALUE', 'PCF_METHOD', 'PCF_SCOPE_BREAKDOWN')
    OR linked_doc_type IN ('TEST_REPORT', 'LCA_EPD', 'PCF_REPORT');

-- 나머지는 그대로 유지:
--   ③ 제철소(Mill Sheet, 화학조성, Heat/Cast/Lot 등) -> MANUFACTURER (우리 테스트 조직이
--      제철소 겸 제조사라 분리 안 함)
--   ④ 제조사 자체작성/자기선언(기술문서/사용설명서/라벨/EU DoC) -> MANUFACTURER
--   ⑤ 표준·등록 발급기관 인용값(GTIN/HS/UOI/UFI/원산지증명서) -> 제조사가 직접 기입/제출
--      -> MANUFACTURER
