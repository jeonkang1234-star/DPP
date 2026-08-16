package com.dpp.document.dto;

import java.util.Map;
import java.util.UUID;

/**
 * POST /document/upload/recycling-report 응답. RecyclingCheck의 verdicts 3항목(cuOk/liOk/
 * coOk)은 셋 다 실제 규격 판정이라(CBAM의 obligated나 배터리의 capacityDeclarationFlag
 * 같은 정보성 플래그가 없음) specPassed는 셋 다 true인지로 그대로 판단한다.
 * overallRecyclingRatePercent는 ZKP 대상이 아닌 정보성 값이라 null일 수 있다
 * (RecyclingZkpMapper 참고).
 */
public record RecyclingUploadResponse(
        Long documentId,
        Long proofId,
        Long dppId,
        UUID dppPublicUuid,
        boolean cryptoVerified,
        boolean specPassed,
        Map<String, Object> verdicts,
        double copperRecoveryPercent,
        double lithiumRecoveryPercent,
        double cobaltRecoveryPercent,
        Double overallRecyclingRatePercent,
        String documentAnchorTxId,
        String zkpAnchorTxId
) {
}
