package com.dpp.mypage.dto;

/** POST /admin/organizations/{orgId}/reject 요청 본문. reason이 비어 있으면 기본 사유로 채운다. */
public record OrgRejectRequest(String reason) {
}
