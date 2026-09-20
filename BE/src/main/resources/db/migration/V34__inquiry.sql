-- =====================================================================
-- 제조사 ↔ 관리자 문의 스레드 (2026-09-17 강 요청)
--
-- 기존엔 notification(category='INQUIRY')만 있었는데, 이건 발신 전용(admin에게
-- "문의가 왔다"는 신호만 남기는 일방향 기록)이라 진짜 대화(양방향 주고받기)를
-- 담을 수 없었다("문의하는 기능이 있는데 양방향 소통이 안되니까 이상하다" - 강).
-- 그래서 스레드(inquiry) + 그 안의 메시지(inquiry_message)를 새로 둔다.
--
-- 카테고리 값(ACCOUNT/DPP/DATA/CUSTOMS/ZKP/ETC)은 기존 관리자 대시보드가 쓰던
-- notification.sub_type 관례(AdminStatsRepository.countInquiriesByType30d,
-- AdminDashboardService.inquiryLabel)와 그대로 맞춘다 - TIER는 관리자 내부 집계
-- 전용이라 여기 문의 카테고리에는 없다.
--
-- 문의가 새로 생성될 때마다 notification(category='INQUIRY', sub_type=<카테고리>,
-- recipient_role_code='ADMIN') 행도 같이 남긴다(InquiryService에서) - 그래야 이미
-- 만들어져 있던 "유형별 문의" 세로 막대 그래프(관리자 대시보드)가 별도 작업 없이
-- 실제 건수를 보여주게 된다.
-- =====================================================================

CREATE TABLE inquiry (
    inquiry_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    org_id             BIGINT       NOT NULL REFERENCES organization(org_id),
    created_by_user_id BIGINT       NOT NULL REFERENCES user_account(user_id),
    category           VARCHAR(20)  NOT NULL
                        CHECK (category IN ('ACCOUNT','DPP','DATA','CUSTOMS','ZKP','ETC')),
    status             VARCHAR(20)  NOT NULL DEFAULT 'OPEN'
                        CHECK (status IN ('OPEN','ANSWERED')),
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_inquiry_org ON inquiry (org_id, updated_at DESC);
CREATE INDEX ix_inquiry_status ON inquiry (status, updated_at DESC);

CREATE TRIGGER trg_inquiry_touch BEFORE UPDATE ON inquiry
    FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

CREATE TABLE inquiry_message (
    message_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    inquiry_id     BIGINT       NOT NULL REFERENCES inquiry(inquiry_id) ON DELETE CASCADE,
    sender_type    VARCHAR(10)  NOT NULL CHECK (sender_type IN ('MAKER','ADMIN')),
    sender_user_id BIGINT       REFERENCES user_account(user_id),
    body           VARCHAR(2000) NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_inquiry_message_thread ON inquiry_message (inquiry_id, created_at);
