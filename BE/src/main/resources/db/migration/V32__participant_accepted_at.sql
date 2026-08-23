-- =====================================================================
-- 협력사 참여 "수락" 시각 (2026-08-23 강 요청)
--
-- 요청 원문: "협력사가 반드시 입력해야 하는 문서가 아니라, 협력사가 초대를 수락하면
-- 그때부터 걔가 입력하는 데이터만 걔만 입력할 수 있게" / "원래는 혼자서도 다 입력할 수
-- 있는데 협력사를 초대한 이후로는 협력사만 업로드 가능한 구조로 해서 데이터랑 문서를
-- 받아오게".
--
-- ■ 지금까지의 동작이 왜 틀렸나
--   requirement_field.responsible_role 이 RAW_SUPPLIER/TEST_LAB/RECYCLER 인 항목은
--   협력사를 초대하든 안 하든 항상 "협력사 담당"으로 그려져서, 제조사 혼자 DPP를
--   만들려고 해도 그 문서들을 영영 올릴 수 없었다(FE makerVals.js partnerOwned).
--   반대로 서버는 소유 조직에게 그 문서·필드 쓰기를 전부 허용하고 있어서, 협력사가
--   붙은 뒤에도 제조사가 협력사 자리의 값을 덮어쓸 수 있었다. 두 방향 모두 틀렸다.
--
-- ■ 이제 기준은 "수락 여부" 하나다
--   수락 전  : 담당 역할과 무관하게 소유 조직(제조사)이 전부 입력·업로드할 수 있다.
--   수락 후  : 그 역할이 담당인 데이터 항목·문서는 해당 협력사만 쓸 수 있고, 제조사
--             화면에서는 읽기 전용("협력사 제출 대기")이 된다.
--   그래서 "언제 수락했는가"를 저장할 자리가 필요하다. invitation.status='ACCEPTED'로도
--   비슷한 판정이 가능하지만, 초대 행은 재발송·회수로 상태가 갈아엎히고 (dpp, 역할)당
--   여러 건이 쌓인다. 권한 판정의 근거는 참여 행 하나에 못박는 게 안전하다.
--
-- ■ 백필
--   이미 자료를 제출한 참여 행은 사실상 수락한 상태다 - 그 행까지 "미수락"으로 두면
--   협력사가 채워둔 값을 제조사가 다시 덮어쓸 수 있게 되어 이전보다 나빠진다.
--   초대 행이 ACCEPTED로 남아 있는 경우도 같이 채운다.
-- =====================================================================

ALTER TABLE dpp_participant ADD COLUMN accepted_at TIMESTAMPTZ;

COMMENT ON COLUMN dpp_participant.accepted_at IS
    '협력사가 참여를 수락한 시각. NULL이면 아직 미수락 - 이 역할 담당 항목은 소유 조직이 입력한다';

-- 이미 자료를 제출했거나 완료된 참여 행 = 사실상 수락됨
UPDATE dpp_participant
   SET accepted_at = COALESCE(completed_at, invited_at)
 WHERE accepted_at IS NULL
   AND submit_status IN ('IN_PROGRESS', 'SUBMITTED', 'COMPLETED');

-- 초대가 이미 ACCEPTED로 넘어간 참여 행
UPDATE dpp_participant p
   SET accepted_at = COALESCE(i.accepted_at, p.invited_at)
  FROM invitation i
 WHERE p.accepted_at IS NULL
   AND i.status = 'ACCEPTED'
   AND i.dpp_id = p.dpp_id
   AND i.role_code = p.role_code
   AND (i.accepted_org_id = p.org_id OR i.invitee_email = p.guest_email);
