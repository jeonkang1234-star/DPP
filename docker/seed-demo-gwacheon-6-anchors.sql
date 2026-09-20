-- =====================================================================
--  시연용 과천제철 세트 - 6차: 블록체인 앵커 이력 재구축
--  전제: 1~5차 실행 완료
--
--  *** 실행 (docker/ 디렉터리에서) ***
--    docker cp seed-demo-gwacheon-6-anchors.sql dpp-postgres:/tmp/s6.sql
--    docker exec -i dpp-postgres psql -U dpp -d dpp -f /tmp/s6.sql
--
--  ■ 배경
--    운영자 대시보드의 블록체인 카드(최근 앵커링·블록 높이·성공률·14일 추이)는
--    체인 API가 아니라 blockchain_anchor 테이블 집계다(AdminDashboardService 주석).
--    EC2 소실로 앵커가 스냅샷 1건뿐이라 성공률/추이가 "데이터 없음"으로 떴고,
--    5차에서 임의로 넣은 블록높이 18427은 데모영상(80번대에서 종료)과 어긋난다.
--
--  ■ 방침
--    - 블록 높이는 데모영상의 연속으로: 62 ~ 97 (최신 = 97)
--    - 문서 앵커 12건은 document.content_hash 실제 값을 그대로 앵커에 기록
--    - 밀시트/CBAM/스크랩 문서와 ZKP·발급 앵커의 tx는 5차 감사로그 txId와 동일
--      -> 감사 로그에서 본 해시를 앵커에서 다시 봐도 같은 값
--    - 최근 14일에 걸쳐 분산 -> 스파크라인·30일 성공률이 채워진다
-- =====================================================================
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE t ON COMMIT DROP AS
SELECT d.dpp_id FROM dpp d WHERE d.serial_number='GCS-2026-0201-H400';

-- ─────────────────────────────────────────────────────────────────────
-- 1) 스냅샷 앵커(기존 행)를 데모영상 연속 블록으로 수정 - 발급 시점 3일 전
-- ─────────────────────────────────────────────────────────────────────
UPDATE blockchain_anchor a
   SET block_no = 96, status = 'CONFIRMED',
       anchored_at = now() - interval '3 days'
  FROM dpp_snapshot s, t
 WHERE a.target_type='DPP_SNAPSHOT' AND a.target_id = s.snapshot_id
   AND s.dpp_id = t.dpp_id;

-- ─────────────────────────────────────────────────────────────────────
-- 2) 과천제철 문서 앵커 12건 - 실제 content_hash 사용, 업로드일(4일 전) 분산
--    tx: 밀시트/CBAM/스크랩은 5차 감사로그와 동일, 나머지는 신규 해시
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO blockchain_anchor (target_type, target_id, content_hash, channel_name,
                               chaincode, tx_id, block_no, status, anchored_at)
SELECT 'DOCUMENT', x.document_id, x.content_hash, 'dpp-channel', 'dppcc',
       v.tx, v.blk, 'CONFIRMED', now() - interval '4 days' + (v.ord || ' minutes')::interval
  FROM t
  JOIN document x ON x.owner_type='DPP' AND x.owner_id=t.dpp_id AND x.deleted_at IS NULL
  JOIN (VALUES
    ('MILL_SHEET',  'd7321214e9a42fa3d0372a8136211b8fa1f1c34357942a996388f5e455879826', 81, 0),
    ('TECH_FILE',   '429c7854a61d937d999e2946a6cc5519ad77bef2ca7265fd40a5ff537ee8cf7d', 82, 7),
    ('TEST_REPORT', 'eb69ddd125fe3e4a435b03ea1ed47636b06a0b5941f778111e64ca99502449bb', 83, 15),
    ('EU_DOC',      '7434349a6ed2185e7c8ac6622d1d5d8cce2184a5688bd9beb3f551ad5df4e6c2', 84, 24),
    ('COO',         '6de16496cee507f69ee892595af9cea8a8431000e2ff7001fe8eb9ee6b9c4aae', 85, 31),
    ('SOC_SDS',     '583e921ab7b13f6c397689fe3f9253da36bafa45ba662981583ad53690f8f176', 86, 40),
    ('LCA_EPD',     '8c0347712db8e6c1c6392a0602f32c5741b8e3d8c3ff08604be56ebb08a30d59', 87, 48),
    ('PCF_REPORT',  '4157e82b947f8665983618ddaf361f43df451ec2842a1d2856e56185ad3a6390', 88, 55),
    ('LABEL',       '5b8ebc926a3883710bb9ba0f2d5dcc1bb1f65bc880d89426e67fba5cb75bf90a', 89, 63),
    ('MANUAL',      'd4601626f4dd7e80a139b4fc180dbe405009cd94920d74503846dd8218eed308', 90, 71),
    ('CBAM_REPORT', '4ad38b64303096c85ecfff1b8fe700d23c22c8061069b221aa2128683fd1e17a', 91, 78),
    ('SCRAP_PROOF', 'cb22e15d9e18273cc3874693024679bd54953ad915fe146093b05fca5a2331a9', 92, 86)
  ) AS v(doc, tx, blk, ord) ON v.doc = x.doc_type_code
 WHERE NOT EXISTS (SELECT 1 FROM blockchain_anchor b
                    WHERE b.target_type='DOCUMENT' AND b.target_id=x.document_id);

-- ─────────────────────────────────────────────────────────────────────
-- 3) ZKP 판정 앵커 3건 (EVENT) - tx는 5차 감사로그·zkp_proof와 동일
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO blockchain_anchor (target_type, target_id, content_hash, channel_name,
                               chaincode, tx_id, block_no, status, anchored_at)
SELECT 'EVENT', z.proof_id, v.tx, 'dpp-channel', 'dppcc',
       v.tx, v.blk, 'CONFIRMED', now() - interval '4 days' + (v.ord || ' minutes')::interval
  FROM t
  JOIN zkp_proof z ON z.dpp_id=t.dpp_id AND z.status='VERIFIED'
  JOIN (VALUES
    ('CERT_VALID',    '85ad9f76511c29b2b1f8aa01fa5808e2f8ec617eea31f035d9439b6601b18a1f', 93,  95),
    ('RECYCLED_RATE', 'f0012f4b93b1d1209346449d7d9c5638f2af44827c1c7237a275aed6a4877907', 94, 104),
    ('CARBON_LIMIT',  '2b295fe6f18ee250bc9ce3285b9702f2328616f8031471796c9004bd44837a7e', 95, 112)
  ) AS v(claim, tx, blk, ord) ON v.claim = z.claim_type
 WHERE NOT EXISTS (SELECT 1 FROM blockchain_anchor b
                    WHERE b.target_type='EVENT' AND b.target_id=z.proof_id);

-- ─────────────────────────────────────────────────────────────────────
-- 4) 배경 앵커 - 다른 회사들 활동(감사로그 5차의 tx와 일치) + 14일 분산용
--    블록 62~80: 데모영상 시절 + 그 이후 다른 회사 활동으로 자연스럽게 채움
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO blockchain_anchor (target_type, target_id, content_hash, channel_name,
                               chaincode, tx_id, block_no, status, anchored_at)
SELECT v.ttype, 0, v.tx, 'dpp-channel', 'dppcc', v.tx, v.blk, 'CONFIRMED',
       now() - (v.age_h || ' hours')::interval
  FROM (VALUES
    ('DPP_SNAPSHOT', 'b4bc4c2c5b2ed71447b2aae7de66fc3ec0dd11206d11c24b19c60e1a37fe8ac4', 74, 168),
    ('DOCUMENT',     'add0f82cab35e381c898d39b924aa41029a705147a99330c641d5aeac806f8bb', 76, 150),
    ('DPP_SNAPSHOT', '54febd6198fc6258b6204e79754489ee58e70bb875b7c1f539d5c92df2f29187', 78, 139),
    ('DOCUMENT',     '4d37bf5bc0997c0bba0ae5d079af0daf1c3742bd7fc0e6b12e4656c6b6ac73e9', 62, 320),
    ('DOCUMENT',     'b4023b681f38d6721b6a39098f7aa0ab63e771571bccc51359f86520e8a238d9', 65, 290),
    ('DPP_SNAPSHOT', '36b762f8661bc390ff8ab42bd0152bb9cfe27633ca68560596b900d5c7a4b4cc', 68, 262),
    ('DOCUMENT',     '8fe0aa4d12fe71010103d0db2260c7a72f0d5f16bdcf7e4b4f01d604ba35daae', 71, 210),
    -- 가장 최근: 오늘 새벽 재검증 이벤트 -> "최근 앵커링 N시간 전" + 블록 97
    ('EVENT',        '805bbbedb4494383ad59172596d160f8804772a2cc44deb95447586820ea9feb', 97, 5)
  ) AS v(ttype, tx, blk, age_h)
 WHERE NOT EXISTS (SELECT 1 FROM blockchain_anchor b WHERE b.tx_id = v.tx);

COMMIT;

-- =====================================================================
--  확인
-- =====================================================================
\echo ''
\echo '--- 앵커 요약 (최신 블록이 97이어야 정상) ---'
SELECT count(*) AS 총앵커, max(block_no) AS 최고블록,
       count(*) FILTER (WHERE status='CONFIRMED') AS confirmed,
       to_char(max(anchored_at),'MM-DD HH24:MI') AS 최근앵커
  FROM blockchain_anchor;

\echo ''
\echo '--- 최근 앵커 8건 ---'
SELECT block_no, target_type, status, left(tx_id,18) AS tx, to_char(anchored_at,'MM-DD HH24:MI') AS 시각
  FROM blockchain_anchor ORDER BY anchored_at DESC NULLS LAST LIMIT 8;
