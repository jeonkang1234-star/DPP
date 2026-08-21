package com.dpp.dpp.dto;

/**
 * 입력 폼의 섹션 1개(식별자·화학 성분·탄소 및 CBAM ...).
 *
 * 섹션 개념 자체는 requirement_field.section에 처음부터 있었지만, 입력 화면은 그걸 무시하고
 * 전체 필드를 한 덩어리로 그려왔다. 필드가 80개일 땐 그래도 봐줄 만했는데 361개가 되면
 * 스크롤 한 화면에 끝없는 입력칸만 나온다.
 *
 * 라벨을 FE 상수가 아니라 여기로 내려보내는 이유: FE(dppVals.js)가 섹션 코드->한글 이름
 * 매핑을 8칸짜리 하드코딩 map으로 갖고 있었는데, 섹션이 21개로 늘면 새로 생긴 13개는
 * 'HAZARD' 같은 영문 코드가 그대로 화면에 뜬다. 라벨은 code_master(FIELD_SECTION 그룹)에
 * 있으니 서버가 같이 내려주는 게 맞다.
 *
 * requiredCount/filledCount는 섹션 헤더에 "3/7" 같은 진행 표시를 붙이기 위한 것이다.
 */
public record FieldFormSectionDto(
        String section,
        String labelKo,
        String labelEn,
        int fieldCount,
        int requiredCount,
        int filledRequiredCount
) {
}
