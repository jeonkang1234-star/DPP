-- =====================================================================
-- 테스트 조직 담당자 연락처 채우기 - 2026-08-20 강 요청
--   "운영 대시보드 상세 버튼을 누르면 회사명·사업자등록번호·국가·전화번호가 보이게
--    (현재 가입되어 있는 계정들에 전화번호가 따로 없다면 SQL로 삽입해서 보이게)"
--
-- 시드로 만든 테스트 조직들은 organization.contact_name/contact_phone/contact_email이
-- 전부 비어 있었다(회원가입 화면을 거치지 않고 INSERT로 만들어서). 상세 모달이 빈칸만
-- 보여주지 않도록 데모용 값을 채운다.
--
-- 대상은 조직명이 '(테스트)'로 끝나고 해당 칸이 비어 있는 행뿐이다. 실제로 가입 절차를
-- 거쳐 들어온 조직의 값은 절대 덮어쓰지 않는다. 여러 번 돌려도 결과는 같다.
--
-- 전화번호는 전부 문서상 존재하지 않는 번호 대역을 쓴다(국내 070-7010-XXXX 대역,
-- 해외는 각국 예약 대역) - 실제 사용 중인 번호로 전화가 갈 일이 없게.
-- =====================================================================

UPDATE organization o
   SET contact_name = COALESCE(NULLIF(btrim(o.contact_name), ''), v.name),
       contact_phone = COALESCE(NULLIF(btrim(o.contact_phone), ''), v.phone),
       contact_email = COALESCE(NULLIF(btrim(o.contact_email), ''), v.email),
       updated_at = now()
  FROM (VALUES
      ('루멘셀(테스트)',                  '이서준', '070-7010-2101', 'sj.lee@lumencell.co.kr'),
      ('한국배터리시험인증(테스트)',      '박도현', '070-7010-2102', 'testlab-test@krbattery.test'),
      ('그린루프리사이클(테스트)',        '정민아', '070-7010-2103', 'recycler-test@greenloop.test'),
      ('코어미네랄즈(테스트)',            '오세훈', '070-7010-2104', 'supplier-test@coreminerals.test'),
      ('대한민국 산업통상자원부(테스트)', '윤가람', '070-7010-2105', 'gr.yoon@korea.kr'),
      ('독일 연방관세청 Zoll(테스트)',    'Lena Braun',   '+49-30-5550-2106', 'audit@zoll.de'),
      ('대한민국 관세청(테스트)',         '한지원', '070-7010-2107', 'jw.han@customs.go.kr'),
      ('프랑스 관세청 Douane(테스트)',    'Julien Moreau', '+33-1-5550-2108', 'inspector@douane.gouv.fr'),
      ('대성제강(테스트)',                '김태호', '070-7010-2109', 'steel-test@daesungsteel.test'),
      ('우진메탈(테스트)',                '배수진', '070-7010-2110', 'partner-test@woojinmetal.test'),
      ('신흥특수강(테스트)',              '노현우', '070-7010-2111', 'pending-kr@sinheung-steel.test'),
      ('Nordstahl GmbH(테스트)',          'Markus Klein', '+49-40-5550-2112', 'pending-de@nordstahl.test'),
      ('한국시험인증(테스트)',            '서지안', '070-7010-2113', 'testlab-test@krtest.test'),
      ('아라텍스(테스트)',                '최영진', '070-7010-2114', 'yj.choi@aratex.co.kr'),
      ('청우섬유(테스트)',                '문가영', '070-7010-2115', 'partner-test@cheongwoo.test')
  ) AS v(org_name, name, phone, email)
 WHERE o.org_name = v.org_name
   AND o.deleted_at IS NULL;

-- 위 목록에 없는데도 연락처가 비어 있는 테스트 조직이 나중에 생기면, 최소한 빈칸으로
-- 남지는 않게 대표 번호를 채운다.
UPDATE organization
   SET contact_phone = '070-7010-2100',
       updated_at = now()
 WHERE deleted_at IS NULL
   AND org_name LIKE '%(테스트)'
   AND COALESCE(btrim(contact_phone), '') = '';
