package com.dpp.mypage.controller;

import com.dpp.mypage.dto.OrganizationResponse;
import com.dpp.mypage.dto.OrganizationUpdateRequest;
import com.dpp.mypage.service.OrganizationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * 로그인한 사용자 본인 소속 조직의 프로필. GET /me와 같은 "본인 리소스" 성격이라
 * /me 하위(prefix)에 둔다 - nginx의 기존 `/me/` location 블록이 그대로 커버한다.
 */
@RestController
public class OrganizationController {

    private final OrganizationService organizationService;

    public OrganizationController(OrganizationService organizationService) {
        this.organizationService = organizationService;
    }

    @GetMapping("/me/organization")
    public ResponseEntity<OrganizationResponse> getMyOrganization(Authentication authentication) {
        Long userId = parseUserId(authentication);
        return ResponseEntity.ok(organizationService.getMyOrganization(userId));
    }

    @PutMapping("/me/organization")
    public ResponseEntity<OrganizationResponse> updateMyOrganization(
            Authentication authentication, @Valid @RequestBody OrganizationUpdateRequest request) {
        Long userId = parseUserId(authentication);
        return ResponseEntity.ok(organizationService.updateMyOrganization(userId, request));
    }

    private Long parseUserId(Authentication authentication) {
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 정보입니다.");
        }
    }
}
