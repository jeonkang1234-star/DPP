package com.dpp.document.dto;

import java.util.Map;
import java.util.UUID;

/**
 * POST /document/upload/steel-mill 응답. 실측값(measured)은 그대로 노출하지만(업로드
 * 당사자에게는 자기 데이터이므로 문제없음), 증명(proof) 자체는 굳이 응답에 다시 싣지 않는다 -
 * 필요하면 zkp_proof.proof_id로 별도 조회 엔드포인트를 나중에 추가하면 된다.
 */
public record SteelMillUploadResponse(
        Long documentId,
        Long proofId,
        Long dppId,
        UUID dppPublicUuid,
        boolean verified,
        Map<String, Object> verdicts,
        Map<String, Long> measured,
        Map<String, Long> limits,
        /** blockchain.enabled=false거나 앵커링 실패 시 null - 성공하면 체인 트랜잭션 ID. */
        String documentAnchorTxId,
        String zkpAnchorTxId
) {
}
