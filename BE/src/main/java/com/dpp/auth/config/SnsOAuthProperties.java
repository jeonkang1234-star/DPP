package com.dpp.auth.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * application.yml 의 oauth.* 설정을 바인딩한다.
 *
 * oauth:
 *   kakao:
 *     client-id: xxx
 *     client-secret: xxx
 *     redirect-uri: http://localhost:8080/auth/sns/kakao/callback
 *   google: ...
 *   naver: ...
 *   allowed-redirect-hosts: localhost,15.134.9.240
 *
 * redirect-uri는 "기본값"이다. 실제로 SNS에 보내는 값은 요청이 들어온 호스트에서 만든다
 * (SnsAuthService.resolveRedirectUri) - localhost로 접속했으면 localhost 콜백, 퍼블릭 IP로
 * 접속했으면 퍼블릭 IP 콜백. 예전엔 이 값이 고정이라 퍼블릭 IP로 접속해도 SNS 인증 후
 * 브라우저가 localhost로 돌아가 버렸다(2026-08-22 강 리포트).
 */
@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "oauth")
public class SnsOAuthProperties {

    private Provider kakao = new Provider();
    private Provider google = new Provider();
    private Provider naver = new Provider();

    /**
     * 콜백 주소로 인정할 호스트 목록(쉼표 구분, 포트 제외). 비워 두면 요청 호스트를 그대로
     * 쓴다.
     *
     * 보안 메모: Host 헤더는 클라이언트가 조작할 수 있지만, 조작한 주소로 토큰이 새어나가진
     * 않는다 - SNS 제공자가 자기 콘솔에 "등록된" redirect_uri가 아니면 인가 자체를 거부하기
     * 때문이다(redirect_uri_mismatch). 즉 실질적인 통제는 각 SNS 콘솔의 등록 목록이고,
     * 이 값은 그 앞단에 하나 더 두는 방어선이다. 운영에서는 채워 두는 쪽이 좋다.
     */
    private String allowedRedirectHosts = "";

    @Getter
    @Setter
    public static class Provider {
        private String clientId;
        private String clientSecret;
        private String redirectUri;
    }
}
