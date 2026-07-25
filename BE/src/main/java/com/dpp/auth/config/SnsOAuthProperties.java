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
 */
@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "oauth")
public class SnsOAuthProperties {

    private Provider kakao = new Provider();
    private Provider google = new Provider();
    private Provider naver = new Provider();

    @Getter
    @Setter
    public static class Provider {
        private String clientId;
        private String clientSecret;
        private String redirectUri;
    }
}
