package com.dpp.document.zkp;

import java.util.List;
import java.util.Map;

/**
 * parser의 fiber_composition(Q1_04 섬유 케어라벨, [{fiber, percent}, ...])을 zkp-o1js
 * circuits.mjs의 FiberSumCheck 입력(FiberPublic/FiberPrivate)에 맞춰 고정소수점 정수로
 * 스케일링한다. 스케일 규칙은 circuits.mjs 주석과 동일: 섬유 혼용률(%, 소수 1자리) -> x10.
 *
 * FiberSumCheck 회로는 개별 섬유 슬롯을 4개(p1~p4)까지만 받는데, 실제 문서의 섬유 종류
 * 수는 이보다 많을 수 있다(예: 5종 혼방). 회로가 하는 일은 어차피 p1+p2+p3+p4의 합을
 * 목표치와 비교하는 것뿐이라, 개별 섬유 비율을 슬롯에 나눠 담을 필요가 없다 - 전체 합계를
 * p1 하나에 몰아넣고 p2~p4는 0으로 채워도 "혼용률 합계" 판정 결과는 정확히 같다. 개별
 * 섬유명 자체는 애초에 회로에 들어가지 않는다(judge.py의 "섬유명칭 Annex I 유효성"은
 * 문자열 목록 대조라 회로화 대상이 아님 - zkp-o1js/README.md 참고, BE에서는 이 항목을
 * 별도로 판정하지 않는다).
 */
public final class FiberZkpMapper {

    /** judge.py evaluate_fiber_care_label의 기본 허용오차(0.5%포인트)와 동일하게 맞춘다. */
    private static final long TARGET_X10 = 1000; // 100.0% x10
    private static final long TOLERANCE_X10 = 5; // 0.5%p x10

    private FiberZkpMapper() {
    }

    public record FiberZkpInput(long targetX10, long toleranceX10, long p1, long p2, long p3, long p4,
                                 double totalPercent) {
    }

    @SuppressWarnings("unchecked")
    public static FiberZkpInput build(List<Object> fiberComposition) {
        if (fiberComposition == null || fiberComposition.isEmpty()) {
            throw new IllegalArgumentException(
                    "fiber_composition이 비어 있습니다 (파서가 Q1_04 섬유 조성표를 못 읽었을 수 있음).");
        }
        double total = 0;
        for (Object item : fiberComposition) {
            if (!(item instanceof Map<?, ?> map)) {
                continue;
            }
            Object percent = ((Map<String, Object>) map).get("percent");
            if (percent instanceof Number n) {
                total += n.doubleValue();
            }
        }
        long totalX10 = Math.round(total * 10);
        return new FiberZkpInput(TARGET_X10, TOLERANCE_X10, totalX10, 0, 0, 0, total);
    }
}
