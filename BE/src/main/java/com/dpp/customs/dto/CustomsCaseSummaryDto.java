package com.dpp.customs.dto;

/** GET /customs/queue, GET /customs/queue/log 목록 한 줄. */
public record CustomsCaseSummaryDto(
        Long clearanceId,
        Long dppId,
        String publicUuid,
        String modelName,
        String exporterOrgName,
        String importerName,
        String importerAddress,
        String importerEori,
        String hsCode,
        String clearanceSide,
        String exportCountryCode,
        String importCountryCode,
        String decision,
        String statusLabel,
        String createdAtIso,
        String decidedAtIso
) {
}
