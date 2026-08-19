package com.dpp.dpp.dto;

/**
 * GET /public/dpp/{publicUuid} 응답 안의 필드 1건.
 *
 * 2026-08-19: 공개범위(requirement_field.disclosure_scope)를 반영하면서 세 가지가 늘었다.
 *   - section/tier    : 소비자 화면에서 항목을 묶고, 법정필수 항목을 구분해 보여주기 위한 것.
 *   - value           : PUBLIC 항목만 실제 값이 들어간다. TRADE_SECRET 항목은 null이고
 *                       대신 proofLabel이 채워진다.
 *   - proofLabel      : "한계값 충족(ZKP 검증됨)" 같은 대체 표시. 값 자체를 공개하지 않고
 *                       조건 충족 사실만 밝히는 항목에 쓴다.
 *
 * RESTRICTED 항목은 아예 이 목록에 들어오지 않는다 - 정당한 이익 보유자·시장감시당국만
 * 볼 수 있는 항목이라 공개 페이지에는 존재 자체를 노출하지 않고, 응답의 restrictedCount로
 * 개수만 알린다.
 */
public record PublicPassportFieldDto(
        String labelKo,
        String labelEn,
        String section,
        String tier,
        String value,
        String proofLabel
) {
}
