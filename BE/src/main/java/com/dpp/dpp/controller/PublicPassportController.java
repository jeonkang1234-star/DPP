package com.dpp.dpp.controller;

import com.dpp.dpp.dto.PublicPassportResponse;
import com.dpp.dpp.service.PublicPassportService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * QR/링크로 로그인 없이 DPP를 조회하는 공개 엔드포인트(2026-08-18). SecurityConfig에서
 * /public/** 를 permitAll로 열어뒀고, nginx.conf에도 /public/ location을 추가해야 한다
 * (다른 컨트롤러와 같은 패턴 - "백엔드에 새 API 경로가 추가되면 nginx.conf에 location
 * 블록을 추가" 참고).
 */
@RestController
public class PublicPassportController {

    private final PublicPassportService publicPassportService;

    public PublicPassportController(PublicPassportService publicPassportService) {
        this.publicPassportService = publicPassportService;
    }

    /**
     * 로그인 없이도 조회되지만, 토큰이 실려 있으면 그 자격만큼 더 보여준다
     * (2026-08-21 강 요청 - 개인/세관/EU가 같은 QR에서 서로 다른 결과를 봐야 함).
     *
     * /public/**는 permitAll이지만 JwtAuthenticationFilter는 경로와 무관하게 돌기 때문에,
     * 유효한 Bearer 토큰이 오면 SecurityContext가 채워져 여기로 주입된다. 토큰이 없으면
     * 익명 토큰이 들어오므로 아래에서 걸러낸다 - 여기서 401을 내면 안 된다(공개 API다).
     */
    @GetMapping("/public/dpp/{publicUuid}")
    public ResponseEntity<PublicPassportResponse> getPassport(@PathVariable UUID publicUuid,
                                                               Authentication authentication) {
        return ResponseEntity.ok(publicPassportService.getByPublicUuid(publicUuid, viewerUserId(authentication)));
    }

    /** 인증 정보가 없거나 익명이거나 형식이 이상하면 null - 그냥 공개 뷰로 내려간다. */
    private Long viewerUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        String name = authentication.getName();
        if (name == null || "anonymousUser".equals(name)) {
            return null;
        }
        try {
            return Long.valueOf(name);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
