package com.dpp.document.dto;

import java.util.UUID;

/**
 * POST /document/upload/oekotex 응답. OekotexCheck도 FiberSumCheck과 같은 Boolean
 * 출력형 회로라 cryptoVerified(증명 자체 유효성)와 specPassed(pH가 4.0~7.5 범위인지)를
 * 분리한다 - CareLabelUploadResponse/SteelMillUploadResponse와 동일한 원칙.
 */
public record OekotexUploadResponse(
        Long documentId,
        Long proofId,
        Long dppId,
        UUID dppPublicUuid,
        boolean cryptoVerified,
        boolean specPassed,
        double ph,
        String documentAnchorTxId,
        String zkpAnchorTxId
) {
}
