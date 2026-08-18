package com.dpp.dpp.dto;

import java.util.List;
import java.util.UUID;

/**
 * GET /me/field-form 응답. dppId가 null이면 아직 저장된 적 없는 새 폼(첫 임시저장 때
 * 새 product_model/dpp가 생성된다) - 이 경우 fields의 value는 전부 null이고 publicUuid도
 * null이다.
 *
 * publicUuid - 2026-08-18 강 요청("QR코드가 제 기능을 안함") 대응으로 추가. 발급 직후 QR을
 * 만들 때(FE issueDpp) 이 값으로 공개 조회 URL(/p/{publicUuid} -> GET /public/dpp/{publicUuid},
 * PublicPassportController)을 만든다 - dppId(내부 시퀀스 PK)를 그대로 노출하지 않는다.
 */
public record FieldFormResponse(
        Long dppId,
        UUID publicUuid,
        String domain,
        String status,
        double completeness,
        int filledCount,
        int requiredCount,
        List<FieldFormItemDto> fields
) {
}
