-- 회원관리 목록의 "쓰레기 조직" 정리 (2026-09-21 강 요청: 과천제철/안양협력처럼 있을 법한
-- 데이터만 남기고 "EU", "무슨세관", "어쩌구EU" 같은 임시 데이터는 치운다)
--
-- 사용법:
--   docker cp cleanup-junk-orgs.sql dpp-postgres:/tmp/
--   docker exec -i dpp-postgres psql -U dpp -d dpp -f /tmp/cleanup-junk-orgs.sql
--
-- 기본은 미리보기(끝에서 ROLLBACK)다. [1]에 나온 삭제 대상 목록을 눈으로 확인하고, 문제 없으면
-- 맨 아래 ROLLBACK 을 COMMIT 으로 바꿔 다시 실행한다. 지우기 싫은 조직은 keep_org 목록에 이름을
-- 추가한다.
--
-- 소프트 삭제(deleted_at)만 한다 - cleanup-demo-accounts.sql과 같은 이유(FK 참조 다수, 복구 가능).
-- 조직 + 그 조직의 계정 + 그 조직 소유 DPP를 함께 숨긴다(안 그러면 DPP 개수 KPI만 남는다).
-- 복구: 맨 아래 [복구] 참고.

BEGIN;

CREATE TEMP TABLE keep_org(org_name TEXT PRIMARY KEY) ON COMMIT DROP;
INSERT INTO keep_org(org_name) VALUES
  ('과천제철 주식회사'),
  ('안양협력 주식회사'),
  ('가온스틸 주식회사'),
  ('블루셀에너지 주식회사'),
  ('한올텍스타일 주식회사'),
  -- 세관/EU 심사 흐름이 매칭에 쓰는 시드 조직 - 지우면 세관 심사가 동작하지 않는다.
  ('대한민국 관세청(테스트)'),
  ('프랑스 관세청 Douane(테스트)'),
  ('독일 연방관세청 Zoll(테스트)'),
  ('대한민국 산업통상자원부(테스트)'),
  -- 테스트 시드 계정의 소속 조직
  ('대성제강(테스트)'), ('우진메탈(테스트)'), ('한국시험인증(테스트)'),
  ('아라텍스(테스트)'), ('청우섬유(테스트)'),
  ('루멘셀(테스트)'), ('한국배터리시험인증(테스트)'), ('그린루프리사이클(테스트)'), ('코어미네랄즈(테스트)'),
  ('신흥특수강(테스트)'), ('Nordstahl GmbH(테스트)');

\echo ''
\echo '=== [0] 유지 목록 중 DB에 없는 조직 (참고) ==='
SELECT k.org_name AS "DB에 없음"
  FROM keep_org k
 WHERE NOT EXISTS (SELECT 1 FROM organization o WHERE o.org_name = k.org_name AND o.deleted_at IS NULL);

\echo ''
\echo '=== [1] 삭제 대상 조직 (유지 목록에 없는 조직) ==='
SELECT o.org_id, o.org_name, o.org_type, o.country_code, o.approval_status,
       (SELECT COUNT(*) FROM user_account u WHERE u.org_id = o.org_id AND u.deleted_at IS NULL) AS 계정수,
       (SELECT COUNT(*) FROM dpp d WHERE d.owner_org_id = o.org_id AND d.deleted_at IS NULL)    AS dpp수
  FROM organization o
 WHERE o.deleted_at IS NULL
   AND o.org_name NOT IN (SELECT org_name FROM keep_org)
 ORDER BY o.org_id;

CREATE TEMP TABLE junk_org ON COMMIT DROP AS
SELECT org_id FROM organization
 WHERE deleted_at IS NULL AND org_name NOT IN (SELECT org_name FROM keep_org);

UPDATE dpp  SET deleted_at = now() WHERE deleted_at IS NULL AND owner_org_id IN (SELECT org_id FROM junk_org);
UPDATE user_account SET deleted_at = now(), updated_at = now()
 WHERE deleted_at IS NULL AND org_id IN (SELECT org_id FROM junk_org);
UPDATE organization SET deleted_at = now() WHERE org_id IN (SELECT org_id FROM junk_org);

\echo ''
\echo '=== [2] 정리 후 남는 조직 ==='
SELECT org_id, org_name, org_type, approval_status FROM organization WHERE deleted_at IS NULL ORDER BY org_id;

-- ▼▼▼ 미리보기 상태: 아무것도 저장되지 않는다. 확인 후 ROLLBACK -> COMMIT 으로 바꿔서 다시 실행. ▼▼▼
ROLLBACK;

-- ── [복구] COMMIT 해서 실행한 뒤 되돌리려면 ──
--   UPDATE organization  SET deleted_at = NULL WHERE deleted_at >= now() - INTERVAL '1 hour';
--   UPDATE user_account  SET deleted_at = NULL WHERE deleted_at >= now() - INTERVAL '1 hour';
--   UPDATE dpp           SET deleted_at = NULL WHERE deleted_at >= now() - INTERVAL '1 hour';
