package com.dpp.mypage.controller;

import com.dpp.mypage.dto.OrgApprovalDetailResponse;
import com.dpp.mypage.dto.OrgApprovalItemResponse;
import com.dpp.mypage.dto.OrgRejectRequest;
import com.dpp.mypage.service.AdminOrgApprovalService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
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

    /** 「상세 정보」 - 가입 화면에서 받은 값 전부 + 소속 계정 + 자동검증 판정(2026-08-22 강 요청). */
    @GetMapping("/admin/organizations/{orgId}")
    public ResponseEntity<OrgApprovalDetailResponse> detail(@PathVariable Long orgId, Authentication authentication) {
        Long adminUserId = parseUserId(authentication);
        return ResponseEntity.ok(adminOrgApprovalService.detail(adminUserId, orgId));
    }

    /**
     * 가입 시 제출한 사업자등록증/증빙서류 원본. Content-Disposition을 inline으로 내려서
     * PDF·이미지는 관리자 화면에 그대로 띄울 수 있고(FE가 blob URL로 <iframe>/<img>에 물림),
     * 그 외 형식은 같은 응답을 내려받기로 쓴다. 파일명은 한글이 섞이므로 RFC 5987
     * (filename*=UTF-8'') 형식으로 인코딩된다 - ContentDisposition 빌더가 처리한다.
     */
    @GetMapping("/admin/organizations/{orgId}/biz-cert")
    public ResponseEntity<byte[]> bizCert(@PathVariable Long orgId, Authentication authentication) {
        Long adminUserId = parseUserId(authentication);
        AdminOrgApprovalService.StoredFile file = adminOrgApprovalService.loadBizRegCert(adminUserId, orgId);
        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(file.contentType());
        } catch (org.springframework.http.InvalidMediaTypeException e) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename(file.fileName(), StandardCharsets.UTF_8).toString())
                .body(file.content());
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
