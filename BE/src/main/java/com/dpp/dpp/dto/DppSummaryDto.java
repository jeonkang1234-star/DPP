package com.dpp.dpp.dto;

import java.util.UUID;

/**
 * GET /me/dashboard 응답 안의 DPP 1건. completeness는 fn_recalc_completeness 직후 값(최신).
 * serialNumber/issuedAtDate는 "제품 조회" 탭의 Lot·발급일 컬럼용 - 둘 다 아직 값이 없을 수
 * 있다(serial_number는 선택 컬럼, issued_at은 실제 발급 전까지 NULL). 값이 없으면 null을
 * 그대로 내려보내고 FE에서 '—'로 표시한다 - 가짜 값으로 채우지 않는다.
 *
 * needsPartnerInput - 2026-08-18 강 요청: "협력사 관리" 화면에서 초대가 필요한(=협력사가
 * 채워야 할 필드가 비어있는) DPP만 보여줘야 하는데, missingFields(아래)는 대시보드 "대기작업
 * 큐" 표시용으로 전체 DPP를 합쳐 상위 10건만 담는 값이라 이 판정에 쓰기엔 부정확하다(제조사
 * 담당 필드가 많은 DPP가 그 10건을 다 차지하면 협력사 담당 필드가 있는 DPP가 응답에서 아예
 * 안 보일 수 있었음 - 실제로 이 버그로 협력사 관리 화면이 텅 비어 보이는 문제가 있었다).
 * 그래서 DppQueryRepository.findDppIdsNeedingPartnerInput으로 캡 없이 별도 계산해 DPP마다
 * 정확한 boolean으로 내려준다.
 */
public record DppSummaryDto(
        Long dppId,
        UUID publicUuid,
        String internalSku,
        String modelName,
        String domain,
        String status,
        int lifecycleStage,
        double completeness,
        int filledCount,
        int requiredCount,
        String serialNumber,
        String issuedAtDate,
        boolean needsPartnerInput
) {
}
