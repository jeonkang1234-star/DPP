package com.dpp.dpp.controller;

import com.dpp.dpp.dto.DashboardResponse;
import com.dpp.dpp.service.DashboardService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * 로그인한 사용자 소속 조직의 DPP 현황 대시보드. GET /me와 같은 "본인 리소스" 성격이라
 * /me 하위(prefix)에 둔다 - nginx의 기존 `/me/` location 블록이 그대로 커버한다.
 */
@RestController
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/me/dashboard")
    public ResponseEntity<DashboardResponse> getDashboard(Authentication authentication) {
        Long userId = parseUserId(authentication);
        return ResponseEntity.ok(dashboardService.getDashboard(userId));
    }

    private Long parseUserId(Authentication authentication) {
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 정보입니다.");
        }
    }
}
