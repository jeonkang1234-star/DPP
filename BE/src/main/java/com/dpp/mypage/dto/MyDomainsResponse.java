package com.dpp.mypage.dto;

import java.util.List;

/**
 * GET /me/domains - DPP 생성 탭의 도메인 선택기와 마이페이지 도메인 카드가 함께 쓴다.
 *
 * @param baseDomain     가입 시 확정된 주력 도메인(organization.domain). 확장과 무관하게 항상 쓸 수 있다.
 * @param allowedDomains 실제로 DPP를 발급할 수 있는 도메인 전부(주력 + 승인된 확장).
 * @param grants         신청 이력 전부(대기·승인·반려) - 마이페이지에서 진행 상황을 보여준다.
 */
public record MyDomainsResponse(
        String baseDomain,
        List<DomainOption> allowedDomains,
        List<DomainGrantResponse> grants
) {
    /** 화면 선택지 한 줄. code는 STEEL/BATTERY/TEXTILE, label은 한국어. */
    public record DomainOption(String code, String label) {
    }
}
