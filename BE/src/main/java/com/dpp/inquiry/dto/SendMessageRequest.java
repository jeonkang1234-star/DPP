package com.dpp.inquiry.dto;

/** POST .../inquiries/{id}/messages 요청 본문. */
public record SendMessageRequest(String message) {
}
