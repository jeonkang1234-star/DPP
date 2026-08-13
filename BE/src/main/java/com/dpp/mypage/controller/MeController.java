package com.dpp.mypage.controller;

import com.dpp.mypage.dto.MeResponse;
import com.dpp.mypage.service.MeService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * REQ-MYPAGE: 로그인한 사용자 본인 정보. SecurityConfig가 /auth/** 외 전 경로에
 * 인증을 요구하므로, 여기 도달했다면 Authentication은 항상 채워져 있다.
 */
@RestController
public class MeController {

    private final MeService meService;

    public MeController(MeService meService) {
        this.meService = meService;
    }

    @GetMapping("/me")
    public ResponseEntity<MeResponse> me(Authentication authentication) {
        Long userId = parseUserId(authentication);
        return ResponseEntity.ok(meService.getMe(userId));
    }

    private Long parseUserId(Authentication authentication) {
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 정보입니다.");
        }
    }
}
