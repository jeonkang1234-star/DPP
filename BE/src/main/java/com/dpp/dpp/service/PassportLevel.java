package com.dpp.dpp.service;

import java.util.Map;
import java.util.Set;

/**
 * DPP 발급 단위(2026-10-07, V40) - ESPR (EU) 2024/1781 제9조의 모델 / 배치 / 개별.
 *
 * 단위마다 "무엇으로 식별하는가"가 다르다. 그 식별 키는 이미 입력 폼의 필드(dpp_field_value)에
 * 있으므로 따로 저장하지 않고, 도메인별로 어느 필드를 키로 보는지만 여기서 정한다.
 *   배치 : 철강 용강 배치/히트 번호, 섬유·배터리 배치·로트 번호
 *   개별 : 철강 코일·후판·강관 ID, 배터리 개별 고유 식별자, 섬유 시리얼 번호
 *   모델 : GTIN (없으면 제품명)
 */
public final class PassportLevel {

    public static final String MODEL = "MODEL";
    public static final String BATCH = "BATCH";
    public static final String ITEM = "ITEM";
    public static final Set<String> ALL = Set.of(MODEL, BATCH, ITEM);

    private static final Map<String, String> LABEL = Map.of(MODEL, "모델 단위", BATCH, "배치 단위", ITEM, "개별 단위");

    private static final Map<String, String> BATCH_KEY = Map.of(
            "STEEL", "HEAT_NO", "TEXTILE", "FABRIC_LOT_NO", "BATTERY", "BATCH_OR_LOT_NUMBER");
    private static final Map<String, String> ITEM_KEY = Map.of(
            "STEEL", "LOT_NO", "TEXTILE", "SERIAL_NUMBER", "BATTERY", "BATTERY_UNIQUE_ID");
    private static final Map<String, String> KEY_LABEL = Map.of(
            "HEAT_NO", "Heat No.", "FABRIC_LOT_NO", "로트", "BATCH_OR_LOT_NUMBER", "배치·로트",
            "LOT_NO", "제품 ID", "SERIAL_NUMBER", "시리얼", "BATTERY_UNIQUE_ID", "고유 식별자",
            "GTIN", "GTIN", "MODEL_NAME", "모델");

    private PassportLevel() {
    }

    /** 도메인 기본값 - 철강 배치(Heat), 배터리 개별(배터리규정 제77조), 섬유 모델. */
    public static String defaultFor(String domain) {
        if ("BATTERY".equals(domain)) {
            return ITEM;
        }
        if ("TEXTILE".equals(domain)) {
            return MODEL;
        }
        return BATCH;
    }

    /** 허용값이면 대문자로 정규화해서, 아니면 null. */
    public static String normalize(String level) {
        if (level == null) {
            return null;
        }
        String v = level.trim().toUpperCase();
        return ALL.contains(v) ? v : null;
    }

    public static String label(String level) {
        return LABEL.getOrDefault(level, LABEL.get(BATCH));
    }

    /** 이 단위를 식별하는 필드 코드. 모델 단위는 GTIN. */
    public static String keyFieldCode(String level, String domain) {
        if (BATCH.equals(level)) {
            return BATCH_KEY.get(domain);
        }
        if (ITEM.equals(level)) {
            return ITEM_KEY.get(domain);
        }
        return "GTIN";
    }

    /** "Heat No. SH60218" 같은 식별 키 표시. 값이 없으면 null. */
    public static String keyText(String level, String domain, Map<String, String> values) {
        String code = keyFieldCode(level, domain);
        String v = code == null || values == null ? null : values.get(code);
        if ((v == null || v.isBlank()) && MODEL.equals(level) && values != null) {
            code = "MODEL_NAME";
            v = values.get(code);
        }
        if (v == null || v.isBlank()) {
            return null;
        }
        return KEY_LABEL.getOrDefault(code, code) + " " + v.trim();
    }
}
