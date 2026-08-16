package com.dpp.document.zkp;

import java.util.Map;

/**
 * parser의 battery_pcf_values(Q2_07 배터리 탄소발자국 선언, {rated_capacity_kwh, recycled_
 * content_percent: {Co,Li,Ni,Pb}, ...})를 zkp-o1js circuits.mjs의 BatteryCheck 입력
 * (BatteryPublic/BatteryPrivate)에 맞춰 고정소수점 정수로 스케일링한다. 스케일 규칙
 * (circuits.mjs 주석): 배터리·재활용 비율(%, 소수 1자리) -> x10. 임계값은 judge.py
 * evaluate_battery_pcf의 기본값과 동일하게 맞춘다: Co≥16.0%, Li≥6.0%, Ni≥6.0%, Pb≥85.0%
 * (단 Pb는 실측 0%면 회로 자체가 OR로 "적용 제외"를 흡수한다), 정격용량 임계값은 탄소발자국
 * 선언 의무 판단 기준인 2.0kWh.
 *
 * 재생원료 4원소 중 일부가 문서에서 안 뽑혀도(judge.py 기준 INDETERMINATE) 업로드 자체를
 * 막지 않는다 - 0으로 채워 회로에 넣는다(Pb는 0=적용제외로 정확히 해석되고, Co/Li/Ni는
 * 0이면 임계값 미달로 FAIL 판정되어 사용자가 재업로드 필요성을 바로 알 수 있다). 다만
 * "재생원료 함유율" 표 자체가 문서에 전혀 없거나 정격용량을 못 읽었으면 필수 정보 자체가
 * 없는 것이므로 예외를 던진다(FiberZkpMapper/OekotexZkpMapper와 동일한 원칙).
 */
public final class BatteryZkpMapper {

    private static final long CO_THRESHOLD_X10 = 160;  // 재생원료 Co 16.0%
    private static final long LI_THRESHOLD_X10 = 60;   // 재생원료 Li 6.0%
    private static final long NI_THRESHOLD_X10 = 60;   // 재생원료 Ni 6.0%
    private static final long PB_THRESHOLD_X10 = 850;  // 재생원료 Pb 85.0% (0%면 적용 제외)
    private static final long CAPACITY_THRESHOLD_X10 = 20; // 탄소발자국 선언 의무 기준 2.0kWh

    private BatteryZkpMapper() {
    }

    public record BatteryZkpInput(
            long coThresholdX10, long liThresholdX10, long niThresholdX10,
            long pbThresholdX10, long capacityThresholdX10,
            long coX10, long liX10, long niX10, long pbX10, long capacityX10,
            double co, double li, double ni, double pb, double capacityKwh
    ) {
    }

    @SuppressWarnings("unchecked")
    public static BatteryZkpInput build(Map<String, Object> batteryPcfValues) {
        if (batteryPcfValues == null) {
            throw new IllegalArgumentException(
                    "battery_pcf_values가 비어 있습니다 (파서가 Q2_07 배터리 탄소발자국 선언 값을 못 읽었을 수 있음).");
        }
        Object recycledRaw = batteryPcfValues.get("recycled_content_percent");
        if (!(recycledRaw instanceof Map<?, ?> recycledMap) || recycledMap.isEmpty()) {
            throw new IllegalArgumentException("재생원료 함유율(Co/Li/Ni/Pb) 표를 문서에서 읽지 못했습니다.");
        }
        Map<String, Object> recycled = (Map<String, Object>) recycledMap;
        double co = numberOrZero(recycled.get("Co"));
        double li = numberOrZero(recycled.get("Li"));
        double ni = numberOrZero(recycled.get("Ni"));
        double pb = numberOrZero(recycled.get("Pb"));

        Object capacityRaw = batteryPcfValues.get("rated_capacity_kwh");
        if (!(capacityRaw instanceof Number capacityNumber)) {
            throw new IllegalArgumentException("정격용량(kWh)을 문서에서 읽지 못했습니다.");
        }
        double capacityKwh = capacityNumber.doubleValue();

        return new BatteryZkpInput(
                CO_THRESHOLD_X10, LI_THRESHOLD_X10, NI_THRESHOLD_X10, PB_THRESHOLD_X10, CAPACITY_THRESHOLD_X10,
                Math.round(co * 10), Math.round(li * 10), Math.round(ni * 10), Math.round(pb * 10), Math.round(capacityKwh * 10),
                co, li, ni, pb, capacityKwh
        );
    }

    private static double numberOrZero(Object value) {
        return value instanceof Number n ? n.doubleValue() : 0.0;
    }
}
