package com.dpp.dpp.dto;

import java.util.List;
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
        /** 사용자가 붙인 DPP 이름(내부 식별용, V27). 없으면 null - 화면이 SKU로 폴백한다. */
        String displayName,
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
        boolean needsPartnerInput,
        // ── 2026-09-19 배터리 조건부 검증 / 생애주기 ──────────────────────
        /**
         * 생애주기 단계별 진행(v_dpp_lifecycle_status, V36). 그 단계에 귀속된 필수 항목이
         * 다 채워지면 그 단계가 끝난 것으로 본다 - 예전엔 FE 가 "미충족 필드의 책임 역할"로
         * 단계를 역산했는데(dppVals.js), 그건 원자재 공급사 담당 필드가 하나도 없는 DPP 를
         * 무조건 1단계 완료로 보이게 만드는 추정이었다.
         */
        List<LifecycleStageDto> lifecycle,
        /** 배터리 여권 의무 대상 여부. 배터리가 아니거나 분류 미입력이면 null. */
        Boolean passportRequired,
        /** 화면 배지 문구("배터리 여권 대상" 등). 배터리가 아니면 null. */
        String complianceTrack,
        /** 문서 파싱값과 어긋난 입력값 건수. 0보다 크면 발급이 막힌다. */
        int crossCheckMismatchCount
) {
}
