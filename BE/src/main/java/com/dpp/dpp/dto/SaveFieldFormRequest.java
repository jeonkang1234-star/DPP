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
        Map<String, String> values
) {
}
