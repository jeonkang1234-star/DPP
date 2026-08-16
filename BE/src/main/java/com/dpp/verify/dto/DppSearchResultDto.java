package com.dpp.verify.dto;

/**
 * GET /verify/dpp/search 결과 한 행 - EU 시장감시(레지스트리)/관세청 통관 조회 화면
 * 공용. 예전 FE mock(euVals.js registry 배열)의 "DPP-KR-ST-2607-0142" 같은 예쁜 코드는
 * 실제 dpp 테이블 어디에도 없다(public_uuid는 그냥 UUID) - 발급 시 사람이 읽기 좋은
 * 코드를 따로 채번하는 기능 자체가 아직 없어서, 지금은 실제 publicUuid를 그대로 내려주고
 * FE에서 표시용으로 축약한다(2026-08-16).
 */
public record DppSearchResultDto(
        Long dppId,
        String publicUuid,
        String serialNumber,
        String modelName,
        String orgName,
        String hsCode,
        String domain,
        String status,
        String issuedAtDate
) {
}
