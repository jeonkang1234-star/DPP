package com.dpp.dpp.controller;

import com.dpp.dpp.dto.PublicPassportResponse;
import com.dpp.dpp.service.PublicPassportService;
import org.springframework.http.ResponseEntity;
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

    @GetMapping("/public/dpp/{publicUuid}")
    public ResponseEntity<PublicPassportResponse> getPassport(@PathVariable UUID publicUuid) {
        return ResponseEntity.ok(publicPassportService.getByPublicUuid(publicUuid));
    }
}
