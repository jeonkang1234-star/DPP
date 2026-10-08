package com.dpp.dpp.service;

import com.dpp.blockchain.client.BlockchainClient;
import com.dpp.blockchain.entity.BlockchainAnchor;
import com.dpp.blockchain.repository.BlockchainAnchorRepository;
import com.dpp.dpp.repository.DppQueryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

/**
 * DPP 스냅샷 동결 + 블록체인 앵커링.
 *
 * 원래 FieldFormService.issue() 안에만 있던 로직이다. 2026-10-08부터 발급 이후 단계
 * (회수·재활용 등)의 데이터가 들어올 때도 새 스냅샷을 쌓아야 해서(V41) 문서 업로드
 * 경로(DocumentSlotService, RecyclingIngestService)에서도 같이 쓰도록 빼냈다.
 *
 * 스냅샷은 덮어쓰지 않는다 - fn_create_dpp_snapshot이 version_no를 1씩 올려 새 행을
 * 만들고, 발급 시점(ISSUE) 스냅샷과 그 앵커는 그대로 남는다. 그래서 "발급할 때 이랬고,
 * 회수 후 이 실적이 더해졌다"를 버전별로 각각 검증할 수 있다.
 *
 * 실패해도 호출한 쪽의 작업(발급·저장·업로드)을 막지 않는다 - 앵커링은 부가 증빙이다.
 */
@Service
public class DppSnapshotAnchorService {

    private static final Logger log = LoggerFactory.getLogger(DppSnapshotAnchorService.class);
    private static final DateTimeFormatter TIMESTAMP_FORMAT = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    /** 발급 시점 스냅샷. */
    public static final String REASON_ISSUE = "ISSUE";
    /** 발급 이후 단계 데이터 반영 스냅샷(V41). */
    public static final String REASON_LIFECYCLE = "LIFECYCLE";

    private final DppQueryRepository dppRepository;
    private final BlockchainAnchorRepository blockchainAnchorRepository;
    private final Optional<BlockchainClient> blockchainClient;

    public DppSnapshotAnchorService(DppQueryRepository dppRepository,
                                    BlockchainAnchorRepository blockchainAnchorRepository,
                                    Optional<BlockchainClient> blockchainClient) {
        this.dppRepository = dppRepository;
        this.blockchainAnchorRepository = blockchainAnchorRepository;
        this.blockchainClient = blockchainClient;
    }

    /**
     * 지금 DPP 내용으로 스냅샷을 하나 더 만들고 앵커링한다.
     *
     * @return 앵커 tx_id (체인이 꺼진 환경이면 'mock-…'), 실패하면 null
     */
    public String snapshotAndAnchor(Long dppId, String reason, Long userId, Long orgId) {
        Long snapshotId;
        try {
            snapshotId = dppRepository.createSnapshot(dppId, reason, userId);
        } catch (Exception e) {
            log.warn("dppId={} reason={} 스냅샷 생성 실패 - 원래 작업은 계속 진행: {}", dppId, reason, e.getMessage(), e);
            return null;
        }
        if (snapshotId == null) {
            return null;
        }
        String contentHash = dppRepository.findSnapshotContentHash(snapshotId);
        if (contentHash == null) {
            return null;
        }
        Optional<BlockchainAnchor> anchorOpt =
                blockchainAnchorRepository.findFirstByTargetTypeAndTargetIdOrderByAnchorIdDesc("DPP_SNAPSHOT", snapshotId);
        if (anchorOpt.isEmpty()) {
            return null;
        }
        BlockchainAnchor anchor = anchorOpt.get();
        if (blockchainClient.isEmpty()) {
            // fn_create_dpp_snapshot이 p_mock=true로 이미 status='MOCK', tx_id='mock-'||해시인
            // 앵커 행을 만들어 놓은 상태다.
            return anchor.getTxId();
        }
        try {
            BlockchainClient.ChainResult result = blockchainClient.get().recordDocumentHash(
                    "snapshot:" + snapshotId,
                    "DPP_SNAPSHOT",
                    contentHash,
                    orgId == null ? "" : orgId.toString(),
                    OffsetDateTime.now().format(TIMESTAMP_FORMAT));
            anchor.setTxId(result.txId());
            anchor.setBlockNo(result.blockNumber());
            anchor.setStatus("CONFIRMED");
            anchor.setAnchoredAt(OffsetDateTime.now());
            blockchainAnchorRepository.save(anchor);
            return result.txId();
        } catch (Exception e) {
            log.warn("snapshotId={} 블록체인 앵커링 실패: {}", snapshotId, e.getMessage(), e);
            anchor.setStatus("FAILED");
            anchor.setErrorMessage(truncate(e.getMessage(), 500));
            blockchainAnchorRepository.save(anchor);
            return null;
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return null;
        }
        return s.length() > max ? s.substring(0, max) : s;
    }
}
