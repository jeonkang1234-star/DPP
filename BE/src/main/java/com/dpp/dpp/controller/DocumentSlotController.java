package com.dpp.dpp.controller;

import com.dpp.dpp.dto.DocumentFormResponse;
import com.dpp.dpp.service.DocumentSlotService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * 필수 문서 업로드 화면 - /me 하위(본인 조직 리소스)라 기존 nginx `/me/` location 블록이
 * 그대로 커버한다. Mill Sheet(제강성적서)는 파서+ZKP까지 거치는 별도 엔드포인트
 * (POST /document/upload/steel-mill, com.dpp.document.controller.DocumentController)를
 * 계속 쓴다 - 여기 upload는 ZKP 회로가 없는 나머지 문서 유형 전용.
 */
@RestController
public class DocumentSlotController {

    private final DocumentSlotService documentSlotService;

    public DocumentSlotController(DocumentSlotService documentSlotService) {
        this.documentSlotService = documentSlotService;
    }

    @GetMapping("/me/documents")
    public ResponseEntity<DocumentFormResponse> getForm(Authentication authentication,
                                                          @RequestParam(required = false) Long dppId) {
        return ResponseEntity.ok(documentSlotService.getForm(parseUserId(authentication), dppId));
    }

    @PostMapping(value = "/me/documents/upload", consumes = "multipart/form-data")
    public ResponseEntity<DocumentFormResponse> upload(Authentication authentication,
                                                         @RequestParam Long dppId,
                                                         @RequestParam String docTypeCode,
                                                         @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(documentSlotService.upload(parseUserId(authentication), dppId, docTypeCode, file));
    }

    private Long parseUserId(Authentication authentication) {
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 정보입니다.");
        }
    }
}
