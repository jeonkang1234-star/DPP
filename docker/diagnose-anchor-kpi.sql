-- 관리자 대시보드 앵커 KPI 진단 (2026-08-22 강 리포트:
--   "30일 성공률은 100%인데 최근 앵커링은 '기록 없음', 블록 높이도 '—'")
--
-- 사용법 (EC2에서):
--   docker cp diagnose-anchor-kpi.sql dpp-postgres:/tmp/
--   docker exec -i dpp-postgres psql -U dpp -d dpp -f /tmp/diagnose-anchor-kpi.sql
--
-- 읽는 법:
--   [1] rows>0 인데 화면이 '기록 없음'이면 -> 백엔드 변환 문제(이번 커밋에서 SQL 계산으로 변경).
--   [2] block_no가 전부 NULL이면 -> 블록 높이가 '—'인 게 정상. block_no를 채우는 코드가
--       2026-08-22 이전엔 아예 없었다. 배포 후 문서를 한 건 새로 업로드하면 채워진다.
--   [3] status가 전부 MOCK이면 -> Fabric 연동이 꺼진 채로 뜬 것(BLOCKCHAIN_ENABLED).
--       이땐 실제 블록 번호가 존재할 수 없다.

\echo '=== [1] 최근 앵커 10건 ==='
SELECT anchor_id, target_type, target_id, status, block_no,
       LEFT(COALESCE(tx_id, ''), 24) AS tx_id_head,
       anchored_at, created_at
FROM blockchain_anchor
ORDER BY COALESCE(anchored_at, created_at) DESC
LIMIT 10;

\echo '=== [2] 대시보드가 실제로 읽는 값(수정 후 쿼리와 동일) ==='
SELECT CAST(FLOOR(EXTRACT(EPOCH FROM (now() - COALESCE(a.anchored_at, a.created_at))) / 60) AS bigint) AS minutes_ago,
       (SELECT MAX(block_no) FROM blockchain_anchor WHERE block_no IS NOT NULL) AS block_height
FROM blockchain_anchor a
ORDER BY COALESCE(a.anchored_at, a.created_at) DESC
LIMIT 1;

\echo '=== [3] 상태별 집계 / block_no 채워진 건수 ==='
SELECT status,
       COUNT(*) AS cnt,
       COUNT(block_no) AS with_block_no,
       MIN(created_at) AS oldest,
       MAX(created_at) AS newest
FROM blockchain_anchor
GROUP BY status
ORDER BY cnt DESC;

\echo '=== [4] 최근 30일 성공률(화면의 100%가 어디서 나오는지) ==='
SELECT COUNT(*) AS total_30d,
       COUNT(*) FILTER (WHERE status IN ('MOCK','CONFIRMED')) AS ok_30d
FROM blockchain_anchor
WHERE created_at >= now() - INTERVAL '30 days';
