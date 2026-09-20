package com.dpp.inquiry.dto;

import com.dpp.inquiry.entity.Inquiry;

import java.time.OffsetDateTime;

/**
 * 문의 목록(제조사 위젯 / 관리자 문의함) 한 행. orgName은 관리자 화면에만 필요하지만
 * 필드 하나 더 둔다고 제조사 쪽 응답이 커지는 것도 아니라서 DTO를 나누지 않고 같이 쓴다
 * (제조사 쪽엔 null로 내려감 - 자기 조직 이름을 자기가 또 볼 필요는 없다).
 */
public record InquiryDto(
        Long inquiryId,
        Long orgId,
        String category,
        String categoryLabel,
        String status,
        String orgName,
        String lastMessagePreview,
        OffsetDateTime lastMessageAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public static InquiryDto from(Inquiry i, String orgName, String lastMessagePreview, OffsetDateTime lastMessageAt) {
        return new InquiryDto(
                i.getInquiryId(),
                i.getOrgId(),
                i.getCategory().name(),
                i.getCategory().label(),
                i.getStatus().name(),
                orgName,
                lastMessagePreview,
                lastMessageAt,
                i.getCreatedAt(),
                i.getUpdatedAt());
    }
}
