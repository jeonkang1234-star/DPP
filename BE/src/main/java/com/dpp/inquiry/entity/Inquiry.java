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

/**
 * inquiry 테이블 매핑(V34__inquiry.sql). 제조사 한 조직이 카테고리별로 여는 문의
 * 스레드 하나. org_id 쪽은 UserAccount/Organization과 동일한 이 코드베이스 관례대로
 * JPA 연관관계 없이 단순 Long 컬럼으로 둔다.
 */
@Entity
@Table(name = "inquiry")
@Getter
@Setter
public class Inquiry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "inquiry_id")
    private Long inquiryId;

    @Column(name = "org_id", nullable = false)
    private Long orgId;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    private InquiryCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private InquiryStatus status = InquiryStatus.OPEN;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();
    // updated_at은 DB 트리거(trg_inquiry_touch → fn_touch_updated_at)가 UPDATE 시
    // 서버에서 덮어쓴다(user_account.updated_at과 동일한 관례) - 새 메시지가 쌓일 때마다
    // 이 스레드를 "touch"해서 목록을 최신순으로 정렬하는 데 쓴다.
}
