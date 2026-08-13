package com.dpp.document.repository;

import com.dpp.document.entity.ZkpProof;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ZkpProofRepository extends JpaRepository<ZkpProof, Long> {

    /** 대시보드 "ZKP 증명 상태" 카드 집계용 - com.dpp.dpp.service.DashboardService에서 사용. */
    long countByDppIdInAndStatus(List<Long> dppIds, String status);
}
