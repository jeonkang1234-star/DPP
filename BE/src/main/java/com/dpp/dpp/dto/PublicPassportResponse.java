package com.dpp.dpp.dto;

import java.util.List;

/**
 * GET /public/dpp/{publicUuid} 응답 - 로그인 없이 QR/링크로 조회하는 소비자·세관·시장감시
 * 기관용 "공개 여권" 뷰(2026-08-18, 강 요청 - 기존 QR은 순수 텍스트만 인코딩해서 스캔하면
 * 그냥 구글 검색으로 빠지는 버그였다. publicUuid는 dpp 생성 시점부터 항상 발급되는 값
 * (FieldFormService.createDraftDpp)이라 어느 DPP든 이 값으로 안전하게 조회 가능).
 *
 * issued=false면 아직 발급 전(DRAFT) DPP라 나머지 필드는 비워서 내려준다 - 초안 데이터를
 * 공개로 노출하지 않는다(PublicPassportService.NOT_ISSUED 참고).
 */
public record PublicPassportResponse(
        boolean issued,
        String internalSku,
        String modelName,
        String domain,
        String issuedAtDate,
        List<PublicPassportFieldDto> fields
) {
}
