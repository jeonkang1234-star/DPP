package com.dpp.customs.dto;

/**
 * 통관 상세의 "EU 적합성 선언서 · CE 마크" 근거 한 줄(2026-10-04 강 요청).
 *
 * 예전엔 "적합성 요건 충족" 한 줄로 끝나서, 세관 입장에서 정확히 어떤 규정의 어떤 기준을
 * 얼마만큼 넘겼는지 알 수 없었다. 이제 규정(regulation)·조항(reference)·항목(item)·
 * 법정 기준(requirement)·실측/신고값(actual)·판정(verdict)을 한 줄씩 내려준다.
 *
 * verdict: PASS(기준 충족) / FAIL(기준 미달) / INFO(신고·공개 의무만 있고 수치 한계 없음) /
 *          NA(해당 없음 - 예: 코발트를 쓰지 않는 LFP 배터리의 코발트 재생원료 기준).
 * margin: 기준 대비 여유(예: "+42 MPa (+12.0%)"). 계산할 수 없으면 null.
 */
public record CustomsComplianceItemDto(
        String regulation,
        String reference,
        String item,
        String requirement,
        String actual,
        String margin,
        String verdict,
        String note
) {
}
