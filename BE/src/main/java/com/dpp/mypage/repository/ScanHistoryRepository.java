package com.dpp.mypage.repository;

import com.dpp.mypage.entity.ScanHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ScanHistoryRepository extends JpaRepository<ScanHistory, Long> {

    /** 삭제(removed_at)되지 않은 본인 스캔 이력, 최신순. */
    List<ScanHistory> findByUserIdAndRemovedAtIsNullOrderByScannedAtDesc(Long userId);

    /** 삭제 처리 시 본인 소유 확인용 - userId까지 같이 조건에 넣어 남의 기록을 못 지우게 한다. */
    Optional<ScanHistory> findByScanIdAndUserId(Long scanId, Long userId);
}
