package com.dpp.auth.controller;

import com.dpp.auth.dto.LoginRequest;
import com.dpp.auth.dto.LoginResponse;
import com.dpp.auth.dto.RefreshTokenRequest;
import com.dpp.auth.dto.TokenResponse;
import com.dpp.auth.service.PasswordAuthService;
import com.dpp.auth.service.TokenRefreshService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 이메일 + 비밀번호 로그인 (BUSINESS/ADMIN 계정 전용).
 * 개인(PERSONAL) 회원 로그인은 SnsAuthController(/auth/sns/*)를 사용한다.
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final PasswordAuthService passwordAuthService;
    private final TokenRefreshService tokenRefreshService;

    public AuthController(PasswordAuthService passwordAuthService, TokenRefreshService tokenRefreshService) {
        this.passwordAuthService = passwordAuthService;
        this.tokenRefreshService = tokenRefreshService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(passwordAuthService.login(request.email(), request.password()));
    }

    /**
     * 세션 연장 - refresh 토큰으로 새 액세스 토큰(+새 refresh 토큰)을 받는다. 기업·개인
     * 계정 공통(2026-10-08). /auth/** 는 SecurityConfig 에서 인증 없이 열려 있다.
     */
    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(tokenRefreshService.refresh(request.refreshToken()));
    }
}
