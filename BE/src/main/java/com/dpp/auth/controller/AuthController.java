package com.dpp.auth.controller;

import com.dpp.auth.dto.LoginRequest;
import com.dpp.auth.dto.LoginResponse;
import com.dpp.auth.dto.RefreshTokenRequest;
import com.dpp.auth.dto.TokenResponse;
import com.dpp.auth.dto.UnlockRequest;
import com.dpp.auth.service.AccountUnlockService;
import com.dpp.auth.service.PasswordAuthService;
import com.dpp.auth.service.TokenRefreshService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 이메일 + 비밀번호 로그인 (BUSINESS/ADMIN 계정 전용).
 * 개인(PERSONAL) 회원 로그인은 SnsAuthController(/auth/sns/*)를 사용한다.
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final PasswordAuthService passwordAuthService;
    private final TokenRefreshService tokenRefreshService;
    private final AccountUnlockService accountUnlockService;

    public AuthController(PasswordAuthService passwordAuthService, TokenRefreshService tokenRefreshService,
                          AccountUnlockService accountUnlockService) {
        this.passwordAuthService = passwordAuthService;
        this.tokenRefreshService = tokenRefreshService;
        this.accountUnlockService = accountUnlockService;
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

    /**
     * 잠긴 계정 해제 1단계 - 가입 이메일로 6자리 코드 발송(2026-10-08). 메일이 꺼진
     * 환경이면 devCode 를 같이 내려준다(회원가입 인증과 같은 규약).
     */
    @PostMapping("/unlock/code")
    public ResponseEntity<Map<String, String>> requestUnlockCode(@Valid @RequestBody UnlockRequest request) {
        String devCode = accountUnlockService.requestCode(request.email());
        return ResponseEntity.ok(devCode == null ? Map.of() : Map.of("devCode", devCode));
    }

    /** 잠긴 계정 해제 2단계 - 코드 확인 후 잠금 해제. */
    @PostMapping("/unlock/verify")
    public ResponseEntity<Void> unlock(@Valid @RequestBody UnlockRequest request) {
        accountUnlockService.unlock(request.email(), request.code());
        return ResponseEntity.noContent().build();
    }
}
