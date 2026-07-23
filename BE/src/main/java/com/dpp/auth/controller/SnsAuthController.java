package com.dpp.auth.controller;

import com.dpp.auth.dto.TokenResponse;
import com.dpp.auth.entity.SnsProvider;
import com.dpp.auth.service.SnsAuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/auth/sns")
public class SnsAuthController {

    private final SnsAuthService snsAuthService;

    public SnsAuthController(SnsAuthService snsAuthService) {
        this.snsAuthService = snsAuthService;
    }

    /** 카카오/구글/네이버 인증 페이지로 리다이렉트. 개인 회원 전용 가입/로그인 경로. */
    @GetMapping("/{provider}/login")
    public ResponseEntity<Void> login(@PathVariable SnsProvider provider) {
        String state = UUID.randomUUID().toString();
        String url = snsAuthService.buildAuthorizeUrl(provider, state);
        return ResponseEntity.status(302).location(URI.create(url)).build();
    }

    /** SNS 제공자가 인증 후 돌아오는 콜백. 여기서 최종적으로 JWT를 발급한다. */
    @GetMapping("/{provider}/callback")
    public ResponseEntity<TokenResponse> callback(@PathVariable SnsProvider provider,
                                                   @RequestParam String code) {
        TokenResponse token = snsAuthService.loginOrSignup(provider, code);
        return ResponseEntity.ok(token);
    }
}
