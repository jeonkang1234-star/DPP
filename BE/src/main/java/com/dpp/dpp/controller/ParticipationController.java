package com.dpp.dpp.controller;

import com.dpp.dpp.dto.ParticipationDto;
import com.dpp.dpp.service.ParticipationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** 파트너(협력사) 계정이 자기가 참여 요청받은 DPP 목록을 보는 화면. */
@RestController
public class ParticipationController {

    private final ParticipationService participationService;

    public ParticipationController(ParticipationService participationService) {
        this.participationService = participationService;
    }

    @GetMapping("/me/participations")
    public ResponseEntity<List<ParticipationDto>> list(Authentication authentication) {
        return ResponseEntity.ok(participationService.list(parseUserId(authentication)));
    }

    private Long parseUserId(Authentication authentication) {
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 정보입니다.");
        }
    }
}
