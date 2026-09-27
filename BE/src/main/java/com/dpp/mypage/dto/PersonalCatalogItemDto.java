package com.dpp.mypage.dto;

/**
 * GET /me/scans/catalog 한 행 - 개인 회원 "전체 제품 둘러보기"(2026-09-27).
 * PersonalProductDto와 같은 원칙: 공개 여권(/p/{publicUuid})에 로그인 없이 보이는 값만 내보낸다.
 * hasPhoto가 true면 FE가 /public/dpp/{publicUuid}/photo 로 썸네일을 그린다.
 */
public record PersonalCatalogItemDto(
        String publicUuid,
        String productName,
        String displayName,
        String brandName,
        String makerName,
        String domain,
        String issuedAtDate,
        boolean hasPhoto
) {
}
