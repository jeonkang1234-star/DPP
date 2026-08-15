package com.dpp.document.dto;

import java.util.UUID;

/**
 * POST /document/upload/cbam 응답. obligated는 "적합/부적합"이 아니라 "CBAM 신고 의무가
 * 발생했는가"라서 true/false 둘 다 정상적인 결과다 - SteelMillUploadResponse의 verified와
 * 성격이 다르다는 점에 주의(CbamIngestService 클래스 주석 참고).
 */
public record CbamUploadResponse(
        Long documentId,
        Long proofId,
        Long dppId,
        UUID dppPublicUuid,
        boolean obligated,
        double importQuantityT,
        double deMinimisT,
        String documentAnchorTxId,
        String zkpAnchorTxId
) {
}
