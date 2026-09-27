# ▼ EC2 SSH 창에 이 파일 내용을 통째로 붙여넣으면 바로 실행됩니다 (파일 업로드 불필요)
cd /opt/app/docker
docker exec -i dpp-postgres psql -U dpp -d dpp -v ON_ERROR_STOP=1 <<'DPP_SQL_EOF'
-- =====================================================================
-- 기존(대량 시드 이전) 회원·DPP 데이터를 실제처럼 정리 - 2026-09-27
--  * 회원 org_id 1~28 의 회사명/주소/담당자/웹사이트 등 비어있거나 임시값인 항목 채움
--    (로그인 이메일·비밀번호는 그대로 - 기존 테스트 계정으로 그대로 로그인 가능)
--  * 그 회원들의 DPP 19건(과천제철 1건 제외)의 이름·모델·항목값·자재·문서를
--    같은 도메인의 시연용 DPP 를 틀로 복제해 실제 제품 데이터로 교체
--    (상태 ACTIVE/DRAFT, public_uuid, 생성일, 참여 협력사는 그대로 유지)
--  * 발급(ACTIVE) 건은 새 스냅샷(MANUAL)을 만들어 공개 여권에도 새 값이 보이게 함
-- 실행(한글 깨짐 방지 - 반드시 이 방식):
--   docker cp fix-legacy-demo-data.sql dpp-postgres:/tmp/f.sql
--   docker exec -i dpp-postgres psql -U dpp -d dpp -v ON_ERROR_STOP=1 -f /tmp/f.sql
-- 전체가 한 트랜잭션이라 중간에 실패하면 아무것도 바뀌지 않는다.
-- 두 번 실행해도 이미 바뀐 DPP 는 건너뛴다.
-- =====================================================================
\set ON_ERROR_STOP on
SET client_encoding = 'UTF8';
BEGIN;
SET LOCAL client_min_messages = warning;

-- 1) 회사 정보
UPDATE organization SET org_name = '대성제강 주식회사', biz_reg_no = '612-86-40217', uoi = COALESCE(uoi, 'KR6128640217'), eori_code = COALESCE(eori_code, 'KR6128640217'), postal_code = '44232', address_line1 = '울산광역시 울주군 온산읍 산암로 206', address_line2 = '본관 2층', city = '울산광역시', contact_name = '강도윤', contact_dept = '품질보증팀', contact_phone = '052-238-4410', contact_email = 'dy.kang@daesungsteel.co.kr', website_url = 'https://www.daesungsteel.co.kr', tier_level = 3, profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 1 AND org_name IN ('대성제강(테스트)', '대성제강 주식회사');
UPDATE organization SET org_name = '이음철강 주식회사', biz_reg_no = '123-42-48786', uoi = COALESCE(uoi, 'KR1234248786'), eori_code = COALESCE(eori_code, 'KR1234248786'), org_type = COALESCE(org_type, 'MANUFACTURER'), postal_code = '15073', address_line1 = '경기도 시흥시 산기대학로 237', address_line2 = '산학융합관 4층', city = '시흥시', contact_name = '전강', contact_dept = 'DPP 추진팀', contact_phone = '031-8041-0237', contact_email = 'kang.jeon@ieumsteel.co.kr', website_url = 'https://www.ieumsteel.co.kr', profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 2 AND org_name IN ('이음이음', '이음철강 주식회사');
UPDATE organization SET org_name = '우진메탈 주식회사', biz_reg_no = '135-81-62948', uoi = COALESCE(uoi, 'KR1358162948'), eori_code = COALESCE(eori_code, 'KR1358162948'), postal_code = '44484', address_line1 = '울산광역시 울주군 온산읍 산암로 171', address_line2 = '관리동 1층', city = '울산광역시', contact_name = '배수진', contact_dept = '원료구매팀', contact_phone = '052-231-7140', contact_email = 'sj.bae@woojinmetal.co.kr', website_url = 'https://www.woojinmetal.co.kr', profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 3 AND org_name IN ('우진메탈(테스트)', '우진메탈 주식회사');
UPDATE organization SET org_name = '아라텍스 주식회사', biz_reg_no = '312-81-55910', uoi = COALESCE(uoi, 'KR3128155910'), eori_code = COALESCE(eori_code, 'KR3128155910'), postal_code = '04781', address_line1 = '서울특별시 성동구 성수이로 118', address_line2 = '아라빌딩 5층', city = '서울특별시', contact_name = '최영진', contact_dept = '지속가능경영팀', contact_phone = '02-462-2114', contact_email = 'yj.choi@aratex.co.kr', website_url = 'https://www.aratex.co.kr', tier_level = 3, profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 4 AND org_name IN ('아라텍스(테스트)', '아라텍스 주식회사');
UPDATE organization SET org_name = '청우섬유 주식회사', biz_reg_no = '504-81-22871', uoi = COALESCE(uoi, 'KR5048122871'), eori_code = COALESCE(eori_code, 'KR5048122871'), postal_code = '41805', address_line1 = '대구광역시 서구 달서천로 72', address_line2 = '염색공단 2동', city = '대구광역시', contact_name = '문가영', contact_dept = '품질관리팀', contact_phone = '053-355-2115', contact_email = 'gy.moon@cheongwoo.co.kr', website_url = 'https://www.cheongwoo.co.kr', profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 5 AND org_name IN ('청우섬유(테스트)', '청우섬유 주식회사');
UPDATE organization SET org_name = '루멘셀 주식회사', biz_reg_no = '124-86-77203', uoi = COALESCE(uoi, 'KR1248677203'), eori_code = COALESCE(eori_code, 'KR1248677203'), postal_code = '28126', address_line1 = '충청북도 청주시 흥덕구 옥산면 과학산업2로 57', address_line2 = '연구동 3층', city = '청주시', contact_name = '이서준', contact_dept = '배터리여권팀', contact_phone = '043-279-2101', contact_email = 'sj.lee@lumencell.co.kr', website_url = 'https://www.lumencell.co.kr', tier_level = 3, profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 6 AND org_name IN ('루멘셀(테스트)', '루멘셀 주식회사');
UPDATE organization SET org_name = '산업통상자원부 무역안보정책관실', postal_code = '30118', address_line1 = '세종특별자치시 한누리대로 402', address_line2 = '정부세종청사 13동', city = '세종특별자치시', contact_dept = '무역안보정책관실', contact_phone = COALESCE(NULLIF(contact_phone, ''), '044-203-4105'), profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 7 AND org_name IN ('대한민국 산업통상자원부(테스트)', '산업통상자원부 무역안보정책관실');
UPDATE organization SET org_name = 'Generalzolldirektion (Zoll)', postal_code = '53121', address_line1 = 'Am Propsthof 78a', city = '본', contact_dept = 'Zentrale Facheinheit', profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 8 AND org_name IN ('독일 연방관세청 Zoll(테스트)', 'Generalzolldirektion (Zoll)');
UPDATE organization SET org_name = '관세청 통관국', postal_code = '35208', address_line1 = '대전광역시 서구 청사로 189', address_line2 = '정부대전청사 1동', city = '대전광역시', contact_dept = '통관기획과', contact_phone = COALESCE(NULLIF(contact_phone, ''), '042-481-7810'), profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 9 AND org_name IN ('대한민국 관세청(테스트)', '관세청 통관국');
UPDATE organization SET org_name = 'Direction générale des douanes (DGDDI)', postal_code = '93100', address_line1 = '11 Rue des Deux Communes', city = '몽트뢰유', contact_dept = 'Bureau des contrôles', profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 10 AND org_name IN ('프랑스 관세청 Douane(테스트)', 'Direction générale des douanes (DGDDI)');
UPDATE organization SET org_name = '신흥특수강 주식회사', biz_reg_no = '609-81-45127', uoi = COALESCE(uoi, 'KR6098145127'), eori_code = COALESCE(eori_code, 'KR6098145127'), postal_code = '51567', address_line1 = '경상남도 창원시 성산구 공단로 474', address_line2 = '본관', city = '창원시', contact_name = '노현우', contact_dept = '품질경영팀', contact_phone = '055-282-7101', contact_email = 'hw.noh@sinheungss.co.kr', website_url = 'https://www.sinheungss.co.kr', profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 11 AND org_name IN ('신흥특수강(테스트)', '신흥특수강 주식회사');
UPDATE organization SET org_name = 'Nordstahl GmbH', biz_reg_no = 'DE814563972', postal_code = '21107', address_line1 = 'Industriestraße 48', city = '함부르크', contact_name = 'Markus Klein', contact_dept = 'Qualitätssicherung', contact_email = 'm.klein@nordstahl.de', website_url = 'https://www.nordstahl.de', profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 12 AND org_name IN ('Nordstahl GmbH(테스트)', 'Nordstahl GmbH');
UPDATE organization SET postal_code = '47119', profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 13 AND org_name IN ('Zoll Duisburg');
UPDATE organization SET postal_code = '69003', profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 14 AND org_name IN ('Douane Lyon');
UPDATE organization SET postal_code = '3072 AP', profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 15 AND org_name IN ('Douane Rotterdam');
UPDATE organization SET postal_code = '20122', profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 16 AND org_name IN ('Agenzia delle Dogane Milano');
UPDATE organization SET org_name = '한빛제강 주식회사', biz_reg_no = '205-86-11222', uoi = COALESCE(uoi, 'KR2058611222'), eori_code = COALESCE(eori_code, 'KR2058611222'), org_type = COALESCE(org_type, 'MANUFACTURER'), postal_code = '37874', address_line1 = '경상북도 포항시 남구 괴동로 88', address_line2 = '사무동 2층', city = '포항시', contact_name = '김도현', contact_dept = '생산관리팀', contact_phone = '054-278-1122', contact_email = 'dh.kim@hanbitsteel.co.kr', website_url = 'https://www.hanbitsteel.co.kr', profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 17 AND org_name IN ('한빛제강', '한빛제강 주식회사');
UPDATE organization SET org_name = '부산세관 통관지원과', biz_reg_no = NULL, postal_code = '48943', address_line1 = '부산광역시 중구 충장대로 20', address_line2 = '부산본부세관 4층', city = '부산광역시', contact_name = '오세린', contact_dept = '통관지원과', contact_phone = '051-620-6114', contact_email = 'sr.oh@customs.go.kr', profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 18 AND org_name IN ('~세관', '부산세관 통관지원과');
UPDATE organization SET org_name = 'European Commission DG GROW', biz_reg_no = NULL, country_code = 'BE', postal_code = '1049', address_line1 = 'Avenue d''Auderghem 45', city = '브뤼셀', contact_name = 'Sophie Laurent', contact_dept = 'Unit D.1 Ecodesign', contact_phone = '+32-2-299-1111', contact_email = 'sophie.laurent@ec.europa.eu', profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 19 AND org_name IN ('~eU', 'European Commission DG GROW');
UPDATE organization SET org_name = '다온텍스타일 주식회사', biz_reg_no = '614-81-33444', uoi = COALESCE(uoi, 'KR6148133444'), eori_code = COALESCE(eori_code, 'KR6148133444'), postal_code = '42709', address_line1 = '대구광역시 달서구 성서공단로 212', city = '대구광역시', contact_name = '한지우', contact_dept = '경영지원팀', contact_phone = '053-583-3444', contact_email = 'jw.han@daontextile.co.kr', website_url = 'https://www.daontextile.co.kr', profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 20 AND org_name IN ('다온텍스타일', '다온텍스타일 주식회사');
UPDATE organization SET org_name = '세라셀 주식회사', biz_reg_no = '314-81-22334', uoi = COALESCE(uoi, 'KR3148122334'), eori_code = COALESCE(eori_code, 'KR3148122334'), postal_code = '34015', address_line1 = '대전광역시 유성구 테크노2로 199', address_line2 = '세라셀빌딩', city = '대전광역시', contact_name = '윤재희', contact_dept = '품질보증팀', contact_phone = '042-930-2233', contact_email = 'jh.yoon@ceracell.co.kr', website_url = 'https://www.ceracell.co.kr', profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 21 AND org_name IN ('세라셀', '세라셀 주식회사');
UPDATE organization SET org_name = '리사이클원 주식회사', biz_reg_no = '405-86-66778', uoi = COALESCE(uoi, 'KR4058666778'), eori_code = COALESCE(eori_code, 'KR4058666778'), postal_code = '57804', address_line1 = '전라남도 광양시 태인동 산단로 55', city = '광양시', contact_name = '서민호', contact_dept = '자원순환팀', contact_phone = '061-792-6677', contact_email = 'mh.seo@recycleone.co.kr', website_url = 'https://www.recycleone.co.kr', profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 22 AND org_name IN ('리사이클원', '리사이클원 주식회사');
UPDATE organization SET org_name = 'Douane Marseille Port', country_code = 'FR', postal_code = '13002', address_line1 = '48 Quai du Lazaret', city = '마르세유', contact_name = 'Élodie Martin', contact_dept = 'Service des contrôles', contact_phone = '+33-4-91-55-0123', contact_email = 'e.martin@douane-marseille.fr', profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 23 AND org_name IN ('어쩌구세관', 'Douane Marseille Port');
UPDATE organization SET org_name = 'European Commission DG TAXUD', country_code = 'BE', postal_code = '1049', address_line1 = 'Rue Joseph II 79', city = '브뤼셀', contact_name = 'Pieter Janssens', contact_dept = 'Customs Policy Unit', contact_phone = '+32-2-295-4400', contact_email = 'pieter.janssens@ec.europa.eu', profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 24 AND org_name IN ('어쩌구EU', 'European Commission DG TAXUD');
UPDATE organization SET org_name = 'Douane Amsterdam Schiphol', country_code = 'NL', postal_code = '1118 BA', address_line1 = 'Evert van de Beekstraat 310', city = '암스테르담', contact_name = 'Daan Bakker', contact_dept = 'Team Invoer', contact_phone = '+31-20-555-0310', contact_email = 'd.bakker@douane-schiphol.nl', profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 25 AND org_name IN ('무슨세관', 'Douane Amsterdam Schiphol');
UPDATE organization SET org_name = 'European Chemicals Agency (ECHA)', country_code = 'FI', postal_code = '00150', address_line1 = 'Telakkakatu 6', city = '헬싱키', contact_name = 'Aino Virtanen', contact_dept = 'Market Surveillance', contact_phone = '+358-9-6861-8000', contact_email = 'aino.virtanen@echa.europa.eu', profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 26 AND org_name IN ('그런EU', 'European Chemicals Agency (ECHA)');
UPDATE organization SET postal_code = '13840', address_line1 = '경기도 과천시 과천대로7나길 34', address_line2 = '과천제철 본관', city = '과천시', contact_dept = '품질보증팀', profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 27 AND org_name IN ('과천제철 주식회사');
UPDATE organization SET postal_code = '14056', address_line1 = '경기도 안양시 동안구 시민대로 327', address_line2 = '협력센터 3층', city = '안양시', contact_dept = '원료구매팀', profile_status = CASE WHEN approval_status = 'ACTIVE' THEN 'APPROVED' ELSE profile_status END, updated_at = now()
 WHERE org_id = 28 AND org_name IN ('안양협력 주식회사');

-- 2) 회원 계정 표시명·연락처 (이메일/비밀번호는 그대로)
UPDATE user_account SET display_name = '대성제강 주식회사', updated_at = now()
 WHERE org_id = 1 AND deleted_at IS NULL AND (display_name IS NULL OR display_name IN ('대성제강(테스트)') OR display_name ~ '(테스트|^~)');
UPDATE user_account SET phone = '01047182930' WHERE org_id = 1 AND deleted_at IS NULL AND phone ~ '^010(0000|9999)';
UPDATE user_account SET display_name = '이음철강 주식회사', updated_at = now()
 WHERE org_id = 2 AND deleted_at IS NULL AND (display_name IS NULL OR display_name IN ('이음이음') OR display_name ~ '(테스트|^~)');
UPDATE user_account SET display_name = '우진메탈 주식회사', updated_at = now()
 WHERE org_id = 3 AND deleted_at IS NULL AND (display_name IS NULL OR display_name IN ('우진메탈(테스트)') OR display_name ~ '(테스트|^~)');
UPDATE user_account SET phone = '01052817314' WHERE org_id = 3 AND deleted_at IS NULL AND phone ~ '^010(0000|9999)';
UPDATE user_account SET display_name = '아라텍스 주식회사', updated_at = now()
 WHERE org_id = 4 AND deleted_at IS NULL AND (display_name IS NULL OR display_name IN ('아라텍스(테스트)') OR display_name ~ '(테스트|^~)');
UPDATE user_account SET phone = '01036624114' WHERE org_id = 4 AND deleted_at IS NULL AND phone ~ '^010(0000|9999)';
UPDATE user_account SET display_name = '청우섬유 주식회사', updated_at = now()
 WHERE org_id = 5 AND deleted_at IS NULL AND (display_name IS NULL OR display_name IN ('청우섬유(테스트)') OR display_name ~ '(테스트|^~)');
UPDATE user_account SET phone = '01079412115' WHERE org_id = 5 AND deleted_at IS NULL AND phone ~ '^010(0000|9999)';
UPDATE user_account SET display_name = '루멘셀 주식회사', updated_at = now()
 WHERE org_id = 6 AND deleted_at IS NULL AND (display_name IS NULL OR display_name IN ('루멘셀(테스트)') OR display_name ~ '(테스트|^~)');
UPDATE user_account SET phone = '01063302101' WHERE org_id = 6 AND deleted_at IS NULL AND phone ~ '^010(0000|9999)';
UPDATE user_account SET display_name = '산업통상자원부 무역안보정책관실', updated_at = now()
 WHERE org_id = 7 AND deleted_at IS NULL AND (display_name IS NULL OR display_name IN ('대한민국 산업통상자원부(테스트)') OR display_name ~ '(테스트|^~)');
UPDATE user_account SET phone = '01084402105' WHERE org_id = 7 AND deleted_at IS NULL AND phone ~ '^010(0000|9999)';
UPDATE user_account SET display_name = 'Generalzolldirektion (Zoll)', updated_at = now()
 WHERE org_id = 8 AND deleted_at IS NULL AND (display_name IS NULL OR display_name IN ('독일 연방관세청 Zoll(테스트)') OR display_name ~ '(테스트|^~)');
UPDATE user_account SET display_name = '관세청 통관국', updated_at = now()
 WHERE org_id = 9 AND deleted_at IS NULL AND (display_name IS NULL OR display_name IN ('대한민국 관세청(테스트)') OR display_name ~ '(테스트|^~)');
UPDATE user_account SET phone = '01058107810' WHERE org_id = 9 AND deleted_at IS NULL AND phone ~ '^010(0000|9999)';
UPDATE user_account SET display_name = 'Direction générale des douanes (DGDDI)', updated_at = now()
 WHERE org_id = 10 AND deleted_at IS NULL AND (display_name IS NULL OR display_name IN ('프랑스 관세청 Douane(테스트)') OR display_name ~ '(테스트|^~)');
UPDATE user_account SET display_name = '신흥특수강 주식회사', updated_at = now()
 WHERE org_id = 11 AND deleted_at IS NULL AND (display_name IS NULL OR display_name IN ('신흥특수강(테스트)') OR display_name ~ '(테스트|^~)');
UPDATE user_account SET phone = '01027712111' WHERE org_id = 11 AND deleted_at IS NULL AND phone ~ '^010(0000|9999)';
UPDATE user_account SET display_name = 'Nordstahl GmbH', updated_at = now()
 WHERE org_id = 12 AND deleted_at IS NULL AND (display_name IS NULL OR display_name IN ('Nordstahl GmbH(테스트)') OR display_name ~ '(테스트|^~)');
UPDATE user_account SET display_name = '한빛제강 주식회사', updated_at = now()
 WHERE org_id = 17 AND deleted_at IS NULL AND (display_name IS NULL OR display_name IN ('한빛제강') OR display_name ~ '(테스트|^~)');
UPDATE user_account SET display_name = '부산세관 통관지원과', updated_at = now()
 WHERE org_id = 18 AND deleted_at IS NULL AND (display_name IS NULL OR display_name IN ('~세관') OR display_name ~ '(테스트|^~)');
UPDATE user_account SET display_name = 'European Commission DG GROW', updated_at = now()
 WHERE org_id = 19 AND deleted_at IS NULL AND (display_name IS NULL OR display_name IN ('~eU') OR display_name ~ '(테스트|^~)');
UPDATE user_account SET display_name = '다온텍스타일 주식회사', updated_at = now()
 WHERE org_id = 20 AND deleted_at IS NULL AND (display_name IS NULL OR display_name IN ('다온텍스타일') OR display_name ~ '(테스트|^~)');
UPDATE user_account SET display_name = '세라셀 주식회사', updated_at = now()
 WHERE org_id = 21 AND deleted_at IS NULL AND (display_name IS NULL OR display_name IN ('세라셀') OR display_name ~ '(테스트|^~)');
UPDATE user_account SET display_name = '리사이클원 주식회사', updated_at = now()
 WHERE org_id = 22 AND deleted_at IS NULL AND (display_name IS NULL OR display_name IN ('리사이클원') OR display_name ~ '(테스트|^~)');
UPDATE user_account SET display_name = 'Douane Marseille Port', updated_at = now()
 WHERE org_id = 23 AND deleted_at IS NULL AND (display_name IS NULL OR display_name IN ('어쩌구세관') OR display_name ~ '(테스트|^~)');
UPDATE user_account SET display_name = 'European Commission DG TAXUD', updated_at = now()
 WHERE org_id = 24 AND deleted_at IS NULL AND (display_name IS NULL OR display_name IN ('어쩌구EU') OR display_name ~ '(테스트|^~)');
UPDATE user_account SET display_name = 'Douane Amsterdam Schiphol', updated_at = now()
 WHERE org_id = 25 AND deleted_at IS NULL AND (display_name IS NULL OR display_name IN ('무슨세관') OR display_name ~ '(테스트|^~)');
UPDATE user_account SET display_name = 'European Chemicals Agency (ECHA)', updated_at = now()
 WHERE org_id = 26 AND deleted_at IS NULL AND (display_name IS NULL OR display_name IN ('그런EU') OR display_name ~ '(테스트|^~)');
UPDATE user_account SET display_name = '태강특수강' WHERE user_id = 1 AND org_id IS NULL AND email = 'contact@taekang.co.kr';
UPDATE user_account SET display_name = '김하준' WHERE user_id = 6 AND org_id IS NULL AND display_name ~ '^(kakao|naver|google)_';
UPDATE user_account SET display_name = '이서아' WHERE user_id = 10 AND org_id IS NULL AND display_name ~ '^(kakao|naver|google)_';

-- 3) 대상 DPP ↔ 틀 DPP 배정, 회사별 치환쌍
CREATE TEMP TABLE m_assign (old_uuid uuid, tpl_uuid uuid, keep_pct int) ON COMMIT DROP;
INSERT INTO m_assign VALUES
  ('38013d68-41f2-4212-b16c-17f8c82cb78c', '1a6d6217-6e9a-548f-b375-5073d35586cb', 100),
  ('bd0d29c3-6b1e-4bd6-bc24-8b557ed173b0', 'ce67f8dd-ed77-5013-bfcf-c7e5fe96ccf8', 100),
  ('2ca0243d-177d-4820-8b07-7d4a3ddd5d96', '844e3ca8-1be9-52b8-9fe1-bf2849b39653', 100),
  ('43b37cf4-d51a-4458-bb35-bbe4aacaf06b', '361044a7-c39e-524f-8e15-93964d4316a5', 100),
  ('d7c7471f-3523-4d3f-8364-61b575748895', '207d7047-f0fb-59a4-a069-21e991fbc99e', 100),
  ('54e50ee1-4653-4b27-bfae-3ec7924af298', '06a69b13-7727-5613-a61f-64ad5e87ccd3', 100),
  ('1da90a55-76c4-4999-bf58-620cc0905fac', '5073c790-e227-5bf8-bd22-959aed665e69', 100),
  ('cdce67a0-82c7-4499-8e67-861748e54a13', '17b2dc7f-16f6-532a-8475-4091ccb39f53', 100),
  ('37fd4439-f0c6-48bb-877a-108b2dabe1cd', 'af6cab89-0edf-51ae-b06a-5818296b222f', 100),
  ('9553811d-c405-4394-8d2e-0874a3a1295a', '9c2eceb8-8151-5da3-bf0c-d5f0f609aae8', 100),
  ('c2578882-00e4-406d-a54c-e230ea309860', 'ced12eae-9bbe-56cc-8efe-ec787870bdae', 100),
  ('4ee124f7-76ab-4ff4-9073-60f29a0a59bf', '437f451f-ef85-5605-816c-c1fa2da8a360', 49),
  ('aaa60f27-1513-4819-80a4-af70f1138e96', '076be94f-e234-5eed-acd7-29d998a601c4', 61),
  ('e12c033b-41bc-4320-9852-c0f1efb67e73', '27d074cc-6381-5a2b-883c-179d111826d6', 54),
  ('40b5204a-81b3-4471-b475-9999442cee69', '141bb0e0-0b65-541c-83ad-52318d71b1e1', 100),
  ('923d3134-dd3d-444b-a76b-757a75ee36be', '4d2b93d5-99f2-5a59-81b1-ba97b24c97f5', 100),
  ('71cf52a7-aa2d-4a3a-84b6-22eb7a14e425', '09eeefec-dc03-593c-9552-0a3fa5960a09', 100),
  ('abca401d-aa06-4907-9d1d-8e0df5a32f0a', '1c9d4e41-6856-53a6-ab59-8538e96abec9', 100),
  ('b3dc2dea-4902-4c9a-b20e-fe529d46d06b', '92240ce3-8abb-5295-a158-dfeac52f63c1', 100);
CREATE TEMP TABLE m_rep (org_id bigint, frm text, too text) ON COMMIT DROP;
INSERT INTO m_rep VALUES
  (1, '우성강재 주식회사', '대성제강 주식회사'),
  (1, '우성강재', '대성제강'),
  (1, '333-81-02590', '612-86-40217'),
  (1, '3338102590', '6128640217'),
  (1, 'wooseongsm.co.kr', 'daesungsteel.co.kr'),
  (1, 'wooseongsm', 'daesungsteel'),
  (1, 'yj.yu@wooseongsm.co.kr', 'dy.kang@daesungsteel.co.kr'),
  (1, '유용준', '강도윤'),
  (1, '052-742-8642', '052-238-4410'),
  (1, '울산광역시 울주군 온산읍 산암로 138', '울산광역시 울주군 온산읍 산암로 206'),
  (1, 'WSM-', 'DSG-'),
  (1, 'wsm-', 'dsg-'),
  (1, 'WSME', 'DSGE'),
  (1, 'WSMC', 'DSGC'),
  (1, '08805101420502', '08809140420509'),
  (1, '08805101795853', '08809140795850'),
  (1, '08805101880924', '08809140880921'),
  (1, '08805101677302', '08809140677309'),
  (1, '08805101517110', '08809140517117'),
  (1, '08805101529045', '08809140529042'),
  (1, '08805101440708', '08809140440705'),
  (1, '08805101466036', '08809140466033'),
  (3, '대원선재 주식회사', '우진메탈 주식회사'),
  (3, '대원선재', '우진메탈'),
  (3, '214-87-69569', '135-81-62948'),
  (3, '2148769569', '1358162948'),
  (3, 'daewonwr.co.kr', 'woojinmetal.co.kr'),
  (3, 'daewonwr', 'woojinmetal'),
  (3, 'yj.chun@daewonwr.co.kr', 'sj.bae@woojinmetal.co.kr'),
  (3, '천용준', '배수진'),
  (3, '052-332-4339', '052-231-7140'),
  (3, '울산광역시 울주군 온산읍 산암로 133', '울산광역시 울주군 온산읍 산암로 171'),
  (3, 'DWR-', 'WJM-'),
  (3, 'dwr-', 'wjm-'),
  (3, 'DWRE', 'WJME'),
  (3, 'DWRC', 'WJMC'),
  (3, '08805100005304', '08809141005309'),
  (3, '08805100418074', '08809141418079'),
  (3, '08805101220508', '08809141220504'),
  (4, '가람패션 주식회사', '아라텍스 주식회사'),
  (4, '가람패션', '아라텍스'),
  (4, '667-86-48271', '312-81-55910'),
  (4, '6678648271', '3128155910'),
  (4, 'garamfashion.co.kr', 'aratex.co.kr'),
  (4, 'garamfashion', 'aratex'),
  (4, 'yj.park@garamfashion.co.kr', 'yj.choi@aratex.co.kr'),
  (4, '박예준', '최영진'),
  (4, '02-325-5040', '02-462-2114'),
  (4, '서울특별시 구로구 디지털로 223', '서울특별시 성동구 성수이로 118'),
  (4, 'GAF-', 'ARX-'),
  (4, 'gaf-', 'arx-'),
  (4, 'GAFE', 'ARXE'),
  (4, 'GAFC', 'ARXC'),
  (4, '08805103032291', '08809142032298'),
  (4, '08805103033298', '08809142033295'),
  (4, '08805103198881', '08809142198888'),
  (4, '08805103238884', '08809142238881'),
  (4, '08805103716085', '08809142716082'),
  (4, '08805103908947', '08809142908944'),
  (6, '볼트라인에너지 주식회사', '루멘셀 주식회사'),
  (6, '볼트라인에너지', '루멘셀'),
  (6, '286-81-44498', '124-86-77203'),
  (6, '2868144498', '1248677203'),
  (6, 'voltline.co.kr', 'lumencell.co.kr'),
  (6, 'voltline', 'lumencell'),
  (6, 'dh.ahn@voltline.co.kr', 'sj.lee@lumencell.co.kr'),
  (6, '안동현', '이서준'),
  (6, '043-716-6505', '043-279-2101'),
  (6, '충청북도 청주시 흥덕구 옥산면 과학산업로 252', '충청북도 청주시 흥덕구 옥산면 과학산업2로 57'),
  (6, 'VOE-', 'LMC-'),
  (6, 'voe-', 'lmc-'),
  (6, 'VOEE', 'LMCE'),
  (6, 'VOEC', 'LMCC'),
  (6, '08805101103214', '08809143103218'),
  (6, '08805101351219', '08809143351213'),
  (6, '08805101577565', '08809143577569'),
  (6, '08805101626829', '08809143626823'),
  (6, '08805101635548', '08809143635542'),
  (6, '08805101948396', '08809143948390');
CREATE TEMP TABLE m_persona (org_id bigint, tpl_biz text, pfx text) ON COMMIT DROP;
INSERT INTO m_persona VALUES
  (1, '333-81-02590', 'DSG'),
  (3, '214-87-69569', 'WJM'),
  (4, '667-86-48271', 'ARX'),
  (6, '286-81-44498', 'LMC');

-- 치환 함수: 긴 문자열부터 바꿔서 '우성강재 주식회사'가 '우성강재'보다 먼저 처리되게 한다
CREATE FUNCTION pg_temp.rep(p text, p_org bigint) RETURNS text LANGUAGE plpgsql STABLE AS $$
DECLARE r record; v text := p;
BEGIN
  IF v IS NULL THEN RETURN NULL; END IF;
  FOR r IN SELECT frm, too FROM m_rep WHERE org_id = p_org ORDER BY length(frm) DESC LOOP
    v := replace(v, r.frm, r.too);
  END LOOP;
  RETURN v;
END $$;

-- 실제 id 로 풀기 (이미 정리된 DPP - 모델 SKU 가 새 접두어 - 는 건너뜀)
CREATE TEMP TABLE t_map ON COMMIT DROP AS
SELECT o.dpp_id AS oid, o.public_uuid AS ouuid, o.owner_org_id AS oorg, o.status AS ostatus,
       t.dpp_id AS tid, t.public_uuid AS tuuid, t.owner_org_id AS torg, t.model_id AS tmodel, a.keep_pct,
       (SELECT min(u.user_id) FROM user_account u WHERE u.org_id = o.owner_org_id AND u.deleted_at IS NULL) AS ouser
  FROM m_assign a
  JOIN dpp o ON o.public_uuid = a.old_uuid AND o.deleted_at IS NULL
  JOIN dpp t ON t.public_uuid = a.tpl_uuid AND t.deleted_at IS NULL
  JOIN m_persona p ON p.org_id = o.owner_org_id
  JOIN organization tor ON tor.org_id = t.owner_org_id AND tor.biz_reg_no = p.tpl_biz
 WHERE NOT EXISTS (SELECT 1 FROM product_model pm WHERE pm.model_id = o.model_id AND pm.internal_sku LIKE p.pfx || '-%');

SELECT count(*) AS "정리할 DPP 수" FROM t_map;

-- 틀 DPP 의 협력사(역할) → 대상 DPP 의 같은 역할 협력사, 없으면 대상 제조사 본인
CREATE FUNCTION pg_temp.who(p_org bigint, m t_map) RETURNS bigint LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN p_org IS NULL OR p_org = m.torg THEN m.oorg
         ELSE COALESCE((SELECT op.org_id FROM dpp_participant tp
                          JOIN dpp_participant op ON op.dpp_id = m.oid AND op.role_code = tp.role_code AND op.org_id IS NOT NULL
                         WHERE tp.dpp_id = m.tid AND tp.org_id = p_org LIMIT 1), m.oorg) END
$$;

-- 4) 제품 모델: 틀 모델마다 대상 회사 모델 하나를 남겨 그 값으로 바꾸고, 남는 옛 모델은 숨김
CREATE TEMP TABLE t_model ON COMMIT DROP AS
SELECT DISTINCT ON (m.oorg, m.tmodel) m.oorg, m.tmodel, (SELECT d.model_id FROM dpp d WHERE d.dpp_id = m.oid) AS keep_model
  FROM t_map m ORDER BY m.oorg, m.tmodel, m.oid;

UPDATE product_model pm
   SET internal_sku = pg_temp.rep(tm.internal_sku, k.oorg), gtin = pg_temp.rep(tm.gtin, k.oorg),
       model_name = pg_temp.rep(tm.model_name, k.oorg), brand = pg_temp.rep(tm.brand, k.oorg),
       category_code = tm.category_code, hs_code = tm.hs_code, origin_country = tm.origin_country,
       granularity = tm.granularity, repair_grade = tm.repair_grade, warranty_months = tm.warranty_months,
       spare_part_years = tm.spare_part_years, status = 'ACTIVE', updated_at = now()
  FROM t_model k JOIN product_model tm ON tm.model_id = k.tmodel
 WHERE pm.model_id = k.keep_model;

UPDATE dpp d SET model_id = k.keep_model
  FROM t_map m JOIN t_model k ON k.oorg = m.oorg AND k.tmodel = m.tmodel
 WHERE d.dpp_id = m.oid AND d.model_id <> k.keep_model;

UPDATE product_model pm SET deleted_at = now(), status = 'ARCHIVED'
 WHERE pm.org_id IN (SELECT oorg FROM t_map) AND pm.deleted_at IS NULL
   AND NOT EXISTS (SELECT 1 FROM dpp d WHERE d.model_id = pm.model_id AND d.deleted_at IS NULL);

-- 5) DPP 본체: 이름/시리얼/생애주기 단계/제품사진
UPDATE dpp d
   SET serial_number = pg_temp.rep(t.serial_number, m.oorg),
       display_name = pg_temp.rep(t.display_name, m.oorg),
       lifecycle_stage = CASE WHEN m.ostatus = 'ACTIVE' THEN GREATEST(t.lifecycle_stage, d.lifecycle_stage) ELSE t.lifecycle_stage END,
       product_photo_uri = t.product_photo_uri, product_photo_content_type = t.product_photo_content_type,
       updated_at = now()
  FROM t_map m JOIN dpp t ON t.dpp_id = m.tid
 WHERE d.dpp_id = m.oid;

-- 6) 항목 값: 옛 값 삭제 후 틀 값 복제(초안은 keep_pct 만큼만)
DELETE FROM dpp_field_value v USING t_map m WHERE v.dpp_id = m.oid;

INSERT INTO dpp_field_value (dpp_id, field_code, value_text, value_num, value_bool, value_date, value_json,
                             submitted_by_org, submitted_by_user, signature, submitted_at, updated_at)
SELECT m.oid, v.field_code,
       pg_temp.rep(replace(v.value_text, m.tuuid::text, m.ouuid::text), m.oorg),
       v.value_num, v.value_bool, v.value_date, v.value_json,
       pg_temp.who(v.submitted_by_org, m),
       COALESCE((SELECT min(u.user_id) FROM user_account u WHERE u.org_id = pg_temp.who(v.submitted_by_org, m) AND u.deleted_at IS NULL), m.ouser),
       encode(sha256(convert_to(m.ouuid::text || v.field_code || coalesce(v.value_text, ''), 'UTF8')), 'hex'),
       v.submitted_at, v.updated_at
  FROM t_map m JOIN dpp_field_value v ON v.dpp_id = m.tid
 WHERE m.keep_pct >= 100 OR ('x' || substr(md5(m.ouuid::text || v.field_code), 1, 6))::bit(24)::int % 100 < m.keep_pct;

-- 7) 자재 구성
DELETE FROM material_composition c USING t_map m WHERE c.dpp_id = m.oid;
INSERT INTO material_composition (dpp_id, entry_kind, material_name, cas_number, content_rate, content_unit,
                                  is_hazardous, svhc_flag, recycled_rate, part_location, created_at, updated_at)
SELECT m.oid, c.entry_kind, pg_temp.rep(c.material_name, m.oorg), c.cas_number, c.content_rate, c.content_unit,
       c.is_hazardous, c.svhc_flag, c.recycled_rate, pg_temp.rep(c.part_location, m.oorg), c.created_at, c.updated_at
  FROM t_map m JOIN material_composition c ON c.dpp_id = m.tid
 WHERE m.keep_pct >= 100 OR m.keep_pct >= 55;

-- 8) 문서: 옛 테스트 업로드는 숨기고(삭제 표시) 틀 DPP 문서를 복제·연결
UPDATE document doc SET deleted_at = now()
  FROM t_map m WHERE doc.owner_type = 'DPP' AND doc.owner_id = m.oid AND doc.deleted_at IS NULL;
DELETE FROM document_link dl USING t_map m WHERE dl.dpp_id = m.oid;

CREATE TEMP TABLE t_newdoc ON COMMIT DROP AS
SELECT m.oid, m.oorg, d.* FROM t_map m
  JOIN document_link tl ON tl.dpp_id = m.tid
  JOIN document d ON d.document_id = tl.document_id AND d.deleted_at IS NULL
 WHERE m.keep_pct >= 100 OR ('x' || substr(md5(m.ouuid::text || d.doc_type_code), 1, 6))::bit(24)::int % 100 < m.keep_pct;

INSERT INTO document (doc_type_code, owner_type, owner_id, submitted_by_org, file_name, file_uri, content_hash, mime_type,
                      file_size, virus_scan_status, issuer, issued_at, expires_at, review_status, parsed_at,
                      created_at, updated_at, created_by)
SELECT n.doc_type_code, 'DPP', n.oid, pg_temp.who(n.submitted_by_org, m), pg_temp.rep(n.file_name, n.oorg), n.file_uri,
       n.content_hash, n.mime_type, n.file_size, n.virus_scan_status, pg_temp.rep(n.issuer, n.oorg), n.issued_at,
       n.expires_at, n.review_status, n.parsed_at, n.created_at, n.updated_at, m.ouser
  FROM t_newdoc n JOIN t_map m ON m.oid = n.oid
ON CONFLICT DO NOTHING;

INSERT INTO document_link (document_id, dpp_id, link_type, created_at)
SELECT doc.document_id, doc.owner_id, 'DIRECT', doc.created_at
  FROM document doc JOIN t_map m ON doc.owner_type = 'DPP' AND doc.owner_id = m.oid AND doc.deleted_at IS NULL
ON CONFLICT (document_id, dpp_id) DO NOTHING;

INSERT INTO document_review (document_id, reviewer_user_id, action, reason_detail, reviewed_at)
SELECT doc.document_id, NULL, 'APPROVE', '자동 검증 통과(형식·서명·해시 확인)', doc.created_at + interval '2 minutes'
  FROM document doc JOIN t_map m ON doc.owner_type = 'DPP' AND doc.owner_id = m.oid AND doc.deleted_at IS NULL
 WHERE doc.review_status = 'APPROVED'
   AND NOT EXISTS (SELECT 1 FROM document_review r WHERE r.document_id = doc.document_id);

-- 9) 완성도 / 조회 캐시 재계산
SELECT count(*) AS "완성도 재계산" FROM (SELECT fn_recalc_completeness(oid), fn_refresh_dpp_attributes(oid) FROM t_map) x;

-- 10) 발급 건은 새 스냅샷 + 앵커 확정 (공개 여권이 새 값을 보여주도록)
CREATE TEMP TABLE t_snap ON COMMIT DROP AS
SELECT m.oid, fn_create_dpp_snapshot(m.oid, 'MANUAL', m.ouser, TRUE) AS snapshot_id
  FROM t_map m WHERE m.ostatus = 'ACTIVE';

UPDATE blockchain_anchor a
   SET status = 'CONFIRMED',
       tx_id = encode(sha256(convert_to('fix-legacy|' || a.target_id, 'UTF8')), 'hex'),
       block_no = (SELECT COALESCE(max(block_no), 0) FROM blockchain_anchor) + a.target_id % 7 + 1,
       anchored_at = now()
  FROM t_snap s WHERE a.target_type = 'DPP_SNAPSHOT' AND a.target_id = s.snapshot_id AND a.status = 'MOCK';

-- 11) 과천제철 DPP 표시명의 '테스트' 꼬리표 정리
UPDATE dpp SET display_name = 'S355JR H형강 H400×200×8×13 · H260201', updated_at = now()
 WHERE public_uuid = 'e05a3b40-0af5-41ff-8ef5-cff0ec867def' AND display_name = '과천제철_테스트_형강 H';

-- 확인용
SELECT d.dpp_id, o.org_name, d.status, d.display_name, d.completeness
  FROM dpp d JOIN organization o ON o.org_id = d.owner_org_id
 WHERE d.owner_org_id <= 28 AND d.deleted_at IS NULL ORDER BY d.owner_org_id, d.dpp_id;

COMMIT;
DPP_SQL_EOF
