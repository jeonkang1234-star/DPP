package com.dpp.dpp.controller;

import com.dpp.dpp.dto.ParticipationDto;
import com.dpp.dpp.service.ParticipationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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

    /**
     * 참여 요청 수락(2026-08-23). 수락한 순간부터 이 협력사 담당 데이터 항목·문서는
     * 제조사가 아니라 이 협력사만 제출할 수 있다. 갱신된 참여 목록을 그대로 돌려줘서
     * FE가 다시 조회하지 않아도 되게 한다.
     */
    @PostMapping("/me/participations/{dppId}/accept")
    public ResponseEntity<List<ParticipationDto>> accept(@PathVariable Long dppId, Authentication authentication) {
        return ResponseEntity.ok(participationService.accept(parseUserId(authentication), dppId));
    }

    private Long parseUserId(Authentication authentication) {
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 정보입니다.");
        }
    }
}
