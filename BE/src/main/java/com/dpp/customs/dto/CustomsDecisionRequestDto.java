package com.dpp.customs.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** POST /customs/queue/{clearanceId}/decision 입력. */
public record CustomsDecisionRequestDto(
        @NotBlank @Pattern(regexp = "APPROVE|HOLD|REJECT", message = "decision은 APPROVE/HOLD/REJECT 중 하나여야 합니다.")
        String decision,
        String reason
) {
}
