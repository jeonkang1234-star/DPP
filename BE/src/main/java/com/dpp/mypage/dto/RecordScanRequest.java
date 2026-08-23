package com.dpp.mypage.dto;

import jakarta.validation.constraints.NotBlank;

/** POST /me/scans 요청 본문 - 열람한 공개 여권의 publicUuid 하나만 받는다. */
public record RecordScanRequest(
        @NotBlank(message = "publicUuid는 필수입니다.")
        String publicUuid
) {
}
