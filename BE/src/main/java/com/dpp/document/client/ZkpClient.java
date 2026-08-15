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

    /**
     * POST /prove/cbam-check - "연간 누적 수입량이 de minimis 기준을 초과했는가" 하나만
     * 증명한다. 응답의 verified는 크립토 증명 자체의 유효성(정상 요청이면 항상 true에
     * 가깝다)이고, obligated가 실제 의무 발생 여부(true/false 둘 다 정상 결과) - 이 둘을
     * 헷갈리면 안 된다(CbamIngestService 주석 참고).
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> proveCbamCheck(long deMinimisX10, long qtyX10) {
        Map<String, Object> payload = Map.of("deMinimisX10", deMinimisX10, "qtyX10", qtyX10);
        return zkpRestClient.post()
                .uri("/prove/cbam-check")
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .body(Map.class);
    }
}
