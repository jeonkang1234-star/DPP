package com.dpp.mypage.controller;

import com.dpp.mypage.dto.ScanSummaryDto;
import com.dpp.mypage.service.ScanHistoryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** REQ-MYPAGE(개인): GET /me/scans, DELETE /me/scans/{id}. openapi.yaml Personal 태그 참고. */
@RestController
@RequestMapping("/me/scans")
public class ScanHistoryController {

    private final ScanHistoryService scanHistoryService;

    public ScanHistoryController(ScanHistoryService scanHistoryService) {
        this.scanHistoryService = scanHistoryService;
    }

    @GetMapping
    public ResponseEntity<List<ScanSummaryDto>> list(Authentication authentication) {
        return ResponseEntity.ok(scanHistoryService.getScans(parseUserId(authentication)));
    }

    @DeleteMapping("/{scanId}")
    public ResponseEntity<Void> remove(Authentication authentication, @PathVariable Long scanId) {
        scanHistoryService.removeScan(parseUserId(authentication), scanId);
        return ResponseEntity.noContent().build();
    }

    private Long parseUserId(Authentication authentication) {
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 정보입니다.");
        }
    }
}
