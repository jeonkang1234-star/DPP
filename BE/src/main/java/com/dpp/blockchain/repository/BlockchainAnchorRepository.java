package com.dpp.blockchain.repository;

import com.dpp.blockchain.entity.BlockchainAnchor;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BlockchainAnchorRepository extends JpaRepository<BlockchainAnchor, Long> {
}
