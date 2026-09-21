-- =====================================================================
--  시연용 과천제철 세트 - 5차: 감사 로그 + 앵커/증명 해시 정리
--  전제: 1~4차 실행 완료
--
--  *** 실행 (docker/ 디렉터리에서) ***
--    docker cp seed-demo-gwacheon-5-audit-log.sql dpp-postgres:/tmp/s5.sql
--    docker exec -i dpp-postgres psql -U dpp -d dpp -f /tmp/s5.sql
--
--  ■ 하는 일
--    1. audit_log를 비우고(기존 가짜 4건 제거) 시연용 이력을 다시 쌓는다.
--       최신(맨 위)에는 과천제철의 ZKP 검증 3건 + 블록체인 앵커링이 걸린
--       문서 업로드/DPP 발급이 오고, 그 아래에 다른 회사들의 이력을 깐다.
--    2. 트랜잭션 해시를 'mock-...' 대신 Fabric 형식의 64자리 hex로 통일한다
--       - 4차의 zkp_proof proof_data, 스냅샷 앵커(blockchain_anchor)까지 함께.
--
--  ■ 다른 회사 이력은 "계정이 실제로 있을 때만" 들어간다
--    대성제강/아라텍스/루멘셀 등은 seed-test-*.sql을 돌렸을 때만 존재한다.
--    없으면 그 행은 조용히 빠진다(JOIN 조건) - 시드 순서에 안전.
-- =====================================================================
\set ON_ERROR_STOP on
BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- 0) 참조 준비
-- ─────────────────────────────────────────────────────────────────────
CREATE TEMP TABLE t ON COMMIT DROP AS
SELECT d.dpp_id, d.display_name,
       (SELECT org_id  FROM organization  WHERE biz_reg_no='138-86-47212')                 AS org_m,
       (SELECT org_id  FROM organization  WHERE biz_reg_no='138-81-30526')                 AS org_s,
       (SELECT user_id FROM user_account WHERE email='jeonkang1234+t333@tukorea.ac.kr'
          AND deleted_at IS NULL)                                                          AS usr_m,
       (SELECT user_id FROM user_account WHERE email='jeonkang1234+t334@tukorea.ac.kr'
          AND deleted_at IS NULL)                                                          AS usr_s
  FROM dpp d WHERE d.serial_number='GCS-2026-0201-H400';

-- ─────────────────────────────────────────────────────────────────────
-- 1) 해시 정리 - mock 흔적 제거
-- ─────────────────────────────────────────────────────────────────────
-- 스냅샷 앵커: mock-<해시> -> 실제 콘텐츠 해시를 tx로 쓰지 않고 별도 tx 해시 부여
UPDATE blockchain_anchor a
   SET tx_id  = 'd654f3bb7df8dc183f2ff6f6706900eb880dee996a4b34982db1dd8696a6e9d7',
       status = 'CONFIRMED', block_no = 18427, anchored_at = now() - interval '3 days'
  FROM dpp_snapshot s, t
 WHERE a.target_type='DPP_SNAPSHOT' AND a.target_id = s.snapshot_id
   AND s.dpp_id = t.dpp_id;

-- ZKP 증명: proof_data를 해시 형태로, 회로별 고정 값
UPDATE zkp_proof z
   SET proof_data = CASE z.claim_type
         WHEN 'CERT_VALID'    THEN '85ad9f76511c29b2b1f8aa01fa5808e2f8ec617eea31f035d9439b6601b18a1f'
         WHEN 'RECYCLED_RATE' THEN 'f0012f4b93b1d1209346449d7d9c5638f2af44827c1c7237a275aed6a4877907'
         WHEN 'CARBON_LIMIT'  THEN '2b295fe6f18ee250bc9ce3285b9702f2328616f8031471796c9004bd44837a7e'
         ELSE z.proof_data END
  FROM t
 WHERE z.dpp_id = t.dpp_id AND z.status='VERIFIED';

-- ─────────────────────────────────────────────────────────────────────
-- 2) 감사 로그 재구축
-- ─────────────────────────────────────────────────────────────────────
TRUNCATE audit_log;

-- (a) 바닥 깔개 - 다른 회사들 (계정이 있을 때만 들어감)
INSERT INTO audit_log (actor_user_id, actor_org_id, action, target_type, target_id, after_value, created_at)
SELECT u.user_id, u.org_id, v.action, v.ttype, NULL,
       jsonb_build_object('targetLabel', v.label, 'result', v.result) ||
         CASE WHEN v.tx IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('txId', v.tx) END,
       now() - (v.age_h || ' hours')::interval
  FROM (VALUES
    ('steel-test@daesungsteel.test','CREATE','DPP','대성제강 SS275 후판 12t','발급 완료',
     'b4bc4c2c5b2ed71447b2aae7de66fc3ec0dd11206d11c24b19c60e1a37fe8ac4', 168),
    ('yj.choi@aratex.co.kr','CREATE','DOCUMENT','GRS 거래증명서 (DOC-3021)','성공',
     'add0f82cab35e381c898d39b924aa41029a705147a99330c641d5aeac806f8bb', 150),
    ('sj.lee@lumencell.co.kr','CREATE','DPP','루멘셀 NMC 모듈 BC-NMC-2608','발급 완료',
     '54febd6198fc6258b6204e79754489ee58e70bb875b7c1f539d5c92df2f29187', 139),
    ('jw.han@customs.go.kr','APPROVE','CUSTOMS_CLEARANCE','BC-ESS-2608-M0663 수출 통관','승인', NULL, 126),
    ('ops@ieum.io','APPROVE','ORGANIZATION','안양협력 주식회사 가입 심사','승인', NULL, 121)
  ) AS v(email, action, ttype, label, result, tx, age_h)
  JOIN user_account u ON u.email = v.email AND u.deleted_at IS NULL;

-- (b) 운영자: 과천제철 가입 승인 (계정 있을 때만)
INSERT INTO audit_log (actor_user_id, actor_org_id, action, target_type, target_id, after_value, created_at)
SELECT u.user_id, u.org_id, 'APPROVE', 'ORGANIZATION', t.org_m,
       jsonb_build_object('targetLabel','과천제철 주식회사 가입 심사 (사업자등록증 자동검증)','result','승인'),
       now() - interval '120 hours'
  FROM user_account u CROSS JOIN t
 WHERE u.email='ops@ieum.io' AND u.deleted_at IS NULL;

-- (c) 최상위 - 과천제철. 실제로 시드된 문서/증명/발급과 1:1로 맞춘다.
--     문서 업로드(앵커 tx 포함) -> ZKP 검증 3건 -> DPP 발급(스냅샷 앵커 tx)
INSERT INTO audit_log (actor_user_id, actor_org_id, action, target_type, target_id, after_value, created_at)
SELECT CASE WHEN v.actor='S' THEN t.usr_s ELSE t.usr_m END,
       CASE WHEN v.actor='S' THEN t.org_s ELSE t.org_m END,
       v.action, v.ttype,
       CASE v.ttype
         WHEN 'DOCUMENT' THEN (SELECT x.document_id FROM document x
                                WHERE x.owner_type='DPP' AND x.owner_id=t.dpp_id
                                  AND x.doc_type_code=v.doc AND x.deleted_at IS NULL LIMIT 1)
         WHEN 'ZKP_PROOF' THEN (SELECT z.proof_id FROM zkp_proof z
                                 WHERE z.dpp_id=t.dpp_id AND z.claim_type=v.doc LIMIT 1)
         ELSE t.dpp_id END,
       jsonb_build_object('targetLabel',
           replace(v.label, '{DPP}', 'DPP-' || t.dpp_id), 'result', v.result) ||
         CASE WHEN v.tx IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('txId', v.tx) END,
       now() - (v.age_m || ' minutes')::interval
  FROM t
 CROSS JOIN (VALUES
    -- 문서 업로드 (핵심 3건 - 밀시트/CBAM은 제조사, 스크랩 증빙은 안양협력)
    ('M','CREATE','DOCUMENT','MILL_SHEET',  '제강 성적서 MILL_SHEET ({DPP})','성공',
     'd7321214e9a42fa3d0372a8136211b8fa1f1c34357942a996388f5e455879826', 5820),
    ('M','CREATE','DOCUMENT','CBAM_REPORT', 'CBAM 탄소보고서 CBAM_REPORT ({DPP})','성공',
     '4ad38b64303096c85ecfff1b8fe700d23c22c8061069b221aa2128683fd1e17a', 5804),
    ('S','CREATE','DOCUMENT','SCRAP_PROOF', '스크랩 매입증빙 SCRAP_PROOF ({DPP})','성공',
     'cb22e15d9e18273cc3874693024679bd54953ad915fe146093b05fca5a2331a9', 5761),
    -- ZKP 검증 3건 (화면 라벨은 actionLabel이 "ZKP 검증"으로 바꿔 단다)
    ('M','CREATE','ZKP_PROOF','CERT_VALID',   'MILL_SHEET ZKP ({DPP}) 규격 판정','충족',
     '85ad9f76511c29b2b1f8aa01fa5808e2f8ec617eea31f035d9439b6601b18a1f', 5745),
    ('S','CREATE','ZKP_PROOF','RECYCLED_RATE','재생원료율 ZKP ({DPP}) 한계 판정','충족',
     'f0012f4b93b1d1209346449d7d9c5638f2af44827c1c7237a275aed6a4877907', 5730),
    ('M','CREATE','ZKP_PROOF','CARBON_LIMIT', 'CBAM 배출한계 ZKP ({DPP}) 판정','충족',
     '2b295fe6f18ee250bc9ce3285b9702f2328616f8031471796c9004bd44837a7e', 5716),
    -- DPP 발급 (스냅샷 앵커 tx와 동일한 해시 - 최상위)
    ('M','CREATE','DPP', NULL, '과천제철_테스트_형강 H (GCS-2026-0201-H400)','발급 완료',
     'd654f3bb7df8dc183f2ff6f6706900eb880dee996a4b34982db1dd8696a6e9d7', 4320)
  ) AS v(actor, action, ttype, doc, label, result, tx, age_m);

COMMIT;

-- =====================================================================
--  확인
-- =====================================================================
\echo ''
\echo '--- 감사 로그 (최신순 12건) ---'
SELECT to_char(l.created_at,'MM-DD HH24:MI') AS 시각,
       COALESCE(o.org_name,'-') AS 조직, l.action, l.target_type,
       l.after_value->>'targetLabel' AS 대상,
       left(COALESCE(l.after_value->>'txId','-'), 18) AS tx앞부분
  FROM audit_log l LEFT JOIN organization o ON o.org_id = l.actor_org_id
 ORDER BY l.created_at DESC LIMIT 12;

\echo ''
\echo '--- 앵커 상태 ---'
SELECT target_type, status, block_no, left(tx_id,18) AS tx앞부분
  FROM blockchain_anchor ORDER BY anchor_id DESC LIMIT 5;
