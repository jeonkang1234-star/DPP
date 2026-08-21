package com.dpp.dpp.dto;

import java.util.Map;

/**
 * POST /me/field-form/draft 요청. dppId가 null이면 새 DPP를 만든다. values는 field_code ->
 * 입력값(빈 문자열/null이면 해당 필드를 저장하지 않음 - 지우고 싶으면 별도 처리 없이 그냥
 * 안 보내면 됨, 이 화면엔 "필드 삭제" 개념이 없다).
 */
public record SaveFieldFormRequest(
        Long dppId,
        String domain,
        Map<String, String> values,
        /**
         * 사용자가 붙이는 DPP 이름(내부 식별용, 2026-08-20 강 요청). null이면 기존 이름을
         * 그대로 둔다 - 이름 칸을 안 건드린 저장 요청이 이름을 지워버리면 안 된다.
         * 빈 문자열을 보내면 이름을 지운다.
         */
        String displayName
) {
}
