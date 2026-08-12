package com.dpp.mypage.dto;

import com.dpp.mypage.entity.ScanHistory;

import java.time.OffsetDateTime;

/** GET /me/scans 응답 한 행. FE useAppLogic.js의 `scans` 하드코딩 배열을 대체한다. */
public record ScanSummaryDto(
        Long scanId,
        String passportCode,
        String productName,
        String brandName,
        String status,
        OffsetDateTime scannedAt,
        OffsetDateTime passportUpdatedAt
) {
    public static ScanSummaryDto from(ScanHistory scan) {
        return new ScanSummaryDto(
                scan.getScanId(),
                scan.getPassportCode(),
                scan.getProductName(),
                scan.getBrandName(),
                scan.getStatus().name(),
                scan.getScannedAt(),
                scan.getPassportUpdatedAt());
    }
}
