package com.dpp.mypage.dto;

import java.util.List;

/** GET /me/scans/catalog 응답 - 페이지 단위(0부터). total은 필터가 걸린 전체 건수. */
public record PersonalCatalogPageDto(
        List<PersonalCatalogItemDto> items,
        long total,
        int page,
        int size
) {
}
