package com.dpp.mypage.dto;

/** GET /me/scans/brands 한 행 - 브랜드별 발급 제품 수. */
public record PersonalBrandDto(
        String brandName,
        String makerName,
        String domain,
        long productCount
) {
}
