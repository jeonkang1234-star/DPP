package com.dpp.document.zkp;

import java.util.Map;

/**
 * parser의 recycling_result_values(Q4_15 재활용 처리 결과 보고서, {overall_recycling_rate_
 * percent, material_recovery: {소재명 -> {input_kg, recovered_kg, recovery_rate_percent}}})를
 * zkp-o1js circuits.mjs의 RecyclingCheck 입력(RecyclingPublic/RecyclingPrivate)에 맞춰
 * 고정소수점 정수로 스케일링한다. 스케일 규칙(circuits.mjs 주석): 재활용 비율(%, 소수 1자리)
 * -> x10. 임계값은 judge.py evaluate_recycling_result 기본값과 동일: 구리(직접) 회수율
 * ≥90%, 리튬/코발트(파생, "리튬코발트산화물" 화합물 단위로만 보고됨 - LiCoO2 화학양론
 * 분해·조성비 보존을 가정) 회수율 각각 ≥50%/≥90%.
 *
 * 종합재활용효율(overall_recycling_rate_percent)은 이 회로의 대상이 아니다(judge.py: 소재별
 * 표 투입합계 vs 입고중량 분모 정합성까지 봐야 해서 단순 임계값 비교로 환원 안 됨 -
 * zkp-o1js/README "ZKP 비대상 4개 항목" 참고) - 값이 있으면 그대로 응답에 실어 정보성
 * 필드(OVERALL_RECYCLING_EFFICIENCY)에만 반영한다.
 */
public final class RecyclingZkpMapper {

    private static final long CU_THRESHOLD_X10 = 900; // 물질회수율 구리 90.0%
    private static final long LI_THRESHOLD_X10 = 500; // 물질회수율 리튬(파생) 50.0%
    private static final long CO_THRESHOLD_X10 = 900; // 물질회수율 코발트(파생) 90.0%

    private RecyclingZkpMapper() {
    }

    public record RecyclingZkpInput(
            long cuThresholdX10, long liThresholdX10, long coThresholdX10,
            long cuX10, long liDerivedX10, long coDerivedX10,
            double cu, double liDerived, double coDerived,
            Double overallRecyclingRatePercent
    ) {
    }

    @SuppressWarnings("unchecked")
    public static RecyclingZkpInput build(Map<String, Object> recyclingResultValues) {
        if (recyclingResultValues == null) {
            throw new IllegalArgumentException(
                    "recycling_result_values가 비어 있습니다 (파서가 Q4_15 재활용 처리 결과 보고서 값을 못 읽었을 수 있음).");
        }
        Object materialsRaw = recyclingResultValues.get("material_recovery");
        if (!(materialsRaw instanceof Map<?, ?> materialsMap) || materialsMap.isEmpty()) {
            throw new IllegalArgumentException("소재별 회수 실적표를 문서에서 읽지 못했습니다.");
        }
        Map<String, Object> materials = (Map<String, Object>) materialsMap;
        double cu = recoveryRate(materials.get("구리"));
        // "리튬코발트산화물" 화합물 하나의 회수율을 리튬/코발트 둘 다에 그대로 적용한다
        // (judge.py evaluate_recycling_result와 동일한 가정 - LiCoO2 화학양론 분해 성립 시).
        double compoundRate = recoveryRate(materials.get("리튬코발트산화물"));

        Object overallRaw = recyclingResultValues.get("overall_recycling_rate_percent");
        Double overall = overallRaw instanceof Number n ? n.doubleValue() : null;

        return new RecyclingZkpInput(
                CU_THRESHOLD_X10, LI_THRESHOLD_X10, CO_THRESHOLD_X10,
                Math.round(cu * 10), Math.round(compoundRate * 10), Math.round(compoundRate * 10),
                cu, compoundRate, compoundRate,
                overall
        );
    }

    @SuppressWarnings("unchecked")
    private static double recoveryRate(Object entry) {
        if (!(entry instanceof Map<?, ?> map)) {
            return 0.0;
        }
        Object rate = ((Map<String, Object>) map).get("recovery_rate_percent");
        return rate instanceof Number n ? n.doubleValue() : 0.0;
    }
}
