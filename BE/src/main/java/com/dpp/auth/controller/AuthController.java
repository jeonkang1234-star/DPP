package com.dpp.auth.controller;

import com.dpp.auth.dto.LoginRequest;
import com.dpp.auth.dto.LoginResponse;
import com.dpp.auth.service.PasswordAuthService;
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

    public AuthController(PasswordAuthService passwordAuthService) {
        this.passwordAuthService = passwordAuthService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(passwordAuthService.login(request.email(), request.password()));
    }
}
