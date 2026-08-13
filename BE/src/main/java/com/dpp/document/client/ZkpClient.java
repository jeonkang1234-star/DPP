package com.dpp.document.client;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * zkp-o1js HTTP 서버(zkp-o1js/server.mjs)의 POST /prove/steel-mill-check 호출 클라이언트.
 * 실제 zk-SNARK 증명 생성이라 응답까지 수십 초 걸릴 수 있다 - 타임아웃은
 * DocumentRestClientConfig.zkpRestClient()에서 넉넉히(4분) 잡아뒀다.
 */
@Component
public class ZkpClient {

    private final RestClient zkpRestClient;

    public ZkpClient(RestClient zkpRestClient) {
        this.zkpRestClient = zkpRestClient;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> proveSteelMillCheck(Map<String, Long> limits, Map<String, Long> measured) {
        Map<String, Object> payload = Map.of("limits", limits, "measured", measured);
        return zkpRestClient.post()
                .uri("/prove/steel-mill-check")
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .body(Map.class);
    }
}
