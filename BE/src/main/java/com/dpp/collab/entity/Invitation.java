package com.dpp.collab.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * invitation 테이블 매핑 - "협력사 초대" 화면(FE makerVals.js의 하드코딩된 invites 6건)의
 * 실 저장소. invitee_org_name/REJECTED 상태값은 V10__invitation_org_name_rejected.sql로
 * 이 화면 전용으로 추가했다(원래 이 테이블은 회사명 컬럼도, "거절" 상태도 없었음 -
 * V1__schema.sql 주석 참고: REVOKED는 "초대한 쪽이 취소"라 "초대받은 쪽이 거절"과 다른 뜻).
 */
@Entity
@Table(name = "invitation")
@Getter
@Setter
public class Invitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "invitation_id")
    private Long invitationId;

    @Column(name = "inviter_org_id", nullable = false)
    private Long inviterOrgId;

    @Column(name = "invitee_email", nullable = false, length = 200)
    private String inviteeEmail;

    @Column(name = "invitee_org_name", length = 200)
    private String inviteeOrgName;

    // V11__invitation_dpp_link.sql - 어떤 DPP에 대한 초대인지. 과거(DPP 미지정) 행과의
    // 호환을 위해 nullable - 새로 보내는 초대는 항상 채운다(InvitationService 참고).
    @Column(name = "dpp_id")
    private Long dppId;

    @Column(name = "role_code", nullable = false, length = 30)
    private String roleCode;

    @Column(name = "token", nullable = false, length = 100)
    private String token;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "SENT";

    @Column(name = "accepted_org_id")
    private Long acceptedOrgId;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "accepted_at")
    private OffsetDateTime acceptedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "created_by")
    private Long createdBy;
}
