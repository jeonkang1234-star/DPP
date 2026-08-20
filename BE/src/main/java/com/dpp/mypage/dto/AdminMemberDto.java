package com.dpp.mypage.dto;

/** GET /admin/members 목록 한 줄 - FE 회원 관리 표(예전엔 data.json members 배열). */
public record AdminMemberDto(
        Long orgId,
        String orgName,
        String bizRegNo,
        String joinedDate,
        String countryCode,
        String domainLabel,
        long heldDppCount,
        long issuedDppCount
) {
}
