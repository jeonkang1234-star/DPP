package com.dpp.dpp.dto;

/**
 * GET /public/dpp/{publicUuid} 응답 안의 필드 1건 - 실제 채워진 값만 담는다(공개
 * 페이지라 미입력 항목까지 노출할 필요가 없다, PublicPassportService 참고).
 */
public record PublicPassportFieldDto(
        String labelKo,
        String value
) {
}
