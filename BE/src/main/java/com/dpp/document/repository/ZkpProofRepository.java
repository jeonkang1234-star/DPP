package com.dpp.document.repository;

import com.dpp.document.entity.ZkpProof;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ZkpProofRepository extends JpaRepository<ZkpProof, Long> {

    /** 대시보드 "ZKP 증명 상태" 카드 집계용 - com.dpp.dpp.service.DashboardService에서 사용. */
    long countByDppIdInAndStatus(List<Long> dppIds, String status);

    /**
     * 공개 QR 페이지가 영업비밀 항목을 "값 대신 충족 사실"로 바꿔 보여줄 때 쓴다
     * (PublicPassportService). 이 DPP에 VERIFIED 증명이 하나라도 있으면 그 문서가 규격을
     * 통과했다는 뜻이고, 그때만 "한계값 충족(검증됨)"이라고 말할 수 있다 - 증명이 없는데
     * 충족했다고 쓰면 그게 제일 나쁜 거짓말이다.
     */
    List<ZkpProof> findByDppIdAndStatus(Long dppId, String status);
}
