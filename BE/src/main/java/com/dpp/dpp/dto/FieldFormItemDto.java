package com.dpp.dpp.dto;

/**
 * 제조사 기본정보 입력 폼의 필드 1개.
 *
 * value는 기존에 저장된 값(없으면 null - 목데이터처럼 예시값을 채우지 않는다).
 *
 * 2026-08-19 확장: 필드가 80개에서 361개로 늘면서, "필드코드 + 라벨 + 필수여부"만으로는
 * 화면을 그릴 수 없게 됐다. FE가 알아야 하는 것이 세 가지 더 생겼다.
 *   1) dataType/codeGroup - 300개를 전부 자유 텍스트 한 줄로 받으면 "코일"과 "Coil"과
 *      "2026/08/19"와 "2026-08-19"가 섞여 들어온다. 타입별로 위젯을 나눠 그리기 위한 것.
 *   2) dataSource - "문서에서 자동으로 채워지는 칸"과 "직접 쳐야 하는 칸"의 구분.
 *      전에는 FE가 필드코드 26개를 손으로 나열해서 이 구분을 흉내냈다(makerVals.js
 *      AUTO_FILL_FIELD_CODES). 필드가 300개면 그 목록은 반드시 어긋난다.
 *   3) tier/legalBasis/t1Condition/disclosureScope - "이 칸을 왜 받는가". 제조사 입장에서
 *      법정필수(T0)와 우리가 그냥 받는 항목(T3)은 채우는 우선순위가 완전히 다른데,
 *      지금까지 화면에서 그 둘이 구분되지 않았다.
 */
public record FieldFormItemDto(
        String fieldCode,
        String section,
        String labelKo,
        String labelEn,
        String unit,
        String helpText,
        boolean required,
        String value,
        /** STRING/NUMBER/BOOLEAN/DATE/DATETIME/CODE/TEXT/JSON/URL */
        String dataType,
        /** code_master.code_group. null이면 선택지 없이 자유 입력. */
        String codeGroup,
        /** PARSER / MANUAL / SYSTEM */
        String dataSource,
        /** T0~T4. null이면 아직 분류표와 매칭되지 않은 기존 필드. */
        String tier,
        /** PUBLIC / RESTRICTED / TRADE_SECRET */
        String disclosureScope,
        /** 근거 법령·조항. 화면에서는 접힌 툴팁으로만 보여준다. */
        String legalBasis,
        /** T1일 때 의무가 발동하는 조건. */
        String t1Condition
) {
}
