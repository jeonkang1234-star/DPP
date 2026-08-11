package com.dpp.auth.controller;

import com.dpp.auth.dto.BusinessSignupRequest;
import com.dpp.auth.dto.EmailCodeRequest;
import com.dpp.auth.dto.EmailVerifyRequest;
import com.dpp.auth.dto.LoginResponse;
import com.dpp.auth.service.BusinessSignupService;
import com.dpp.auth.service.EmailVerificationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 기업 회원가입 3단계: 인증코드 발급 -> 인증코드 검증 -> 가입 확정.
 * 개인(PERSONAL) 회원가입은 이 컨트롤러를 쓰지 않고 SnsAuthController(/auth/sns/*)로 처리한다.
 */
@RestController
@RequestMapping("/auth/signup/business")
public class BusinessSignupController {

    private final EmailVerificationService emailVerificationService;
    private final BusinessSignupService businessSignupService;

    public BusinessSignupController(EmailVerificationService emailVerificationService,
                                     BusinessSignupService businessSignupService) {
        this.emailVerificationService = emailVerificationService;
        this.businessSignupService = businessSignupService;
    }

    /** 1단계: 이메일로 6자리 인증코드 발급 (5분 유효, 재발송은 60초 쿨다운). */
    @PostMapping("/email/code")
    public ResponseEntity<Void> requestCode(@Valid @RequestBody EmailCodeRequest request) {
        emailVerificationService.requestCode(request.email());
        return ResponseEntity.status(HttpStatus.ACCEPTED).build();
    }

    /** 2단계: 인증코드 검증. 통과하면 30분 동안 가입(3단계) 진행 가능. */
    @PostMapping("/email/verify")
    public ResponseEntity<Void> verifyCode(@Valid @RequestBody EmailVerifyRequest request) {
        emailVerificationService.verifyCode(request.email(), request.code());
        return ResponseEntity.ok().build();
    }

    /** 3단계: 이메일 인증이 끝난 상태에서 실제 계정 생성. 성공 시 바로 로그인 토큰 발급. */
    @PostMapping
    public ResponseEntity<LoginResponse> signup(@Valid @RequestBody BusinessSignupRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(businessSignupService.signup(request));
    }
}
