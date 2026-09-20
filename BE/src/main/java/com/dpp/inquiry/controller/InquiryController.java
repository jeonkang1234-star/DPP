package com.dpp.inquiry.controller;

import com.dpp.inquiry.dto.CreateInquiryRequest;
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
 * REQ-INQUIRY: 제조사 "관리자에게 문의" 챗봇 위젯 전용(2026-09-17 강 요청). FE는 카테고리
 * 버튼을 누르는 순간 POST /me/inquiries를 호출하고, 그 뒤로는 몇 초 간격으로
 * GET .../messages를 다시 불러(폴링) 관리자 답장을 반영한다.
 */
@RestController
@RequestMapping("/me/inquiries")
public class InquiryController {

    private final InquiryService inquiryService;

    public InquiryController(InquiryService inquiryService) {
        this.inquiryService = inquiryService;
    }

    @PostMapping
    public ResponseEntity<InquiryDto> create(Authentication authentication, @RequestBody CreateInquiryRequest req) {
        return ResponseEntity.ok(inquiryService.createOrContinue(parseUserId(authentication), req.category()));
    }

    @GetMapping
    public ResponseEntity<List<InquiryDto>> list(Authentication authentication) {
        return ResponseEntity.ok(inquiryService.listMine(parseUserId(authentication)));
    }

    @GetMapping("/{inquiryId}/messages")
    public ResponseEntity<List<InquiryMessageDto>> messages(Authentication authentication, @PathVariable Long inquiryId) {
        return ResponseEntity.ok(inquiryService.listMyMessages(parseUserId(authentication), inquiryId));
    }

    @PostMapping("/{inquiryId}/messages")
    public ResponseEntity<InquiryMessageDto> send(Authentication authentication, @PathVariable Long inquiryId,
                                                   @RequestBody SendMessageRequest req) {
        return ResponseEntity.ok(inquiryService.sendMine(parseUserId(authentication), inquiryId, req.message()));
    }

    private Long parseUserId(Authentication authentication) {
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException | NullPointerException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 정보입니다.");
        }
    }
}
