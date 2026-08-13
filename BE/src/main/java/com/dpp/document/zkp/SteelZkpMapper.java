package com.dpp.document.zkp;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * parser의 steel_mill_values(화학성분 8 + 기계적성질 4)를 zkp-o1js circuits.mjs의
 * SteelLimits/SteelMeasured 필드에 맞춰 고정소수점 정수로 스케일링한다.
 * 스케일 규칙은 circuits.mjs 주석과 완전히 동일해야 증명이 의미를 갖는다:
 *   - 화학성분(wt%, 소수 3자리까지) -> x1000
 *   - 기계적성질(N/mm², %, J - 원본이 이미 정수) -> x1
 * 화학성분 8개는 전부 "이하(≤)" 상한 규격이라는 게 회로 설계(m.C.lessThanOrEqual(limits.C) 등)의
 * 전제 - _spec_check가 하한(≥)으로 파싱하면 회로 의미와 어긋나므로 여기서 명시적으로 걸러낸다.
 */
public final class SteelZkpMapper {

    private static final String[] CHEMICAL_ELEMENTS = {"C", "Si", "Mn", "P", "S", "N", "Cu", "CEV"};

    private SteelZkpMapper() {
    }

    public record SteelZkpInput(Map<String, Long> limits, Map<String, Long> measured) {
    }

    @SuppressWarnings("unchecked")
    public static SteelZkpInput build(Map<String, Object> steelMillValues) {
        if (steelMillValues == null) {
            throw new IllegalArgumentException(
                    "steel_mill_values가 비어 있습니다 (파서가 Q2_05 표를 못 읽었을 수 있음).");
        }
        Map<String, Object> chemical = (Map<String, Object>) steelMillValues.getOrDefault(
                "chemical_composition_wt_percent", Map.of());
        Map<String, Object> mechanical = (Map<String, Object>) steelMillValues.getOrDefault(
                "mechanical_properties", Map.of());

        Map<String, Long> limits = new LinkedHashMap<>();
        Map<String, Long> measured = new LinkedHashMap<>();

        for (String el : CHEMICAL_ELEMENTS) {
            Map<String, Object> data = (Map<String, Object>) chemical.get(el);
            if (data == null) {
                throw new IllegalArgumentException("화학성분 " + el + " 값을 문서에서 못 읽었습니다.");
            }
            double measuredVal = toDouble(data.get("measured"));
            String limitText = (String) data.get("limit_text");
            SpecLimitParser.SpecLimit spec = SpecLimitParser.parse(limitText);
            if (spec == null || spec.upper() == null) {
                throw new IllegalArgumentException(
                        "화학성분 " + el + "의 규격(" + limitText + ")을 상한값(≤)으로 해석하지 못했습니다.");
            }
            measured.put(el, scale1000(measuredVal));
            limits.put(el, scale1000(spec.upper()));
        }

        putLowerBound(mechanical, measured, limits, "ReH", "ReH_min");
        putRange(mechanical, measured, limits, "Rm", "Rm_low", "Rm_high");
        putLowerBound(mechanical, measured, limits, "A", "A_min");
        putLowerBound(mechanical, measured, limits, "KV", "KV_min");

        return new SteelZkpInput(limits, measured);
    }

    @SuppressWarnings("unchecked")
    private static void putLowerBound(Map<String, Object> mechanical, Map<String, Long> measured,
                                       Map<String, Long> limits, String key, String limitKey) {
        Map<String, Object> data = (Map<String, Object>) mechanical.get(key);
        if (data == null) {
            throw new IllegalArgumentException("기계적성질 " + key + " 값을 문서에서 못 읽었습니다.");
        }
        double measuredVal = toDouble(data.get("measured"));
        String specText = (String) data.get("spec_text");
        SpecLimitParser.SpecLimit spec = SpecLimitParser.parse(specText);
        if (spec == null || spec.lower() == null) {
            throw new IllegalArgumentException(
                    "기계적성질 " + key + "의 규격(" + specText + ")을 하한값(≥)으로 해석하지 못했습니다.");
        }
        measured.put(key, scale1(measuredVal));
        limits.put(limitKey, scale1(spec.lower()));
    }

    @SuppressWarnings("unchecked")
    private static void putRange(Map<String, Object> mechanical, Map<String, Long> measured,
                                  Map<String, Long> limits, String key, String lowKey, String highKey) {
        Map<String, Object> data = (Map<String, Object>) mechanical.get(key);
        if (data == null) {
            throw new IllegalArgumentException("기계적성질 " + key + " 값을 문서에서 못 읽었습니다.");
        }
        double measuredVal = toDouble(data.get("measured"));
        String specText = (String) data.get("spec_text");
        SpecLimitParser.SpecLimit spec = SpecLimitParser.parse(specText);
        if (spec == null || spec.lower() == null || spec.upper() == null) {
            throw new IllegalArgumentException(
                    "기계적성질 " + key + "의 규격(" + specText + ")을 범위(하한–상한)로 해석하지 못했습니다.");
        }
        measured.put(key, scale1(measuredVal));
        limits.put(lowKey, scale1(spec.lower()));
        limits.put(highKey, scale1(spec.upper()));
    }

    private static long scale1000(double v) {
        return Math.round(v * 1000);
    }

    private static long scale1(double v) {
        return Math.round(v);
    }

    private static double toDouble(Object o) {
        if (o instanceof Number n) {
            return n.doubleValue();
        }
        throw new IllegalArgumentException("숫자가 아닌 값: " + o);
    }
}
