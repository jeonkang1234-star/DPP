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

    /**
     * POST /prove/fiber-sum-check - 섬유 혼용률 합계가 목표치(100%) 허용오차 이내인지
     * 증명한다. FiberZkpMapper가 임의 개수의 섬유 조성을 p1(합계)에 몰아 p2~p4는 0으로
     * 채워 보낸다 - 회로는 4개를 그냥 합산만 하므로 결과(passed)는 실제 합계 판정과 같다.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> proveFiberSumCheck(long targetX10, long toleranceX10,
                                                   long p1, long p2, long p3, long p4) {
        Map<String, Object> payload = Map.of(
                "targetX10", targetX10, "toleranceX10", toleranceX10,
                "p1", p1, "p2", p2, "p3", p3, "p4", p4);
        return zkpRestClient.post()
                .uri("/prove/fiber-sum-check")
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .body(Map.class);
    }

    /**
     * POST /prove/oekotex-check - pH 실측값이 [low, high] 범위 안인지 증명한다.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> proveOekotexCheck(long lowX10, long highX10, long phX10) {
        Map<String, Object> payload = Map.of("lowX10", lowX10, "highX10", highX10, "phX10", phX10);
        return zkpRestClient.post()
                .uri("/prove/oekotex-check")
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .body(Map.class);
    }

    /**
     * POST /prove/battery-check - 재생원료 Co/Li/Ni/Pb가 각 임계값 이상인지(Pb는 0%면
     * 적용 제외) + 탄소발자국 선언 의무 대상 용량(정보성) 5항목을 한 번에 증명한다.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> proveBatteryCheck(long coThresholdX10, long liThresholdX10, long niThresholdX10,
                                                  long pbThresholdX10, long capacityThresholdX10,
                                                  long coX10, long liX10, long niX10, long pbX10, long capacityX10) {
        Map<String, Object> payload = Map.of(
                "coThresholdX10", coThresholdX10, "liThresholdX10", liThresholdX10, "niThresholdX10", niThresholdX10,
                "pbThresholdX10", pbThresholdX10, "capacityThresholdX10", capacityThresholdX10,
                "coX10", coX10, "liX10", liX10, "niX10", niX10, "pbX10", pbX10, "capacityX10", capacityX10);
        return zkpRestClient.post()
                .uri("/prove/battery-check")
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .body(Map.class);
    }

    /**
     * POST /prove/recycling-check - 물질회수율 구리(직접)/리튬·코발트(파생)가 각 기준치
     * 이상인지 증명한다.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> proveRecyclingCheck(long cuThresholdX10, long liThresholdX10, long coThresholdX10,
                                                     long cuX10, long liDerivedX10, long coDerivedX10) {
        Map<String, Object> payload = Map.of(
                "cuThresholdX10", cuThresholdX10, "liThresholdX10", liThresholdX10, "coThresholdX10", coThresholdX10,
                "cuX10", cuX10, "liDerivedX10", liDerivedX10, "coDerivedX10", coDerivedX10);
        return zkpRestClient.post()
                .uri("/prove/recycling-check")
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .body(Map.class);
    }
}
