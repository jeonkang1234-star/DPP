package com.dpp.inquiry.controller;

import com.dpp.inquiry.dto.InquiryDto;
import com.dpp.inquiry.dto.InquiryMessageDto;
import com.dpp.inquiry.dto.SendMessageRequest;
import com.dpp.inquiry.service.InquiryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * REQ-INQUIRY: 관리자 문의함 - 제조사 위젯이 보낸 문의를 카테고리별로 확인하고 답장한다
 * (2026-09-17 강 요청 "관리자 역시 유형별 문의에 대해서 확인할 수 있도록"). ADMIN 계정
 * 여부는 AdminDashboardController와 동일한 관례대로 InquiryService.requireAdmin이 매
 * 호출마다 확인한다.
 */
@RestController
@RequestMapping("/admin/inquiries")
public class AdminInquiryController {

    private final InquiryService inquiryService;

    public AdminInquiryController(InquiryService inquiryService) {
        this.inquiryService = inquiryService;
    }

    @GetMapping
    public ResponseEntity<List<InquiryDto>> list(Authentication authentication) {
        return ResponseEntity.ok(inquiryService.listForAdmin(parseUserId(authentication)));
    }

    @GetMapping("/{inquiryId}/messages")
    public ResponseEntity<List<InquiryMessageDto>> messages(Authentication authentication, @PathVariable Long inquiryId) {
        return ResponseEntity.ok(inquiryService.listMessagesForAdmin(parseUserId(authentication), inquiryId));
    }

    @PostMapping("/{inquiryId}/messages")
    public ResponseEntity<InquiryMessageDto> reply(Authentication authentication, @PathVariable Long inquiryId,
                                                     @RequestBody SendMessageRequest req) {
        return ResponseEntity.ok(inquiryService.replyAsAdmin(parseUserId(authentication), inquiryId, req.message()));
    }

    private Long parseUserId(Authentication authentication) {
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException | NullPointerException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 정보입니다.");
        }
    }
}
