package com.dpp.mypage.controller;

import com.dpp.mypage.dto.AdminDashboardResponse;
import com.dpp.mypage.dto.AdminMemberDto;
import com.dpp.mypage.service.AdminDashboardService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * 관리자 대시보드(FE AppView.jsx 관리자 화면 상단 KPI + 회원 관리 표 - 예전엔
 * "1,284"/"48,392"/"#8,412,930"/"99.98%" 같은 문자열과 data.json members 배열이
 * 그대로 하드코딩돼 있었다, 2026-08-19 강 요청 "현재 전부 다 목데이터인데 전부
 * 실데이터로 변경") 전용 API. ADMIN 계정 여부는 AdminDashboardService.requireAdmin이
 * 매 호출마다 확인한다 - AdminOrganizationController와 동일한 관례.
 */
@RestController
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    public AdminDashboardController(AdminDashboardService adminDashboardService) {
        this.adminDashboardService = adminDashboardService;
    }

    @GetMapping("/admin/dashboard")
    public ResponseEntity<AdminDashboardResponse> dashboard(Authentication authentication) {
        Long adminUserId = parseUserId(authentication);
        return ResponseEntity.ok(adminDashboardService.getDashboard(adminUserId));
    }

    @GetMapping("/admin/members")
    public ResponseEntity<List<AdminMemberDto>> members(Authentication authentication) {
        Long adminUserId = parseUserId(authentication);
        return ResponseEntity.ok(adminDashboardService.listMembers(adminUserId));
    }

    private Long parseUserId(Authentication authentication) {
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException | NullPointerException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 정보입니다.");
        }
    }
}
