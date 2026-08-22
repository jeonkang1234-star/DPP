package com.dpp.audit.service;

import com.dpp.audit.repository.AuditLogRepository;
import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * audit_log에 실제로 쓰는 부분만 떼어낸 빈.
 *
 * AuditLogService.record()에 @Transactional(REQUIRES_NEW)를 직접 달았을 때, 그 안의
 * try/catch로는 막지 못하는 구멍이 있었다: 커밋은 메서드 본문이 끝난 뒤 프록시가 하므로
 * try 블록 밖에서 일어난다. INSERT가 제약 위반으로 실패하면 하이버네이트가 그 트랜잭션을
 * rollback-only로 표시하고, catch로 예외를 삼켜도 프록시가 커밋하려는 순간
 * UnexpectedRollbackException이 튀어나와 호출자(업무 트랜잭션)까지 같이 죽었다
 * (2026-08-22: audit_log_action_check 위반으로 문서 업로드가 전부 실패 - 감사 로그가
 * 업무 처리를 막으면 안 된다는 원칙이 정작 지켜지지 않고 있었다).
 *
 * 그래서 "트랜잭션 경계를 가진 쓰기"를 별도 빈으로 분리하고, 호출하는 쪽(AuditLogService.
 * record)은 트랜잭션 없이 try/catch로 감싼다. 그러면 커밋 시점 예외까지 호출자가 잡는다.
 */
@Component
public class AuditLogWriter {

    private final AuditLogRepository auditLogRepository;
    private final UserAccountRepository userAccountRepository;
    private final ObjectMapper objectMapper;

    public AuditLogWriter(AuditLogRepository auditLogRepository,
                           UserAccountRepository userAccountRepository,
                           ObjectMapper objectMapper) {
        this.auditLogRepository = auditLogRepository;
        this.userAccountRepository = userAccountRepository;
        this.objectMapper = objectMapper;
    }

    /** 호출자 트랜잭션과 완전히 분리된 새 트랜잭션에서 한 건 기록한다. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void write(Long actorUserId, String action, String targetType, Long targetId,
                       String targetLabel, String result, String txId) throws Exception {
        Long actorOrgId = actorUserId == null ? null
                : userAccountRepository.findById(actorUserId).map(UserAccount::getOrgId).orElse(null);
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("targetLabel", targetLabel);
        after.put("result", result);
        if (txId != null) {
            after.put("txId", txId);
        }
        String afterValueJson = objectMapper.writeValueAsString(after);
        auditLogRepository.insert(actorUserId, actorOrgId, action, targetType, targetId, afterValueJson);
    }
}
