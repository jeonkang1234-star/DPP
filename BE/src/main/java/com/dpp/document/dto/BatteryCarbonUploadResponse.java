package com.dpp.document.dto;

import java.util.Map;
import java.util.UUID;

/**
 * POST /document/upload/battery-carbon 응답. BatteryCheck도 "Boolean 출력형" 회로라
 * cryptoVerified(증명 자체 유효성)와 specPassed(재생원료 Co/Li/Ni/Pb 임계값 충족 여부)를
 * 분리한다 - SteelMillUploadResponse/CareLabelUploadResponse와 동일한 원칙. verdicts엔
 * capacityDeclarationFlag(탄소발자국 선언 의무 대상 여부, 정보성 플래그)도 같이 담겨 오지만,
 * CbamUploadResponse의 obligated와 같은 성격이라 specPassed 판정에는 포함하지 않는다
 * (BatteryCarbonIngestService 참고).
 */
public record BatteryCarbonUploadResponse(
        Long documentId,
        Long proofId,
        Long dppId,
        UUID dppPublicUuid,
        boolean cryptoVerified,
        boolean specPassed,
        Map<String, Object> verdicts,
        double recycledCobaltPercent,
        double recycledLithiumPercent,
        double recycledNickelPercent,
        double recycledLeadPercent,
        double ratedCapacityKwh,
        boolean carbonDeclarationRequired,
        String documentAnchorTxId,
        String zkpAnchorTxId
) {
}
