-- V3__seed_master.sql의 document_type 시딩 당시 is_zkp_target이 "나중에 ZKP 회로를 만들
-- 계획인 문서"라는 의미의 자리표시자로 TRUE가 박혀 있던 4종(TECH_FILE/LCA_EPD/SCRAP_PROOF/
-- SOC_SDS)을 FALSE로 되돌린다.
--
-- 실제로 ZKP 회로+전용 업로드 엔드포인트가 있는 문서는 MILL_SHEET(V12__mill_sheet_zkp_
-- target_fix.sql)와 CBAM_REPORT(V13__cbam_report_document_type.sql) 둘뿐이다(zkp-o1js/
-- server.mjs에 /prove/steel-mill-check, /prove/cbam-check 두 라우트만 있음).
--
-- 그런데 이 4종은 여전히 V3 시딩값(TRUE) 그대로 남아있어서, FE(DocumentSlotService.
-- upload 가드, makerVals.js uploadDisabled)가 "위 전용 업로드 박스를 이용해 주세요"라고
-- 안내하는데 정작 그 전용 박스가 존재하지 않는 상태였다 - 즉 이 4종은 어떤 경로로도
-- 업로드가 불가능했다(2026-08-15, 강이 LCA/EPD 업로드하다가 발견. SCRAP_PROOF도 같은
-- 상태라 RAW_SUPPLIER 협력사 플로우까지 막혀있었음).
UPDATE document_type
   SET is_zkp_target = FALSE
 WHERE doc_type_code IN ('TECH_FILE', 'LCA_EPD', 'SCRAP_PROOF', 'SOC_SDS');
