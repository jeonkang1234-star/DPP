package com.dpp.dpp.dto;

/**
 * DPP 생애주기 단계 1개의 진행 상태(v_dpp_lifecycle_status, V36).
 *
 * "그 단계에 귀속된 필수 항목이 다 채워지면 그 단계가 끝난 것"이라는 규칙을 그대로
 * 숫자로 내려준다(2026-09-19 강 요청 5번). requiredCount=0 인 단계는 이 도메인에서
 * 추적할 항목이 아예 없다는 뜻이라 화면에서 '해당 없음'으로 둔다 - 0/0 을 100% 로
 * 올리면 아무 일도 안 일어났는데 완료로 보인다.
 */
public record LifecycleStageDto(
        int stageNo,
        String stageCode,
        String stageName,
        /** 발급 전에 채워져야 하는 단계인가(1~8). false면 발급 이후에 쌓인다. */
        boolean issueGate,
        int requiredCount,
        int filledCount
) {
}
