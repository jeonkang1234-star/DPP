package com.dpp.audit.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

/**
 * audit_log 테이블 매핑(V1__schema.sql, created_at 기준 월 파티션 - append-only, 조회
 * (READ)는 기록하지 않는다는 게 테이블 코멘트에 명시돼 있음). 지금까지 이 테이블엔 자바
 * 코드가 전혀 없었다 - EU 감사 로그 화면(euVals.js scAudit)이 하드코딩 배열 8건을
 * 그대로 보여주고 있었다(2026-08-19 강 요청 "얘도 지금 감사로그 싹 다 목데이터인데
 * 실데이터로 바꿔").
 *
 * 실제 INSERT/조회는 전부 AuditLogRepository의 native query로 처리한다(이 세션
 * 전체에서 써 온 관례 - AdminStatsRepository/CustomsCaseReadRepository 등) - log_id가
 * 파티션 부모 테이블의 identity 시퀀스라 전체적으로 유일하므로, 읽기 전용 엔티티로는
 * log_id 하나만 @Id로 둬도 충분하다(실제 복합 PK는 (log_id, created_at)이지만, 이
 * 엔티티로 persist()를 호출하는 곳이 없어서 문제되지 않는다).
 */
@Entity
@Table(name = "audit_log")
public class AuditLog {

    @Id
    @Column(name = "log_id")
    private Long logId;

    @Column(name = "actor_user_id")
    private Long actorUserId;

    @Column(name = "actor_org_id")
    private Long actorOrgId;

    @Column(name = "action", length = 20)
    private String action;

    @Column(name = "target_type", length = 40)
    private String targetType;

    @Column(name = "target_id")
    private Long targetId;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    public Long getLogId() {
        return logId;
    }

    public void setLogId(Long logId) {
        this.logId = logId;
    }

    public Long getActorUserId() {
        return actorUserId;
    }

    public void setActorUserId(Long actorUserId) {
        this.actorUserId = actorUserId;
    }

    public Long getActorOrgId() {
        return actorOrgId;
    }

    public void setActorOrgId(Long actorOrgId) {
        this.actorOrgId = actorOrgId;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getTargetType() {
        return targetType;
    }

    public void setTargetType(String targetType) {
        this.targetType = targetType;
    }

    public Long getTargetId() {
        return targetId;
    }

    public void setTargetId(Long targetId) {
        this.targetId = targetId;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
