package com.dpp.dpp.service;

import java.util.Set;

/**
 * product_model.model_name을 어떻게 정하는지 한 군데로 모은 규칙.
 *
 * 원래 이 규칙은 FieldFormService.createDraftDpp 안에만 있었다. 그런데 그 자리는
 * "첫 임시저장" 시점이라, 그 순간 제품명 칸이 비어 있으면 "미입력 철강 제품" 같은
 * 자리표시자가 model_name에 그대로 박혔고, 사용자가 나중에 제품명을 채워도 그 값은
 * dpp_field_value에만 들어갈 뿐 product_model로는 한 번도 되돌아가지 않았다.
 * 공개 여권(QR)은 product_model.model_name을 읽으므로, 결국 QR로 보면 언제나
 * "미입력 ..."이 떴다(2026-08-23 강 지적).
 *
 * 이제 (1) 임시저장할 때마다 제품명 칸의 최신 값으로 model_name을 다시 맞추고,
 * (2) 그래도 자리표시자로 남아 있는 기존 DPP를 위해 공개 여권 쪽에서도 대체 이름을
 * 찾도록 했다. 두 곳이 같은 규칙을 봐야 해서 여기로 뺐다.
 */
final class ProductNaming {

    private ProductNaming() {
    }

    /** 도메인별로 "제품명"에 가장 가까운 필드. 아직 제품 선택 UI가 없어서 이걸로 대신한다. */
    static String nameFieldCode(String domain) {
        if (domain == null) {
            return "STEEL_GRADE";
        }
        return switch (domain) {
            case "TEXTILE" -> "FABRIC_TYPE";
            case "BATTERY" -> "BATTERY_MODEL_NO";
            default -> "STEEL_GRADE";
        };
    }

    /** 제품명 칸이 비어 있을 때 임시로 넣는 이름. */
    static String placeholder(String domain) {
        if (domain == null) {
            return "미입력 철강 제품";
        }
        return switch (domain) {
            case "TEXTILE" -> "미입력 섬유 제품";
            case "BATTERY" -> "미입력 배터리 제품";
            default -> "미입력 철강 제품";
        };
    }

    private static final Set<String> PLACEHOLDERS =
            Set.of("미입력 철강 제품", "미입력 섬유 제품", "미입력 배터리 제품");

    /** 비어 있거나 자리표시자면 true - 즉 "진짜 제품명이 아니다". */
    static boolean isPlaceholder(String name) {
        return name == null || name.isBlank() || PLACEHOLDERS.contains(name.trim());
    }

    /** 앞에서부터 자리표시자가 아닌 첫 값. 전부 아니면 null. */
    static String firstRealName(String... candidates) {
        for (String c : candidates) {
            if (!isPlaceholder(c)) {
                return c.trim();
            }
        }
        return null;
    }
}
