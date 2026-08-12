package com.dpp.notify.entity;

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
 * notification 테이블 매핑 (V1__schema.sql). 팀원 ERD 설계 당시부터 있던 테이블이지만
 * 지금까지 이걸 읽는 Java 코드가 없었다 - REQ-MYPAGE 알림 화면에서 처음으로 사용.
 * recipient_user_id/org_id/role_code 중 최소 하나는 채워져 있다는 제약이 있지만,
 * 개인 마이페이지의 "내 알림" 목록에서는 recipient_user_id 기준으로만 조회한다
 * (조직/역할 단위 브로드캐스트 알림 처리는 이후 과제).
 */
@Entity
@Table(name = "notification")
@Getter
@Setter
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "notification_id")
    private Long notificationId;

    @Column(name = "recipient_user_id")
    private Long recipientUserId;

    @Column(name = "recipient_org_id")
    private Long recipientOrgId;

    @Column(name = "recipient_role_code", length = 30)
    private String recipientRoleCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 30)
    private NotificationCategory category;

    @Column(name = "sub_type", length = 40)
    private String subType;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "body", length = 1000)
    private String body;

    @Column(name = "link_url", length = 500)
    private String linkUrl;

    @Column(name = "channel", nullable = false, length = 20)
    private String channel = "IN_APP";

    @Column(name = "is_read", nullable = false)
    private boolean read = false;

    @Column(name = "read_at")
    private OffsetDateTime readAt;

    @Column(name = "sent_at")
    private OffsetDateTime sentAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();
}
