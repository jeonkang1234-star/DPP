package com.dpp.document.dto;

import java.util.Map;
import java.util.UUID;

/**
 * POST /document/upload/steel-mill 응답. 실측값(measured)은 그대로 노출하지만(업로드
 * 당사자에게는 자기 데이터이므로 문제없음), 증명(proof) 자체는 굳이 응답에 다시 싣지 않는다 -
 * 필요하면 zkp_proof.proof_id로 별도 조회 엔드포인트를 나중에 추가하면 된다.
 *
 * **cryptoVerified vs specPassed(2026-08-15 분리)**: SteelMillCheck 회로는 "Boolean
 * 출력형"이라(circuits.mjs 주석 참고) 화학성분/기계적성질이 규격을 벗어나도 증명 자체는
 * 항상 정상 생성·검증된다 - cryptoVerified는 그 증명 자체가 유효한지(거의 항상 true,
 * 시스템 정상 여부에 가까움)이고, specPassed가 실제로 "12개 항목 전부 규격 충족"인지다.
 * FE의 "검증 통과/실패" 표시와 document.review_status는 반드시 specPassed를 봐야 한다 -
 * 예전엔 cryptoVerified(당시 필드명 verified)를 보고 있어서, 규격 미달 성적서도 거의
 * 항상 "검증 통과"로 뜨는 버그였다(강이 리포트, 아직 발생 안 했지만 잠재적 오탐).
 */
public record SteelMillUploadResponse(
        Long documentId,
        Long proofId,
        Long dppId,
        UUID dppPublicUuid,
        boolean cryptoVerified,
        boolean specPassed,
        Map<String, Object> verdicts,
        Map<String, Long> measured,
        Map<String, Long> limits,
        /** blockchain.enabled=false거나 앵커링 실패 시 null - 성공하면 체인 트랜잭션 ID. */
        String documentAnchorTxId,
        String zkpAnchorTxId
) {
}
