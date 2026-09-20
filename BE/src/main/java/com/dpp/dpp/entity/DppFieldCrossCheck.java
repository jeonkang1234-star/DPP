package com.dpp.dpp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

/**
 * dpp_field_cross_check (V36) - 문서에서 파싱한 값과 사람이 직접 입력한 값의 비교 결과.
 *
 * 왜 필요한가: 예전 DocumentSlotService.fillIfEmpty 는 "이미 값이 있으면 건너뛴다"였다.
 * 그래서 사람이 친 값과 문서 값이 달라도 아무 기록이 안 남았고, 그 DPP 는 "문서도 있고
 * 값도 있으니 완성"으로 보였다. 교차검증은 두 값이 같은지를 확인하는 절차이지,
 * 둘 중 하나를 조용히 버리는 절차가 아니다(2026-09-19 강 요청 3번).
 *
 * status:
 *   MATCH    - 두 값이 같다(정규화 후 비교)
 *   MISMATCH - 다르다. 이 행이 남아 있으면 발급이 막힌다
 *   RESOLVED - 사람이 한쪽을 선택해서 정리했다(resolution 참고)
 */
@Entity
@Table(name = "dpp_field_cross_check")
public class DppFieldCrossCheck {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "check_id")
    private Long checkId;

    @Column(name = "dpp_id", nullable = false)
    private Long dppId;

    @Column(name = "field_code", nullable = false, length = 60)
    private String fieldCode;

    @Column(name = "document_id")
    private Long documentId;

    @Column(name = "entered_value", length = 500)
    private String enteredValue;

    @Column(name = "parsed_value", length = 500)
    private String parsedValue;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "resolution", length = 20)
    private String resolution;

    @Column(name = "resolved_by")
    private Long resolvedBy;

    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;

    public Long getCheckId() { return checkId; }
    public void setCheckId(Long checkId) { this.checkId = checkId; }

    public Long getDppId() { return dppId; }
    public void setDppId(Long dppId) { this.dppId = dppId; }

    public String getFieldCode() { return fieldCode; }
    public void setFieldCode(String fieldCode) { this.fieldCode = fieldCode; }

    public Long getDocumentId() { return documentId; }
    public void setDocumentId(Long documentId) { this.documentId = documentId; }

    public String getEnteredValue() { return enteredValue; }
    public void setEnteredValue(String enteredValue) { this.enteredValue = enteredValue; }

    public String getParsedValue() { return parsedValue; }
    public void setParsedValue(String parsedValue) { this.parsedValue = parsedValue; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getResolution() { return resolution; }
    public void setResolution(String resolution) { this.resolution = resolution; }

    public Long getResolvedBy() { return resolvedBy; }
    public void setResolvedBy(Long resolvedBy) { this.resolvedBy = resolvedBy; }

    public OffsetDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(OffsetDateTime resolvedAt) { this.resolvedAt = resolvedAt; }

    public OffsetDateTime getCreatedAt() { return createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
