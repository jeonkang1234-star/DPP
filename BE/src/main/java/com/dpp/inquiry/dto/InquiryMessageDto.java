package com.dpp.inquiry.dto;

import com.dpp.inquiry.entity.InquiryMessage;

import java.time.OffsetDateTime;

/** GET .../inquiries/{id}/messages 응답 한 행. */
public record InquiryMessageDto(
        Long messageId,
        String senderType,
        String body,
        OffsetDateTime createdAt
) {
    public static InquiryMessageDto from(InquiryMessage m) {
        return new InquiryMessageDto(m.getMessageId(), m.getSenderType().name(), m.getBody(), m.getCreatedAt());
    }
}
