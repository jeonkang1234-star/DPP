package com.dpp.audit.service;

import com.dpp.audit.dto.AuditLogEntryDto;
import com.dpp.audit.repository.AuditLogRepository;
import com.dpp.auth.entity.AccountType;
import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.mypage.entity.Organization;
import com.dpp.mypage.repository.OrganizationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;

/**
 * audit_log 기록/조회 - EU 시장감시(EU_AUTHORITY 계정) 감사 로그 화면(FE euVals.js
 * scAudit) 전용이었던 자리가 지금까지 하드코딩 배열 8건이었다(2026-08-19 강 요청
 * "얘도 지금 감사로그 싹 다 목데이터인데 실데이터로 바꿔"). audit_log 테이블 자체는
 * V1__schema.sql부터 있었지만 자바 코드가 전혀 없어서 이번에 처음 연결한다.
 *
 * record()는 DPP 발급/가입 승인·반려/통관 결정/문서 업로드/로그인처럼 실제로 뭔가
 * 바뀌는 지점에서만 호출한다 - audit_log 테이블 코멘트("조회(READ)는 기록하지 않음")를
 * 그대로 지킨다. 블록체인 앵커링은 그 자체가 사용자가 직접 트리거하는 별도 행위가
 * 아니라 DPP 발급·문서 업로드의 시스템 내부 부수효과라서(예: DocumentIngestService가
 * 업로드 처리 중 자동으로 앵커링), 별도 로그 행을 만드는 대신 해당 발급/업로드 로그의
 * txId 필드로 실제 tx_id를 함께 남긴다 - "IEUM · 시스템"이라는 가상의 행위자를
 * 지어내는 것보다 이쪽이 실제 아키텍처(동기 부수효과)에 더 정직하다.
 */
@Service
public class AuditLogService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogService.class);
    private static final Set<String> AUDIT_VIEWER_ORG_TYPES = Set.of("EU_AUTHORITY");

    private final AuditLogRepository auditLogRepository;
    private final UserAccountRepository userAccountRepository;
    private final OrganizationRepository organizationRepository;
    private final AuditLogWriter auditLogWriter;

    public AuditLogService(AuditLogRepository auditLogRepository,
                            UserAccountRepository userAccountRepository,
                            OrganizationRepository organizationRepository,
                            AuditLogWriter auditLogWriter) {
        this.auditLogRepository = auditLogRepository;
        this.userAccountRepository = userAccountRepository;
        this.organizationRepository = organizationRepository;
        this.auditLogWriter = auditLogWriter;
    }

    /**
     * 감사 로그 한 건을 남긴다 - 실패해도(DB 오류 등) 호출자의 업무 트랜잭션을 절대
     * 막지 않는다(FieldFormService.anchorDppSnapshot과 동일한 원칙: 감사 로그는 부가
     * 기록이지 업무 처리의 필요조건이 아니다).
     *
     * 이 메서드에는 @Transactional을 달지 않는다. 예전엔 여기에 REQUIRES_NEW를 달고
     * 본문을 try/catch로 감쌌는데, 커밋은 본문이 끝난 뒤 프록시가 하므로 try 밖에서
     * 일어난다 - INSERT가 제약 위반으로 실패하면 하이버네이트가 트랜잭션을 rollback-only로
     * 표시하고, 예외를 삼켜도 커밋 시점에 UnexpectedRollbackException이 튀어나와 호출자까지
     * 같이 죽었다(2026-08-22: audit_log_action_check 위반으로 문서 업로드가 전부 실패).
     * 트랜잭션 경계는 AuditLogWriter가 갖고, 여기서는 그 호출 전체를 감싸서 커밋 시점
     * 예외까지 잡는다.
     */
    public void record(Long actorUserId, String action, String targetType, Long targetId,
                        String targetLabel, String result, String txId) {
        try {
            auditLogWriter.write(actorUserId, action, targetType, targetId, targetLabel, result, txId);
        } catch (Exception e) {
            log.warn("감사 로그 기록 실패 (업무 처리는 계속 진행): actorUserId={}, action={}, targetType={}, targetId={}, error={}",
                    actorUserId, action, targetType, targetId, e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<AuditLogEntryDto> list(Long requesterUserId) {
        requireAuditViewer(requesterUserId);
        return auditLogRepository.findRecent().stream().map(this::toDto).toList();
    }

    private AuditLogEntryDto toDto(Object[] row) {
        String atIso = toOffsetDateTime(row[0]) == null ? null : toOffsetDateTime(row[0]).toString();
        String action = (String) row[1];
        String targetType = (String) row[2];
        String targetLabel = (String) row[4];
        String resultLabel = (String) row[5];
        String txId = (String) row[6];
        String displayName = (String) row[7];
        String email = (String) row[8];
        String orgName = (String) row[9];
        String actorName = (displayName != null && !displayName.isBlank()) ? displayName
                : (email != null ? email : "탈퇴한 계정");
        String actor = (orgName != null && !orgName.isBlank()) ? (orgName + " · " + actorName) : actorName;
        return new AuditLogEntryDto(atIso, actor, actionLabel(action, targetType),
                targetLabel == null ? "—" : targetLabel, resultLabel == null ? "—" : resultLabel, txId);
    }

    /** action(CREATE/UPDATE/DELETE/APPROVE/REJECT/LOGIN/EXPORT) + target_type 조합을 화면용 한국어 라벨로. */
    private String actionLabel(String action, String targetType) {
        if ("DPP".equals(targetType) && "CREATE".equals(action)) return "DPP 발급";
        if ("DOCUMENT".equals(targetType) && "CREATE".equals(action)) return "문서 업로드";
        if ("ORGANIZATION".equals(targetType) && "APPROVE".equals(action)) return "가입 승인";
        if ("ORGANIZATION".equals(targetType) && "REJECT".equals(action)) return "가입 반려";
        if ("CUSTOMS_CLEARANCE".equals(targetType) && "APPROVE".equals(action)) return "통관 승인";
        if ("CUSTOMS_CLEARANCE".equals(targetType) && "REJECT".equals(action)) return "통관 반려";
        if ("CUSTOMS_CLEARANCE".equals(targetType) && "UPDATE".equals(action)) return "통관 보류";
        // action은 audit_log_action_check가 허용하는 값만 쓸 수 있다
        // (CREATE/UPDATE/DELETE/APPROVE/REJECT/LOGIN/EXPORT) - 증명 행이 새로 생기는
        // 것이므로 CREATE로 기록하고, 화면 문구만 "ZKP 검증"으로 보여준다.
        if ("ZKP_PROOF".equals(targetType) && "CREATE".equals(action)) return "ZKP 검증";
        return action + " · " + targetType;
    }

    private OffsetDateTime toOffsetDateTime(Object raw) {
        if (raw instanceof OffsetDateTime odt) {
            return odt;
        }
        if (raw instanceof java.sql.Timestamp ts) {
            return ts.toInstant().atOffset(ZoneOffset.UTC);
        }
        return null;
    }

    private void requireAuditViewer(Long userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 사용자입니다."));
        if (user.getAccountType() == AccountType.ADMIN) {
            return;
        }
        if (user.getOrgId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "감사 로그는 시장감시기관 계정만 조회할 수 있습니다.");
        }
        Organization org = organizationRepository.findById(user.getOrgId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "감사 로그는 시장감시기관 계정만 조회할 수 있습니다."));
        if (!AUDIT_VIEWER_ORG_TYPES.contains(org.getOrgType())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "감사 로그는 시장감시기관 계정만 조회할 수 있습니다.");
        }
    }
}
