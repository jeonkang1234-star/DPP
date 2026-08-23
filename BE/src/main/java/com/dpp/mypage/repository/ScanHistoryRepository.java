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

    /**
     * 같은 제품을 다시 열람했을 때 새 행을 쌓지 않고 기존 행의 열람 일시만 갱신하기 위한 조회
     * (2026-08-23). 최근 5건만 보여주는 화면이라, 같은 제품 재열람이 목록 5칸을 다 잡아먹으면
     * "최근에 본 제품들"이라는 의미 자체가 없어진다. passport_code(=public_uuid)로 찾는다 -
     * dpp_id는 V8 설계상 nullable이라 기준으로 삼기엔 약하다.
     */
    Optional<ScanHistory> findFirstByUserIdAndPassportCodeAndRemovedAtIsNull(Long userId, String passportCode);
}
