package com.dpp.mypage.dto;

/**
 * GET /me/scans/search 결과 한 행 - 개인 회원(SNS 로그인)이 제품명·브랜드로 검색했을 때
 * 보여주는 최소 정보(2026-08-23 강 요청 "정보 열람 범위는 개인이니까 가장 제한적으로").
 *
 * 규제기관용 DppSearchResultDto와 달리 dppId·serialNumber·hsCode·status가 없다.
 * 여기서 나가는 값은 전부 로그인 없이 /p/{publicUuid}로도 보이는 것들뿐이고,
 * publicUuid는 "그 공개 여권을 열기 위한 열쇠"라서 유일하게 필요한 식별자다.
 */
public record PersonalProductDto(
        String publicUuid,
        String productName,
        String brandName,
        String makerName,
        String issuedAtDate
) {
}
