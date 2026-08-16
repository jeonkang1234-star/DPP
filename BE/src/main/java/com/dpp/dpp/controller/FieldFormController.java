package com.dpp.dpp.controller;

import com.dpp.dpp.dto.FieldFormResponse;
import com.dpp.dpp.dto.SaveFieldFormRequest;
import com.dpp.dpp.service.FieldFormService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * "강재 기본 정보" 입력 화면 - /me 하위(본인 조직 리소스)라 기존 nginx `/me/` location
 * 블록이 그대로 커버한다.
 */
@RestController
public class FieldFormController {

    private final FieldFormService fieldFormService;

    public FieldFormController(FieldFormService fieldFormService) {
        this.fieldFormService = fieldFormService;
    }

    @GetMapping("/me/field-form")
    public ResponseEntity<FieldFormResponse> getForm(Authentication authentication,
                                                       @RequestParam(required = false) Long dppId,
                                                       @RequestParam(required = false) String domain) {
        return ResponseEntity.ok(fieldFormService.getForm(parseUserId(authentication), dppId, domain));
    }

    @PostMapping("/me/field-form/draft")
    public ResponseEntity<FieldFormResponse> saveDraft(Authentication authentication,
                                                         @RequestBody SaveFieldFormRequest request) {
        return ResponseEntity.ok(fieldFormService.saveDraft(parseUserId(authentication), request));
    }

    @PostMapping("/me/field-form/{dppId}/issue")
    public ResponseEntity<FieldFormResponse> issue(Authentication authentication, @PathVariable Long dppId) {
        return ResponseEntity.ok(fieldFormService.issue(parseUserId(authentication), dppId));
    }

    private Long parseUserId(Authentication authentication) {
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 정보입니다.");
        }
    }
}
