-- 블록체인 앵커링 / 영지식증명(ZKP) 모니터링 (2026-08-23)
--
-- 사용법 (EC2에서):
--   docker cp monitor-chain-zkp.sql dpp-postgres:/tmp/
--   docker exec -i dpp-postgres psql -U dpp -d dpp -f /tmp/monitor-chain-zkp.sql
--
-- 이 스크립트는 "앱이 체인/ZKP에 무엇을 남겼는가"를 본다. 체인 자체(블록 내용)를 보려면
-- peer CLI나 Hyperledger Explorer를 써야 한다 - 아래 [6] 참고.

\echo '=== [1] 앵커 상태 요약 (MOCK=가상 tx, CONFIRMED=실제 Fabric 커밋) ==='
SELECT status,
       COUNT(*)                       AS 건수,
       COUNT(block_no)                AS 블록번호_있음,
       MIN(block_no)                  AS 최소블록,
       MAX(block_no)                  AS 최대블록,
       MAX(COALESCE(anchored_at, created_at)) AS 최근시각
  FROM blockchain_anchor
 GROUP BY status
 ORDER BY 건수 DESC;

\echo '=== [2] 최근 앵커 15건 (무엇을 언제 어느 블록에) ==='
SELECT a.anchor_id, a.target_type, a.target_id, a.status, a.block_no,
       LEFT(a.tx_id, 20) || '…'        AS tx_id,
       LEFT(a.content_hash, 16) || '…' AS content_hash,
       COALESCE(a.anchored_at, a.created_at) AS 시각,
       LEFT(COALESCE(a.error_message, ''), 60) AS 오류
  FROM blockchain_anchor a
 ORDER BY COALESCE(a.anchored_at, a.created_at) DESC
 LIMIT 15;

\echo '=== [3] 실패한 앵커 (여기에 행이 있으면 체인 연동이 깨진 것) ==='
SELECT anchor_id, target_type, target_id, retry_count, created_at,
       LEFT(COALESCE(error_message, ''), 200) AS error_message
  FROM blockchain_anchor
 WHERE status = 'FAILED'
 ORDER BY created_at DESC
 LIMIT 10;

\echo '=== [4] ZKP 증명 상태 요약 ==='
SELECT status, claim_type, COUNT(*) AS 건수, MAX(created_at) AS 최근생성
  FROM zkp_proof
 GROUP BY status, claim_type
 ORDER BY 건수 DESC;

\echo '=== [5] 최근 ZKP 증명 10건 + 그 증명이 체인에 올라갔는지 ==='
-- 앵커는 target_type='EVENT', target_id=proof_id로 남는다(DocumentIngestService 참고).
SELECT z.proof_id, z.dpp_id, z.claim_type, z.status AS zkp_status,
       z.circuit_name,
       LENGTH(COALESCE(z.proof_data, '')) AS 증명바이트,
       z.public_signals,
       a.status  AS anchor_status,
       a.block_no,
       LEFT(COALESCE(a.tx_id, '(없음)'), 20) AS anchor_tx,
       z.created_at
  FROM zkp_proof z
  LEFT JOIN blockchain_anchor a
         ON a.target_type = 'EVENT' AND a.target_id = z.proof_id
 ORDER BY z.created_at DESC
 LIMIT 10;

\echo '=== [6] 앵커가 없는 ZKP / ZKP가 없는 문서 (누락 탐지) ==='
SELECT '앵커 없는 ZKP' AS 구분, COUNT(*) AS 건수
  FROM zkp_proof z
 WHERE NOT EXISTS (SELECT 1 FROM blockchain_anchor a
                    WHERE a.target_type = 'EVENT' AND a.target_id = z.proof_id)
UNION ALL
SELECT '앵커 없는 문서', COUNT(*)
  FROM document d
 WHERE d.deleted_at IS NULL
   AND NOT EXISTS (SELECT 1 FROM blockchain_anchor a
                    WHERE a.target_type = 'DOCUMENT' AND a.target_id = d.document_id);
