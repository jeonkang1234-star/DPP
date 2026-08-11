package com.dpp.auth.service;

import com.dpp.auth.dto.BusinessSignupRequest;
import com.dpp.auth.dto.LoginResponse;
import com.dpp.auth.entity.AccountStatus;
import com.dpp.auth.entity.AccountType;
import com.dpp.auth.entity.CredentialType;
import com.dpp.auth.entity.OnboardingStep;
import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.auth.security.JwtTokenProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.Map;

/**
 * 기업(BUSINESS) 계정 가입 확정. 이메일 인증(EmailVerificationService)이 끝난 이메일만 통과시킨다.
 * 가입 즉시 로그인 토큰을 내려줘서, FE 온보딩 화면(obVals.js)으로 바로 넘어갈 수 있게 한다.
 */
@Service
public class BusinessSignupService {

    private static final Logger log = LoggerFactory.getLogger(BusinessSignupService.class);

    private final UserAccountRepository userAccountRepository;
    private final EmailVerificationService emailVerificationService;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public BusinessSignupService(UserAccountRepository userAccountRepository,
                                  EmailVerificationService emailVerificationService,
                                  PasswordEncoder passwordEncoder,
                                  JwtTokenProvider jwtTokenProvider) {
        this.userAccountRepository = userAccountRepository;
        this.emailVerificationService = emailVerificationService;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Transactional
    public LoginResponse signup(BusinessSignupRequest request) {
        if (userAccountRepository.existsByEmail(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 가입된 이메일입니다.");
        }
        if (!emailVerificationService.isVerified(request.email())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이메일 인증을 먼저 완료해 주세요.");
        }

        // TODO: businessRegNo/country/domain을 저장할 organization 테이블이 없어 지금은 로그만 남긴다.
        // rbac/mypage 패키지에서 organization이 생기면 여기서 org를 만들고 user_account.org_id를 채울 것.
        log.info("[가입 접수 - org 테이블 미구현] company={}, businessRegNo={}, country={}, domain={}",
                request.companyName(), request.businessRegNo(), request.country(), request.domain());

        UserAccount user = new UserAccount();
        user.setAccountType(AccountType.BUSINESS);
        user.setCredentialType(CredentialType.PASSWORD);
        user.setEmail(request.email());
        user.setEmailVerified(true);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setDisplayName(request.companyName());
        user.setOnboardingStep(OnboardingStep.SIGNED_UP);
        user.setStatus(AccountStatus.ACTIVE);
        user.setLastLoginAt(OffsetDateTime.now());
        userAccountRepository.save(user);

        String access = jwtTokenProvider.createAccessToken(
                user.getUserId().toString(), Map.of("accountType", user.getAccountType().name()));
        String refresh = jwtTokenProvider.createRefreshToken(user.getUserId().toString());

        return LoginResponse.of(access, refresh, user.getAccountType().name(), user.getEmail(), user.getDisplayName());
    }
}
