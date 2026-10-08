package com.dpp.auth.service;

import com.dpp.auth.dto.TokenResponse;
import com.dpp.auth.entity.AccountStatus;
import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.auth.security.JwtTokenProvider;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

/**
 * 세션 연장(2026-10-08 강 요청 - 헤더에 남은 시간을 띄우고 '연장' 버튼으로 늘릴 수 있게).
 *
 * 지금까지 refresh 토큰은 로그인 때 발급만 하고 쓰는 곳이 없어서, 액세스 토큰(1시간)이
 * 끝나면 무조건 다시 로그인해야 했다. 여기서 refresh 토큰을 검증해 새 액세스 토큰을 주고,
 * refresh 토큰도 새로 돌려준다(회전) - 오래된 refresh 토큰 하나로 무한히 연장되지 않게.
 *
 * 계정이 그사이 삭제·정지됐으면 연장하지 않는다 - 토큰 서명이 유효해도 계정 상태는
 * 지금 DB 기준으로 다시 본다.
 */
@Service
public class TokenRefreshService {

    private static final String EXPIRED_MESSAGE = "세션이 만료되었습니다. 다시 로그인해 주세요.";

    private final JwtTokenProvider jwtTokenProvider;
    private final UserAccountRepository userAccountRepository;

    public TokenRefreshService(JwtTokenProvider jwtTokenProvider, UserAccountRepository userAccountRepository) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userAccountRepository = userAccountRepository;
    }

    @Transactional(readOnly = true)
    public TokenResponse refresh(String refreshToken) {
        Claims claims;
        try {
            claims = jwtTokenProvider.parseClaims(refreshToken);
        } catch (JwtException | IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, EXPIRED_MESSAGE);
        }
        // 액세스 토큰을 refresh 자리에 넣어 보내는 경우를 막는다.
        if (!"refresh".equals(claims.get("type"))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, EXPIRED_MESSAGE);
        }
        Long userId;
        try {
            userId = Long.valueOf(claims.getSubject());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, EXPIRED_MESSAGE);
        }
        UserAccount user = userAccountRepository.findById(userId)
                .filter(u -> u.getDeletedAt() == null)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, EXPIRED_MESSAGE));
        if (user.getStatus() != AccountStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "사용할 수 없는 계정입니다. 다시 로그인해 주세요.");
        }

        // 로그인 때와 같은 클레임을 다시 싣는다(PasswordAuthService.login 참고).
        Map<String, Object> accessClaims = new HashMap<>();
        accessClaims.put("accountType", user.getAccountType().name());
        if (user.getOrgId() != null) {
            accessClaims.put("orgId", user.getOrgId());
        }
        String subject = user.getUserId().toString();
        return TokenResponse.of(
                jwtTokenProvider.createAccessToken(subject, accessClaims),
                jwtTokenProvider.createRefreshToken(subject));
    }
}
