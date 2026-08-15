package com.dpp.blockchain.repository;

import com.dpp.blockchain.entity.BlockchainAnchor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BlockchainAnchorRepository extends JpaRepository<BlockchainAnchor, Long> {

    /** fn_create_dpp_snapshot이 SQL에서 직접 만든 MOCK 앵커 행을 찾아 실제 체인 결과로 덮어쓸 때 사용. */
    Optional<BlockchainAnchor> findFirstByTargetTypeAndTargetIdOrderByAnchorIdDesc(String targetType, Long targetId);
}
