package com.dpp.collab.controller;

import com.dpp.collab.dto.InvitationDto;
import com.dpp.collab.dto.SendInviteRequest;
import com.dpp.collab.service.InvitationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** "협력사 초대" 화면 - /me 하위(본인 조직 리소스)라 기존 nginx `/me/` location 블록이 그대로 커버한다. */
@RestController
public class InvitationController {

    private final InvitationService invitationService;

    public InvitationController(InvitationService invitationService) {
        this.invitationService = invitationService;
    }

    @GetMapping("/me/invitations")
    public ResponseEntity<List<InvitationDto>> list(Authentication authentication) {
        return ResponseEntity.ok(invitationService.list(parseUserId(authentication)));
    }

    @PostMapping("/me/invitations")
    public ResponseEntity<InvitationDto> send(Authentication authentication, @RequestBody SendInviteRequest request) {
        return ResponseEntity.ok(invitationService.send(parseUserId(authentication), request));
    }

    @PostMapping("/me/invitations/{invitationId}/resend")
    public ResponseEntity<InvitationDto> resend(Authentication authentication, @PathVariable Long invitationId) {
        return ResponseEntity.ok(invitationService.resend(parseUserId(authentication), invitationId));
    }

    private Long parseUserId(Authentication authentication) {
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 정보입니다.");
        }
    }
}
