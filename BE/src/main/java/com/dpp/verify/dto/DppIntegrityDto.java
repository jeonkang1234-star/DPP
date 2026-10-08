package com.dpp.verify.dto;

import java.util.List;

/**
 * GET /verify/dpp/{publicUuid}/integrity 응답(2026-10-08) - 세관·시장감시 화면의 "무결성 검증".
 *
 * @param overall        VERIFIED(전부 일치) / TAMPERED(불일치 발견) / PARTIAL(일부 확인 불가) / NO_RECORD(기록 없음)
 * @param overallLabel   화면 문구
 * @param ledgerConnected 실제 Fabric 원장에서 직접 읽었는지(false 면 시연 모드 - DB 의 앵커 기록과 비교)
 * @param versions       발급본(v1)부터 발급 이후 추가 기록본까지 버전별 결과
 * @param liveDrift      최신 기록본과 지금 값이 다른 항목 이름(기록 이후 몰래 바뀐 값)
 */
public record DppIntegrityDto(
        String overall,
        String overallLabel,
        String checkedAt,
        boolean ledgerConnected,
        List<Version> versions,
        List<String> liveDrift
) {
    /**
     * @param storedHash     발급(기록) 시점에 저장한 SHA-256
     * @param recomputedHash 저장된 기록본으로 지금 다시 계산한 SHA-256
     * @param ledgerHash     블록체인 원장에서 읽은 값(원장 미연결이면 앵커 행에 남긴 값)
     * @param verdict        MATCH / MISMATCH / NOT_ANCHORED / LEDGER_ERROR
     */
    public record Version(
            int versionNo,
            String reason,
            String reasonLabel,
            String createdAt,
            String storedHash,
            String recomputedHash,
            String ledgerHash,
            String ledgerSource,
            String anchorStatus,
            String txId,
            String blockNo,
            String anchoredAt,
            String verdict,
            String verdictLabel
    ) {
    }
}
