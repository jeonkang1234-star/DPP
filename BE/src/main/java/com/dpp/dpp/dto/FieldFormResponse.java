package com.dpp.dpp.dto;

import java.util.List;
import java.util.UUID;

/**
 * GET /me/field-form 응답. dppId가 null이면 아직 저장된 적 없는 새 폼(첫 임시저장 때
 * 새 product_model/dpp가 생성된다) - 이 경우 fields의 value는 전부 null이고 publicUuid도
 * null이다.
 *
 * publicUuid - 2026-08-18 강 요청("QR코드가 제 기능을 안함") 대응으로 추가. 발급 직후 QR을
 * 만들 때(FE issueDpp) 이 값으로 공개 조회 URL(/p/{publicUuid} -> GET /public/dpp/{publicUuid},
 * PublicPassportController)을 만든다 - dppId(내부 시퀀스 PK)를 그대로 노출하지 않는다.
 *
 * sections / codeOptions - 2026-08-19 추가. T0·T1 시딩으로 필드가 80 -> 361개가 되면서
 * 평평한 fields 배열만으로는 화면을 그릴 수 없게 됐다. 어느 섹션이 어떤 순서로 오는지와
 * Enum 필드의 선택지를 서버가 같이 내려준다 - 둘 다 전에는 FE 파일 안 상수였고, 필드가
 * 늘어날 때마다 그 상수가 조용히 어긋나는 구조였다.
 */
public record FieldFormResponse(
        Long dppId,
        UUID publicUuid,
        /** 사용자가 붙인 DPP 이름. 없으면 null - 화면이 SKU로 폴백한다. */
        String displayName,
        String domain,
        String status,
        double completeness,
        int filledCount,
        int requiredCount,
        List<FieldFormItemDto> fields,
        List<FieldFormSectionDto> sections,
        List<CodeOptionDto> codeOptions,
        // ── 2026-09-19 배터리 조건부 검증 ────────────────────────────────────
        /**
         * EU 2023/1542 제77조 배터리 여권 의무 대상 여부. TRUE=대상, FALSE=비대상,
         * null=판정 보류(분류 미입력) 또는 배터리 도메인이 아님.
         */
        Boolean passportRequired,
        /** 화면 배지 문구. 배터리가 아니면 null - 철강/섬유 화면엔 배지를 안 그린다. */
        String complianceTrackLabel,
        /** 발급을 막고 있는 필수 항목 라벨. 비어 있으면 발급 가능. */
        List<String> issueBlockers,
        /** 문서 파싱값과 어긋난 입력값(status=MISMATCH 포함 전체 비교 이력). */
        List<CrossCheckDto> crossChecks,
        /** 생애주기 단계별 진행 - 그 단계 귀속 필수 항목이 다 차면 그 단계가 끝난 것. */
        List<LifecycleStageDto> lifecycle
) {
}
