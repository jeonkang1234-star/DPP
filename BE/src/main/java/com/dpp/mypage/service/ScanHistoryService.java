package com.dpp.mypage.service;

import com.dpp.mypage.dto.ScanSummaryDto;
import com.dpp.mypage.entity.ScanHistory;
import com.dpp.mypage.repository.ScanHistoryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;

/** REQ-MYPAGE(개인): 제품 조회(스캔) 이력 조회/삭제. */
@Service
public class ScanHistoryService {

    private final ScanHistoryRepository scanHistoryRepository;

    public ScanHistoryService(ScanHistoryRepository scanHistoryRepository) {
        this.scanHistoryRepository = scanHistoryRepository;
    }

    @Transactional(readOnly = true)
    public List<ScanSummaryDto> getScans(Long userId) {
        return scanHistoryRepository.findByUserIdAndRemovedAtIsNullOrderByScannedAtDesc(userId).stream()
                .map(ScanSummaryDto::from)
                .toList();
    }

    /** 소프트 삭제 - 본인 기록이 아니면 404 (존재 여부 노출 방지 차원에서 403 대신 404). */
    @Transactional
    public void removeScan(Long userId, Long scanId) {
        ScanHistory scan = scanHistoryRepository.findByScanIdAndUserId(scanId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "조회 기록을 찾을 수 없습니다."));
        scan.setRemovedAt(OffsetDateTime.now());
        scanHistoryRepository.save(scan);
    }
}
