package com.dpp.mypage.controller;

import com.dpp.mypage.dto.OrgApprovalItemResponse;
import com.dpp.mypage.dto.OrgRejectRequest;
import com.dpp.mypage.service.AdminOrgApprovalService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * REQ-RBAC: 관리자 가입승인 화면(FE approvalVals.js, /admin/approvals 탭) 전용 API.
 * ADMIN 계정 여부는 AdminOrgApprovalService.requireAdmin이 매 호출마다 확인한다 -
 * JwtAuthenticationFilter가 토큰에 권한(authorities)을 안 실어주기 때문에(2026-08-16
 * 기준 이 프로젝트 전체에 Spring Security 롤 기반 인가가 아직 없음), DocumentController
 * 등 기존 컨트롤러와 동일하게 서비스 계층에서 수동으로 계정 조회 후 검사한다.
 */
@RestController
public class AdminOrganizationController {

    private final AdminOrgApprovalService adminOrgApprovalService;

    public AdminOrganizationController(AdminOrgApprovalService adminOrgApprovalService) {
        this.adminOrgApprovalService = adminOrgApprovalService;
    }

    @GetMapping("/admin/organizations")
    public ResponseEntity<List<OrgApprovalItemResponse>> list(Authentication authentication) {
        Long adminUserId = parseUserId(authentication);
        return ResponseEntity.ok(adminOrgApprovalService.list(adminUserId));
    }

    @PostMapping("/admin/organizations/{orgId}/approve")
    public ResponseEntity<OrgApprovalItemResponse> approve(@PathVariable Long orgId, Authentication authentication) {
        Long adminUserId = parseUserId(authentication);
        return ResponseEntity.ok(adminOrgApprovalService.approve(adminUserId, orgId));
    }

    @PostMapping("/admin/organizations/{orgId}/reject")
    public ResponseEntity<OrgApprovalItemResponse> reject(@PathVariable Long orgId,
                                                            @RequestBody(required = false) OrgRejectRequest request,
                                                            Authentication authentication) {
        Long adminUserId = parseUserId(authentication);
        String reason = request == null ? null : request.reason();
        return ResponseEntity.ok(adminOrgApprovalService.reject(adminUserId, orgId, reason));
    }

    private Long parseUserId(Authentication authentication) {
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException | NullPointerException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 정보입니다.");
        }
    }
}
