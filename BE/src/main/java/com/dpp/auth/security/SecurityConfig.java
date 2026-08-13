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
                        // JwtAuthenticationFilter는 OncePerRequestFilter 기본값대로 ERROR
                        // 디스패치(예외 발생 후 서블릿 컨테이너가 /error로 forward)에서는
                        // 실행되지 않는다. /error를 인증 요구 대상에서 빼두지 않으면,
                        // 컨트롤러/서비스에서 어떤 예외가 나든 실제 원인 대신 "인증이
                        // 필요합니다"(401)로 뒤집어써서 클라이언트가 진짜 에러를 못 본다.
                        .requestMatchers("/error").permitAll()
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
