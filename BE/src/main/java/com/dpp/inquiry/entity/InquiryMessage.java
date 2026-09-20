package com.dpp.inquiry.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

/** inquiry_message 테이블 매핑(V34__inquiry.sql) - 스레드 안의 메시지 한 건. 수정/삭제
 * 없이 계속 append만 되는 채팅 로그라 updated_at은 두지 않는다. */
@Entity
@Table(name = "inquiry_message")
@Getter
@Setter
public class InquiryMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "message_id")
    private Long messageId;

    @Column(name = "inquiry_id", nullable = false)
    private Long inquiryId;

    @Enumerated(EnumType.STRING)
    @Column(name = "sender_type", nullable = false, length = 10)
    private InquirySenderType senderType;

    @Column(name = "sender_user_id")
    private Long senderUserId;

    @Column(name = "body", nullable = false, length = 2000)
    private String body;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();
}
