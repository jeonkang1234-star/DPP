package com.dpp.document.zkp;

import java.util.Map;

/**
 * parser의 oekotex_values(Q3_10 OEKO-TEX 라벨, {ph: <실측값>})를 zkp-o1js circuits.mjs의
 * OekotexCheck 입력(OekotexPublic/OekotexPrivate)에 맞춰 고정소수점 정수로 스케일링한다.
 * 스케일 규칙(circuits.mjs 주석): pH(소수 1자리) -> x10. 판정 범위(4.0~7.5)는 judge.py
 * evaluate_oekotex의 기본값과 동일하게 맞춘다.
 */
public final class OekotexZkpMapper {

    private static final long LOW_X10 = 40;  // pH 4.0
    private static final long HIGH_X10 = 75; // pH 7.5

    private OekotexZkpMapper() {
    }

    public record OekotexZkpInput(long lowX10, long highX10, long phX10, double ph) {
    }

    public static OekotexZkpInput build(Map<String, Object> oekotexValues) {
        if (oekotexValues == null) {
            throw new IllegalArgumentException(
                    "oekotex_values가 비어 있습니다 (파서가 Q3_10 pH 값을 못 읽었을 수 있음).");
        }
        Object phRaw = oekotexValues.get("ph");
        if (!(phRaw instanceof Number n)) {
            throw new IllegalArgumentException("pH 값을 문서에서 읽지 못했습니다.");
        }
        double ph = n.doubleValue();
        return new OekotexZkpInput(LOW_X10, HIGH_X10, Math.round(ph * 10), ph);
    }
}
