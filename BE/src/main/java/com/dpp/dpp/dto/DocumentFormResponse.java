package com.dpp.dpp.dto;

import java.util.List;

public record DocumentFormResponse(
        Long dppId,
        List<DocumentSlotDto> documents
) {
}
