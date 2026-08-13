package com.dpp.auth.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Authorization: Bearer <accessToken> 헤더를 파싱해 SecurityContext에 인증 정보를 채운다.
 *
 * principal(SecurityContext의 Authentication#getName())은 UserAccount.userId(Long)를
 * 문자열로 담은 값이다. JwtTokenProvider.createAccessToken 호출부(PasswordAuthService,
 * SnsAuthService)가 subject로 user.getUserId().toString()을 쓰고 있으므로 여기서도
 * 동일하게 취급한다 - publicUuid가 아니라 내부 시퀀스 PK다.
 *
 * refresh 토큰(claim "type"=="refresh")은 일반 API 인증에 쓰면 안 되므로 무시한다
 * (JwtTokenProvider.createRefreshToken이 그 claim을 붙인다).
 *
 * 토큰이 없거나 검증에 실패해도 여기서 401을 내려보내지 않고 그냥 필터체인을 통과시킨다.
 * 인증 필요 여부는 SecurityConfig의 authorizeHttpRequests가 판단하고,
 * 그 결과 인증되지 않은 상태로 보호된 경로에 접근하면 SecurityConfig의
 * authenticationEntryPoint가 401을 내려준다.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                     @NonNull HttpServletResponse response,
                                     @NonNull FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                Claims claims = jwtTokenProvider.parseClaims(token);
                if (!"refresh".equals(claims.get("type"))) {
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(claims.getSubject(), null, List.of());
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (JwtException | IllegalArgumentException e) {
                // 만료/위조/형식 오류 등 - 인증 안 된 상태로 그냥 흘려보낸다.
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }
}
