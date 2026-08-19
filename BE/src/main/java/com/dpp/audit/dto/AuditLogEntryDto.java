package com.dpp.audit.dto;

/** GET /audit-log 한 줄 - FE 감사 로그 조회 화면(euVals.js scAudit, 예전엔 하드코딩 배열 8건). */
public record AuditLogEntryDto(
        String atIso,
        String actor,
        String action,
        String target,
        String result,
        String txId
) {
}
