-- =====================================================================
-- 협력사 초대 이력 화면(FE "협력사 초대") 실데이터화를 위한 invitation 테이블 확장.
--
-- FE는 회사명 표시가 필요한데 invitation에는 invitee_email만 있었다(초대장을 받는
-- 조직이 아직 가입 전이라 organization 행이 없을 수 있어서 organization을 FK로 못 씀 -
-- 그래서 이메일과 별개로 발신자가 직접 입력한 회사명을 문자열로 저장).
--
-- status도 SENT/ACCEPTED/EXPIRED/REVOKED뿐이라 "거절"을 표현할 값이 없었다 - REVOKED는
-- "초대한 쪽이 취소"라는 뜻이라 "초대받은 쪽이 거절"과 의미가 다르다. REJECTED를 추가한다.
-- =====================================================================

ALTER TABLE invitation ADD COLUMN invitee_org_name VARCHAR(200);

-- Postgres가 V1__schema.sql의 인라인 CHECK(status IN (...))에 자동으로 붙인 제약 이름을
-- 확신할 수 없어서(보통 invitation_status_check이지만 확실친 않음), 이름을 짐작해서
-- DROP CONSTRAINT IF EXISTS로 지우면 이름이 틀렸을 때 조용히 아무 일도 안 하고 옛
-- 제약이 그대로 남아 REJECTED 삽입을 계속 막을 수 있다 - pg_constraint에서 status
-- 컬럼에 걸린 CHECK 제약을 직접 찾아서 이름과 무관하게 지운다.
DO $$
DECLARE
    v_conname TEXT;
BEGIN
    SELECT con.conname INTO v_conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
     WHERE rel.relname = 'invitation'
       AND con.contype = 'c'
       AND att.attname = 'status';

    IF v_conname IS NOT NULL THEN
        EXECUTE format('ALTER TABLE invitation DROP CONSTRAINT %I', v_conname);
    END IF;
END $$;

ALTER TABLE invitation ADD CONSTRAINT invitation_status_check
    CHECK (status IN ('SENT','ACCEPTED','EXPIRED','REVOKED','REJECTED'));
