package com.dpp.mypage.dto;

/**
 * GET /admin/members 목록 한 줄 - FE 회원 관리 표(예전엔 data.json members 배열).
 *
 * 2026-08-20 강 요청("상세 버튼을 누르면 회사명·사업자등록번호·국가·전화번호가 보이게")으로
 * 담당자 연락처를 추가했다. 상세 모달만을 위한 별도 API를 만들지 않은 이유: 목록이
 * 조직 단위로 이미 한 번에 오고 건수도 수십 건 규모라, 행마다 다시 호출하는 것보다
 * 목록에 컬럼 세 개를 더 얹는 쪽이 단순하다.
 */
public record AdminMemberDto(
        Long orgId,
        String orgName,
        String bizRegNo,
        String joinedDate,
        String countryCode,
        String domainLabel,
        long heldDppCount,
        long issuedDppCount,
        String contactName,
        String contactPhone,
        String contactEmail
) {
}
