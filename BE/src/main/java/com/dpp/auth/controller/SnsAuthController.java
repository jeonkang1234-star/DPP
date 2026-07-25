package com.dpp.auth.controller;

import com.dpp.auth.dto.TokenResponse;
import com.dpp.auth.entity.SnsProvider;
import com.dpp.auth.service.SnsAuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;

@RestController
@RequestMapping("/auth/sns")
public class SnsAuthController {

    private final SnsAuthService snsAuthService;

    public SnsAuthController(SnsAuthService snsAuthService) {
        this.snsAuthService = snsAuthService;
    }

    /** 카카오/구글/네이버 인증 페이지로 리다이렉트. state는 서비스가 발급해서 oauth_state에 저장한다. */
    @GetMapping("/{provider}/login")
    public ResponseEntity<Void> login(@PathVariable String provider) {
        String url = snsAuthService.buildAuthorizeUrl(parseProvider(provider));
        return ResponseEntity.status(302).location(URI.create(url)).build();
    }

    /** SNS 제공자가 인증 후 돌아오는 콜백. state를 oauth_state와 대조해 검증한 뒤 토큰을 발급한다. */
    @GetMapping("/{provider}/callback")
    public ResponseEntity<TokenResponse> callback(@PathVariable String provider,
                                                  @RequestParam String code,
                                                  @RequestParam String state) {
        TokenResponse token = snsAuthService.loginOrSignup(parseProvider(provider), code, state);
        return ResponseEntity.ok(token);
    }

    /** URL은 소문자(kakao/google/naver)로 받고, enum은 대문자라 여기서 변환한다. */
    private SnsProvider parseProvider(String provider) {
        try {
            return SnsProvider.valueOf(provider.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "지원하지 않는 SNS 제공자입니다: " + provider);
        }
    }
}