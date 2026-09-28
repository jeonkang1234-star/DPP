package com.dpp.verify.dto;

import com.dpp.dpp.dto.PublicPassportResponse;

import java.util.List;
import java.util.Map;

/**
 * GET /verify/dpp/{publicUuid}/detail - 규제기관(EU 시장감시/세관) 전용 DPP 상세
 * (2026-09-28 강 요청). 개인이 QR로 보는 공개 여권보다 넓은 범위를 담는다.
 *
 * product/manufacturer는 화면에 "라벨: 값" 표로 그대로 그리므로 순서가 있는 Map(LinkedHashMap)
 * 이다. 나머지 목록도 행마다 Map이다 - 각 섹션이 단순 표라 전용 record를 여러 개 만드는 것보다
 * FE/BE 양쪽에서 다루기 쉽다. passport는 공개 여권 응답 그대로(규제기관 토큰이라 RESTRICTED
 * 항목 값까지 들어 있다).
 */
public record RegulatorDppDetailDto(
        Map<String, String> product,
        Map<String, String> manufacturer,
        List<Map<String, String>> participants,
        List<Map<String, String>> documents,
        List<Map<String, String>> proofs,
        List<Map<String, String>> anchors,
        List<Map<String, String>> clearances,
        boolean hasPhoto,
        /** 개인 QR 조회에서는 가려지는(RESTRICTED) 항목 라벨 - 화면에서 "규제기관 전용" 표시용. */
        List<String> restrictedLabels,
        PublicPassportResponse passport
) {
}
