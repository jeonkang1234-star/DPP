package com.dpp.dpp.dto;

import java.util.List;

/**
 * GET /public/dpp/{publicUuid} 응답 - 로그인 없이 QR/링크로 조회하는 소비자·세관·시장감시
 * 기관용 "공개 여권" 뷰(2026-08-18, 강 요청 - 기존 QR은 순수 텍스트만 인코딩해서 스캔하면
 * 그냥 구글 검색으로 빠지는 버그였다. publicUuid는 dpp 생성 시점부터 항상 발급되는 값
 * (FieldFormService.createDraftDpp)이라 어느 DPP든 이 값으로 안전하게 조회 가능).
 *
 * issued=false면 아직 발급 전(DRAFT) DPP라 나머지 필드는 비워서 내려준다 - 초안 데이터를
 * 공개로 노출하지 않는다(PublicPassportService.NOT_ISSUED 참고).
 *
 * restrictedCount / tradeSecretCount - 2026-08-19 추가. 공개범위를 적용하고 나면 "이
 * 여권에 항목이 3개뿐인가?"라는 오해가 생긴다. 값은 안 주되 몇 개가 왜 빠졌는지는
 * 밝히는 게 맞다 - 배터리규정 Annex XIII도 접근 권한을 계층으로 나누지, 항목의 존재
 * 자체를 숨기지는 않는다.
 *
 * viewerRole / viewerLabel - 2026-08-21 강 요청("QR을 통해 볼 때도 개인 계정, 세관, EU가
 * 보는 결과가 다 달라야 함"). 같은 URL이라도 요청에 실린 토큰의 소속에 따라 보이는 항목이
 * 달라진다. 화면이 "지금 무슨 자격으로 보고 있는지"를 밝혀야 오해가 없어서 같이 내려준다.
 *   PUBLIC       : 토큰 없음 또는 일반/개인 계정 - 공개 항목만
 *   MANUFACTURER : 남의 DPP를 보는 제조사 - 공개 항목만(개인과 동일)
 *   OWNER        : 이 DPP를 발급한 조직 - 공개 + 제한 항목 (2026-08-23 추가)
 *   CUSTOMS      : 세관 - 공개 + 제한(정당한 이익) 항목
 *   EU_AUTHORITY : 시장감시당국 - 공개 + 제한 항목
 *   ADMIN        : 운영자 - EU와 동일
 * 어느 자격이든 영업비밀(TRADE_SECRET) 실측값은 저장 자체를 안 하므로 볼 수 없다.
 * OWNER는 org_type이 아니라 dpp.owner_org_id 일치로만 정해진다 - "제조사 계정"이라는
 * 사실만으로 남의 제품 제한 항목이 열리면 그건 공개범위가 아니라 구멍이다.
 */
public record PublicPassportResponse(
        boolean issued,
        String internalSku,
        String modelName,
        String domain,
        String issuedAtDate,
        List<PublicPassportFieldDto> fields,
        int restrictedCount,
        int tradeSecretCount,
        /** PUBLIC / CUSTOMS / EU_AUTHORITY / ADMIN */
        String viewerRole,
        /** 화면에 그대로 쓸 한글 라벨("일반 공개" 등). */
        String viewerLabel
) {
}
