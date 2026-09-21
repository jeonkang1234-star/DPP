package com.dpp.document.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 문서 업로드 -> 파싱 -> 블록체인 앵커 -> ZKP 검증 파이프라인의 "지금 몇 % 인지"를 메모리에 잡아둔다.
 *
 * 업로드 API가 동기식(응답이 ZKP 증명까지 끝난 뒤에야 온다)이라 화면은 그 사이 진행 상황을 알 수
 * 없었다. 각 단계가 시작될 때 여기에 기록하고, FE가 GET /document/progress를 주기적으로 조회한다.
 *
 * 단계 안쪽(특히 ZKP 증명 - 외부 서버 호출 한 번에 수십 초)은 실제 진행률을 알 방법이 없다.
 * 그래서 단계마다 [floor, ceil] 구간과 "보통 이 정도 걸린다"(expectedSec)를 두고, 조회할 때
 * 경과시간에 따라 floor -> ceil 로 점근적으로 채워 보여준다(ceil에는 절대 못 닿는다 - 실제로
 * 끝나 다음 단계가 시작되어야 넘어간다). 그래서 % 는 "추정치"이고, 단계 이름은 실제 상태다.
 * 단일 인스턴스 백엔드 기준의 인메모리 저장소다(재시작하면 비워짐 - 진행 표시용 일시 정보).
 */
public final class IngestProgress {

    public enum Status { RUNNING, DONE, FAILED }

    public record Entry(Long userId, Long dppId, String docTypeCode, int percent, String stage,
                        Status status, String message, Instant startedAt, Instant updatedAt) {}

    private record State(Long userId, Long dppId, String docTypeCode, int floor, int ceil, double expectedSec,
                         String stage, Status status, String message, Instant startedAt, Instant stageStartedAt,
                         Instant updatedAt) {}

    private static final Map<String, State> STATES = new ConcurrentHashMap<>();
    /** 끝난(DONE/FAILED) 항목을 화면에 남겨두는 시간. */
    private static final long KEEP_SECONDS = 600;

    private IngestProgress() {}

    private static String key(Long userId, Long dppId, String docTypeCode) {
        return userId + ":" + dppId + ":" + docTypeCode;
    }

    public static void start(Long userId, Long dppId, String docTypeCode) {
        Instant now = Instant.now();
        STATES.put(key(userId, dppId, docTypeCode), new State(userId, dppId, docTypeCode, 2, 2, 1,
                "업로드 확인", Status.RUNNING, null, now, now, now));
    }

    /** 구간 없이 그 % 로 고정. */
    public static void update(Long userId, Long dppId, String docTypeCode, int percent, String stage) {
        ramp(userId, dppId, docTypeCode, percent, percent, 1, stage);
    }

    /** 이 단계는 floor 에서 시작해 expectedSec 정도 걸리면 ceil 근처까지 차오르는 것으로 보여준다. */
    public static void ramp(Long userId, Long dppId, String docTypeCode, int floor, int ceil,
                            double expectedSec, String stage) {
        STATES.computeIfPresent(key(userId, dppId, docTypeCode), (k, s) -> {
            if (s.status() != Status.RUNNING) return s;
            Instant now = Instant.now();
            return new State(s.userId(), s.dppId(), s.docTypeCode(), Math.max(floor, currentPercent(s)), ceil,
                    Math.max(expectedSec, 0.5), stage, Status.RUNNING, null, s.startedAt(), now, now);
        });
    }

    public static void finish(Long userId, Long dppId, String docTypeCode) {
        STATES.computeIfPresent(key(userId, dppId, docTypeCode), (k, s) -> {
            Instant now = Instant.now();
            return new State(s.userId(), s.dppId(), s.docTypeCode(), 100, 100, 1, "검증 완료", Status.DONE, null,
                    s.startedAt(), now, now);
        });
    }

    public static void fail(Long userId, Long dppId, String docTypeCode, String message) {
        STATES.computeIfPresent(key(userId, dppId, docTypeCode), (k, s) -> {
            Instant now = Instant.now();
            return new State(s.userId(), s.dppId(), s.docTypeCode(), currentPercent(s), currentPercent(s), 1,
                    "검증 실패", Status.FAILED, message, s.startedAt(), now, now);
        });
    }

    /** 문서 유형별 실제 ZKP 증명 소요시간(ms)의 이동평균 - 다음 업로드의 진행바 속도를 맞추는 데 쓴다. */
    private static final Map<String, Double> ZKP_EMA_SEC = new ConcurrentHashMap<>();
    private static final double DEFAULT_ZKP_SEC = 40;

    public static void recordZkpDuration(String docTypeCode, Object proveMs) {
        if (!(proveMs instanceof Number n) || n.doubleValue() <= 0) return;
        double sec = n.doubleValue() / 1000.0 + 2; // 앞뒤 전송·검증 여유
        ZKP_EMA_SEC.merge(docTypeCode, sec, (old, cur) -> old * 0.6 + cur * 0.4);
    }

    public static double expectedZkpSec(String docTypeCode) {
        return ZKP_EMA_SEC.getOrDefault(docTypeCode, DEFAULT_ZKP_SEC);
    }

    private static int currentPercent(State s) {
        if (s.status() != Status.RUNNING || s.ceil() <= s.floor()) return s.floor();
        double elapsed = (Instant.now().toEpochMilli() - s.stageStartedAt().toEpochMilli()) / 1000.0;
        double frac = 1.0 - Math.exp(-elapsed / s.expectedSec());
        int p = (int) Math.floor(s.floor() + (s.ceil() - s.floor()) * frac);
        return Math.min(p, s.ceil() - 1);
    }

    /** 이 사용자의 진행 중 + 최근(10분 이내) 종료 항목, 최근 갱신 순. */
    public static List<Entry> listFor(Long userId) {
        Instant cutoff = Instant.now().minusSeconds(KEEP_SECONDS);
        STATES.values().removeIf(s -> s.status() != Status.RUNNING && s.updatedAt().isBefore(cutoff));
        List<Entry> out = new ArrayList<>();
        for (State s : STATES.values()) {
            if (userId != null && userId.equals(s.userId())) {
                out.add(new Entry(s.userId(), s.dppId(), s.docTypeCode(), currentPercent(s), s.stage(),
                        s.status(), s.message(), s.startedAt(), s.updatedAt()));
            }
        }
        out.sort(Comparator.comparing(Entry::updatedAt).reversed());
        return out;
    }
}
