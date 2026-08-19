package com.dpp.audit.controller;

import com.dpp.audit.dto.AuditLogEntryDto;
import com.dpp.audit.service.AuditLogService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * EU 시장감시 감사 로그 조회(FE euVals.js scAudit 화면) - ADMIN이거나 org_type이
 * EU_AUTHORITY인 계정만 200(그 외는 403, AuditLogService.requireAuditViewer).
 */
@RestController
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping("/audit-log")
    public ResponseEntity<List<AuditLogEntryDto>> list(Authentication authentication) {
        Long userId = parseUserId(authentication);
        return ResponseEntity.ok(auditLogService.list(userId));
    }

    private Long parseUserId(Authentication authentication) {
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException | NullPointerException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 정보입니다.");
        }
    }
}
