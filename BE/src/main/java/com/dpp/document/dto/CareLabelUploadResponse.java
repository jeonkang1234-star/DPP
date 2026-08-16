package com.dpp.document.dto;

import java.util.UUID;

/**
 * POST /document/upload/textile-care-label 응답. SteelMillUploadResponse와 같은
 * cryptoVerified/specPassed 분리 원칙을 따른다 - FiberSumCheck은 "Boolean 출력형" 회로라
 * 혼용률 합계가 기준을 벗어나도 증명 자체는 항상 정상 생성·검증된다. cryptoVerified는
 * 증명 자체의 크립토 유효성이고, specPassed가 실제 "혼용률 합계 ≈100%" 충족 여부다.
 */
public record CareLabelUploadResponse(
        Long documentId,
        Long proofId,
        Long dppId,
        UUID dppPublicUuid,
        boolean cryptoVerified,
        boolean specPassed,
        double totalPercent,
        String documentAnchorTxId,
        String zkpAnchorTxId
) {
}
