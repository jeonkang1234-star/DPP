-- 협력사(RAW_SUPPLIER) 담당 항목 중 수기 입력으로 남아 있던 4개를 "문서에서 채움"으로 바꾼다
-- (2026-10-06 강 지적: "함유 여부를 O/X로 손으로 받는 게 맞냐, 밀시트·스크랩 매입증빙에서
-- 뽑아야지").
--
-- ■ 왜 이 4개만 MANUAL 이었나
-- V21(T0·T1 재구축)이 분류표와 매칭되는 행만 data_source 를 실제 값으로 덮어썼고, V4 의
-- 초기 철강 항목 중 아래 4개는 분류표 이름과 안 맞아서 V20 백필값(MANUAL)에 그대로 남았다.
-- 같은 화면의 SVHC 물질명·농도·RoHS·6가크롬(V21 출신)은 이미 PARSER 였다.
--
-- ■ 영지식증명 대상이 아닌 이유
-- 네 항목 모두 공개해야 하는 값이다(REACH Art.33 은 SVHC 물질명 자체를 공급망에 알리게 하고,
-- ESPR 재생원료 함유율은 '기준 이상'이 아니라 실제 수치를 요구한다). 숨길 값이 없으니
-- TRADE_SECRET(=ZKP 대체)이 아니라 문서 파싱이 맞다. 스크랩 출처는 기존대로 RESTRICTED.
--
-- ■ 어디서 채워지나
--   RECYCLED_SCRAP_RATE, SCRAP_SOURCE  : 스크랩 매입증빙(SCRAP_PROOF) - parser/spec_fields.py 라벨 사전
--   SOC_PRESENT, SVHC_OVER_THRESHOLD   : 우려물질 정보/SDS(SOC_SDS) - SDS 에 적힌 SVHC 농도·물질명에서
--                                        BE 가 판정(DocumentSlotService.deriveSubstanceFlags)
UPDATE requirement_field
   SET data_source = 'PARSER'
 WHERE field_code IN ('SOC_PRESENT', 'SVHC_OVER_THRESHOLD', 'RECYCLED_SCRAP_RATE', 'SCRAP_SOURCE');
