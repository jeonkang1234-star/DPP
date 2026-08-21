-- =====================================================================
-- requirement_field 에 규제 분류 메타데이터 컬럼 추가
--
-- 근거: 'DPP_데이터항목_분류.xlsx' (2026-08-19 기준, 909개 항목을 T0~T4로 판정한 표).
-- 지금까지 requirement_field 는 "이 필드가 화면에 뜨는가"만 알고 있었고, 그 필드를
-- 왜 받아야 하는지(법적 근거)·누구에게 보여줘도 되는지(공개범위)·어디서 채워지는지
-- (파서/수기/시스템)는 코드 여기저기에 흩어져 있거나 아예 없었다. 그걸 전부 이 표
-- 한 곳으로 모은다.
--
-- 이 마이그레이션은 컬럼만 추가한다. 실제 T0·T1 항목 시딩은 V21 에서 한다.
-- =====================================================================

ALTER TABLE requirement_field
    -- T0 법정필수 / T1 조건부필수 / T2 초안·예정 / T3 자체부가 / T4 제외권장.
    -- 기존 80개 행은 근거 조항을 다시 확인하기 전까지 T3(자체부가)로 둔다 - 표의
    -- 판정 규칙 1("근거 조항을 쓸 수 없으면 T0·T1이 될 수 없다")을 그대로 적용한 것.
    ADD COLUMN tier              VARCHAR(2)
        CHECK (tier IN ('T0','T1','T2','T3','T4')),
    -- 인용한 근거가 지금 구속력이 있는지. 등급과 별개 축이다(T1이어도 근거는 확정
    -- 법령일 수 있고, T0여도 배터리처럼 시행일이 미래일 수 있다).
    ADD COLUMN binding_strength  VARCHAR(30),
    ADD COLUMN legal_basis       VARCHAR(400),
    -- T1(조건부필수)일 때 어떤 조건에서 의무가 발동하는지. T0/T2~T4는 NULL.
    ADD COLUMN t1_condition      VARCHAR(300),
    -- PUBLIC   : QR 조회 시 일반 공중에게 노출 (Annex XIII 1 + Annex VI Part A)
    -- RESTRICTED: 정당한 이익 보유자·인증기관·시장감시당국만 (Annex XIII 2·3·4)
    -- TRADE_SECRET: 값 자체를 공개하지 않고 '한계값 충족' 사실만 ZKP로 대체할 후보
    ADD COLUMN disclosure_scope  VARCHAR(20) NOT NULL DEFAULT 'PUBLIC'
        CHECK (disclosure_scope IN ('PUBLIC','RESTRICTED','TRADE_SECRET')),
    -- PARSER : 업로드된 문서에서 파서가 뽑아 채운다
    -- MANUAL : 사람이 폼에 직접 친다
    -- SYSTEM : 서버가 발급/갱신한다 (is_auto 와 짝을 이룬다)
    ADD COLUMN data_source       VARCHAR(10) NOT NULL DEFAULT 'MANUAL'
        CHECK (data_source IN ('PARSER','MANUAL','SYSTEM')),
    -- 분류표 원본 추적용. 'STEEL#148' 처럼 도메인 시트 + No 를 적어둔다.
    -- 여러 도메인의 같은 항목을 COMMON 한 줄로 접은 경우 쉼표로 나열된다.
    ADD COLUMN spec_ref          VARCHAR(120),
    -- 분류표의 MVP 열. 판정 규칙 2("보유 목데이터 문서에서 값이 나오지 않으면 MVP에
    -- 넣지 않는다")를 통과한 항목.
    ADD COLUMN is_mvp            BOOLEAN NOT NULL DEFAULT FALSE,
    -- 분류표 '검토 의견' 열. 왜 이 등급인지, 어떤 인용을 고쳤는지가 적혀 있어서
    -- 나중에 근거를 다시 따질 때 출발점이 된다.
    ADD COLUMN review_note       VARCHAR(600);

-- data_type: 분류표에 Datetime 과 URL 이 별도 타입으로 잡혀 있다. 기존 CHECK 는
-- 둘 다 못 받아서 전부 STRING 으로 뭉갤 수밖에 없었는데, FE 가 입력 위젯을 타입별로
-- 나눠 그리려면 구분이 필요하다(날짜 피커 vs 링크 입력).
ALTER TABLE requirement_field DROP CONSTRAINT IF EXISTS requirement_field_data_type_check;
ALTER TABLE requirement_field ADD  CONSTRAINT requirement_field_data_type_check
    CHECK (data_type IN ('STRING','NUMBER','BOOLEAN','DATE','DATETIME','CODE','TEXT','JSON','URL'));

-- 기존 80개 행 백필. data_source 는 is_auto 로 역산할 수 있고(is_auto=TRUE 면 서버가
-- 채우는 것), 나머지는 V21 에서 분류표와 매칭되는 행만 실제 값으로 덮어쓴다.
UPDATE requirement_field
   SET tier             = 'T3',
       binding_strength = '없음',
       data_source      = CASE WHEN is_auto THEN 'SYSTEM' ELSE 'MANUAL' END,
       is_mvp           = TRUE;

-- 공개범위 백필은 이미 있던 field_visibility 티어 설정을 그대로 옮긴다 - 티어1에서
-- 숨기던 필드를 갑자기 QR 공개로 올리지 않기 위해서다(V4/V16/V17 이 심어둔 값이
-- 지금까지 아무 코드에도 안 읽히고 있었다).
UPDATE requirement_field rf
   SET disclosure_scope = CASE fv.visibility
                            WHEN 'FULL'   THEN 'PUBLIC'
                            WHEN 'MASKED' THEN 'RESTRICTED'
                            ELSE 'RESTRICTED'
                          END
  FROM field_visibility fv
 WHERE fv.field_code = rf.field_code AND fv.tier_level = 1;

COMMENT ON COLUMN requirement_field.tier             IS 'T0 법정필수 / T1 조건부필수 / T2 초안·예정 / T3 자체부가 / T4 제외권장';
COMMENT ON COLUMN requirement_field.disclosure_scope IS 'PUBLIC=QR 공개, RESTRICTED=권한자 한정, TRADE_SECRET=ZKP 대체 후보';
COMMENT ON COLUMN requirement_field.data_source      IS 'PARSER=문서 파싱, MANUAL=수기 입력, SYSTEM=서버 생성';
COMMENT ON COLUMN requirement_field.spec_ref         IS 'DPP_데이터항목_분류.xlsx 원본 행 참조 (도메인#No)';
