package com.dpp.document.controller;

import com.dpp.document.dto.SteelMillUploadResponse;
import com.dpp.document.service.DocumentIngestService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * REQ-DOCUMENT: 제조사(BUSINESS) 회원의 문서 업로드 -> 파싱 -> ZKP 증명 1차 연동.
 * 우선 Q2_05(제강성적서) 한 유형만 지원한다 - 나머지 7개 회로(circuits.mjs)는 같은
 * 패턴(ParserClient -> *ZkpMapper -> ZkpClient)으로 확장하면 된다.
 */
@RestController
public class DocumentController {

    private final DocumentIngestService documentIngestService;

    public DocumentController(DocumentIngestService documentIngestService) {
        this.documentIngestService = documentIngestService;
    }

    @PostMapping(value = "/document/upload/steel-mill", consumes = "multipart/form-data")
    public ResponseEntity<SteelMillUploadResponse> uploadSteelMillSheet(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        Long userId = parseUserId(authentication);
        return ResponseEntity.ok(documentIngestService.ingestSteelMillSheet(userId, file));
    }

    private Long parseUserId(Authentication authentication) {
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 정보입니다.");
        }
    }
}
