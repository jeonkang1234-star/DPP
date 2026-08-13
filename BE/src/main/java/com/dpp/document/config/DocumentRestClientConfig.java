package com.dpp.document.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * 파서(짧음)와 zkp(실제 증명 생성 - 수십 초~수 분)는 읽기 타임아웃 요구사항이 완전히
 * 달라서 RestClient를 분리했다. 하나로 합치면 둘 중 하나에 맞춰 과하게 짧거나
 * 과하게 길게 잡아야 한다.
 */
@Configuration
public class DocumentRestClientConfig {

    @Bean
    public RestClient parserRestClient(DocumentIntegrationProperties properties) {
        return RestClient.builder()
                .baseUrl(properties.getParserUrl())
                .requestFactory(timeoutFactory(5_000, 60_000))
                .build();
    }

    @Bean
    public RestClient zkpRestClient(DocumentIntegrationProperties properties) {
        return RestClient.builder()
                .baseUrl(properties.getZkpUrl())
                .requestFactory(timeoutFactory(5_000, 4 * 60_000))
                .build();
    }

    private ClientHttpRequestFactory timeoutFactory(int connectTimeoutMs, int readTimeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);
        return factory;
    }
}
