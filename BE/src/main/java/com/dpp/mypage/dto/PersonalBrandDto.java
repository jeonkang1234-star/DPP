package com.dpp.mypage.dto;

/** GET /me/scans/brands 한 행 - 브랜드별 발급 제품 수·모델 수·최근 발급일. */
public record PersonalBrandDto(
        String brandName,
        String makerName,
        String domain,
        long productCount,
        long modelCount,
        String latestIssuedDate
) {
}
