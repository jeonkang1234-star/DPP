-- 문의 유형을 계정·인증(ACCOUNT) / DPP 등록(DPP) / 데이터 검증(DATA) / 기타(ETC) 네 가지로만
-- 남긴다(2026-09-19 강 요청). 통관(CUSTOMS)·영지식증명(ZKP)으로 접수돼 있던 기존 문의는
-- 기타로 옮긴다 - 삭제하면 대화 기록이 사라지므로 유형만 바꾼다.
UPDATE inquiry SET category = 'ETC' WHERE category IN ('CUSTOMS', 'ZKP');

-- V34의 CHECK는 이름 없이 만들어졌으므로 이름을 몰라도 지워지도록 카탈로그에서 찾는다.
DO $$
DECLARE c TEXT;
BEGIN
    FOR c IN
        SELECT conname FROM pg_constraint
         WHERE conrelid = 'inquiry'::regclass
           AND contype = 'c'
           AND pg_get_constraintdef(oid) LIKE '%category%'
    LOOP
        EXECUTE format('ALTER TABLE inquiry DROP CONSTRAINT %I', c);
    END LOOP;
END $$;

ALTER TABLE inquiry ADD CONSTRAINT ck_inquiry_category
    CHECK (category IN ('ACCOUNT', 'DPP', 'DATA', 'ETC'));

-- 관리자 대시보드 "유형별 문의" 집계는 notification.sub_type을 그대로 세므로 같이 정리한다.
UPDATE notification SET sub_type = 'ETC'
 WHERE category = 'INQUIRY' AND sub_type IN ('CUSTOMS', 'ZKP');
