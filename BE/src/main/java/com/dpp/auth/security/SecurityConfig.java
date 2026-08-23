package com.dpp.auth.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * /auth/**(로그인/회원가입/SNS OAuth/이메일·전화 인증코드)는 토큰이 없는 상태에서
 * 호출되므로 permitAll. 그 외 전 경로는 JwtAuthenticationFilter가 채운
 * SecurityContext 기준으로 인증을 요구한다.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/auth/**").permitAll()
                        // QR/링크로 로그인 없이 스캔하는 공개 DPP 조회(2026-08-18,
                        // PublicPassportController) - 여기도 permitAll이어야 한다.
                        .requestMatchers("/public/**").permitAll()
                        // JwtAuthenticationFilter는 OncePerRequestFilter 기본값대로 ERROR
                        // 디스패치(예외 발생 후 서블릿 컨테이너가 /error로 forward)에서는
                        // 실행되지 않는다. /error를 인증 요구 대상에서 빼두지 않으면,
                        // 컨트롤러/서비스에서 어떤 예외가 나든 실제 원인 대신 "인증이
                        // 필요합니다"(401)로 뒤집어써서 클라이언트가 진짜 에러를 못 본다.
                        .requestMatchers("/error").permitAll()
                        // 헬스체크(2026-08-23). 지금까지 여기에 없어서 /actuator/health가
                        // 항상 401이었고, CD의 마지막 헬스체크 단계(curl -f .../actuator/health)가
                        // 구조적으로 통과할 수 없었다. 노출되는 정보는 {"status":"UP"} 뿐이다
                        // (application.yml의 management.endpoint.health.show-details: never).
                        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(ex -> ex.authenticationEntryPoint((request, response, authException) -> {
                    // setContentType만으로는 charset이 안 붙어서(서블릿 기본 인코딩은 ISO-8859-1)
                    // 한글 메시지가 깨져 나간다 - setCharacterEncoding을 명시해야 한다.
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.setCharacterEncoding("UTF-8");
                    response.setStatus(401);
                    response.getWriter().write("{\"message\":\"인증이 필요합니다.\"}");
                }))
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable());
        return http.build();
    }

    /** PasswordAuthService에서 회원가입 시 해시 생성 / 로그인 시 검증에 사용. */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
