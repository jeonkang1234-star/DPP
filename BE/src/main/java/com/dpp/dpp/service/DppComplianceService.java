package com.dpp.dpp.service;

import com.dpp.document.entity.Document;
import com.dpp.document.repository.DocumentRepository;
import com.dpp.dpp.dto.CrossCheckDto;
import com.dpp.dpp.dto.LifecycleStageDto;
import com.dpp.dpp.entity.DppFieldCrossCheck;
import com.dpp.dpp.entity.RequirementField;
import com.dpp.dpp.repository.DppFieldCrossCheckRepository;
import com.dpp.dpp.repository.DppQueryRepository;
import com.dpp.dpp.repository.RequirementFieldRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 배터리 여권 대상 판정 · 조건부 필수 · 생애주기 단계 · 문서/입력값 교차검증을 한 곳에서
 * 답하는 서비스(2026-09-19 강 요청).
 *
 * 판정 로직 자체는 전부 DB 쪽(V36 의 fn_battery_passport_required / fn_field_applies /
 * v_dpp_requirement_status / v_dpp_lifecycle_status)에 있다 - 완성도·미충족 목록·독촉이
 * 이미 그 뷰 하나를 단일 출처로 쓰고 있어서, 판정을 Java 로 따로 구현하면 두 곳이
 * 어긋나는 순간 "화면은 발급 가능이라는데 완성도는 80%" 같은 상태가 된다. 이 클래스는
 * 그 결과를 읽어서 DTO 로 옮기는 일만 한다.
 */
@Service
public class DppComplianceService {

    private static final Logger log = LoggerFactory.getLogger(DppComplianceService.class);

    /** 숫자 비교 허용 오차 - 파서가 "12.50"을, 사람이 "12.5"를 쓰는 정도는 같은 값으로 본다. */
    private static final BigDecimal NUMERIC_TOLERANCE = new BigDecimal("0.0001");

    /** 발급을 막는 항목을 화면에 몇 개까지 나열할지. 전부 나열하면 토스트가 화면을 덮는다. */
    private static final int BLOCKER_DISPLAY_LIMIT = 8;

    private final DppQueryRepository dppRepository;
    private final DppFieldCrossCheckRepository crossCheckRepository;
    private final RequirementFieldRepository requirementFieldRepository;
    private final DocumentRepository documentRepository;

    public DppComplianceService(DppQueryRepository dppRepository,
                                 DppFieldCrossCheckRepository crossCheckRepository,
                                 RequirementFieldRepository requirementFieldRepository,
                                 DocumentRepository documentRepository) {
        this.dppRepository = dppRepository;
        this.crossCheckRepository = crossCheckRepository;
        this.requirementFieldRepository = requirementFieldRepository;
        this.documentRepository = documentRepository;
    }

    // ── 1. 배터리 여권 대상 판정 ────────────────────────────────────────────

    /** TRUE=여권 의무 대상, FALSE=비대상, null=판정 보류(분류 미입력) 또는 배터리가 아님. */
    @Transactional(readOnly = true)
    public Boolean passportRequired(Long dppId) {
        if (dppId == null) {
            return null;
        }
        try {
            return dppRepository.findPassportRequired(dppId);
        } catch (RuntimeException e) {
            // 마이그레이션 전 DB 등에서 함수가 없을 수 있다 - 판정 보류로 떨어뜨리고
            // 화면은 전체 항목을 보여준다(빠뜨리는 쪽보다 더 요구하는 쪽이 안전).
            log.warn("dppId={} 여권 대상 판정 실패 - 보류로 처리: {}", dppId, e.getMessage());
            return null;
        }
    }

    /**
     * 화면 배지 문구. 배터리가 아니면 null 을 돌려서 배지를 아예 안 그리게 한다 -
     * 철강/섬유 화면에 "여권 비대상" 같은 말이 뜨면 안 된다.
     */
    public String trackLabel(String domain, Boolean passportRequired) {
        if (!"BATTERY".equals(domain)) {
            return null;
        }
        if (passportRequired == null) {
            return "분류 입력 전 · 전체 항목 표시";
        }
        return passportRequired ? "배터리 여권 대상" : "여권 비대상 · 축약 항목";
    }

    // ── 2. 조건부 적용 ──────────────────────────────────────────────────────

    /**
     * 이 DPP 에서 적용되는 필드 코드. dppId 가 없는 새 초안이거나 조회에 실패하면
     * null 을 돌려주고, 호출부는 "거르지 않는다"로 해석한다.
     */
    @Transactional(readOnly = true)
    public Set<String> applicableFieldCodes(Long dppId) {
        if (dppId == null) {
            return null;
        }
        try {
            List<String> codes = dppRepository.findApplicableFieldCodes(dppId);
            return codes == null || codes.isEmpty() ? null : Set.copyOf(codes);
        } catch (RuntimeException e) {
            log.warn("dppId={} 적용 필드 조회 실패 - 전체 표시로 처리: {}", dppId, e.getMessage());
            return null;
        }
    }

    // ── 3. 발급 게이트 ──────────────────────────────────────────────────────

    /**
     * 발급을 막고 있는 항목 라벨. 비어 있으면 필수 항목 기준으로는 발급 가능하다.
     * 재활용 처리 결과처럼 발급 이후 단계(9~12)에 귀속된 항목은 여기 안 들어온다.
     */
    @Transactional(readOnly = true)
    public List<String> issueBlockerLabels(Long dppId) {
        if (dppId == null) {
            return List.of();
        }
        try {
            return dppRepository.findIssueBlockers(dppId).stream()
                    .map(row -> String.valueOf(row[0]))
                    .toList();
        } catch (RuntimeException e) {
            log.warn("dppId={} 발급 차단 항목 조회 실패 - 차단 없음으로 처리: {}", dppId, e.getMessage());
            return List.of();
        }
    }

    /** 미충족 항목을 사람이 읽는 한 문장으로. 없으면 null. */
    public String blockerMessage(List<String> labels) {
        if (labels == null || labels.isEmpty()) {
            return null;
        }
        String head = labels.stream().limit(BLOCKER_DISPLAY_LIMIT).collect(Collectors.joining(", "));
        String more = labels.size() > BLOCKER_DISPLAY_LIMIT
                ? " 외 " + (labels.size() - BLOCKER_DISPLAY_LIMIT) + "건"
                : "";
        return "필수 항목이 비어 있어 발급할 수 없습니다: " + head + more;
    }

    // ── 4. 문서 ↔ 입력값 교차검증 ───────────────────────────────────────────

    /**
     * 파서가 뽑은 값과 이미 저장돼 있던 값을 비교해서 결과를 남긴다.
     *
     * 반환값 TRUE = 이 필드는 비어 있으니 파서 값으로 채워도 된다.
     * 반환값 FALSE = 이미 값이 있다(같든 다르든). 호출부는 값을 덮어쓰지 않는다 -
     *               사람이 친 값을 파서가 조용히 뒤집으면 안 된다는 기존 원칙 유지.
     *
     * 예외를 밖으로 던지지 않는다 - 교차검증 기록에 실패했다고 문서 업로드 자체가
     * 실패하면 안 된다(기존 fillIfEmpty 의 실패 처리 방침과 동일).
     */
    @Transactional
    public boolean recordCrossCheck(Long dppId, String fieldCode, String enteredValue,
                                     String parsedValue, Long documentId) {
        boolean empty = enteredValue == null || enteredValue.isBlank();
        if (parsedValue == null || parsedValue.isBlank()) {
            return empty;
        }
        if (empty) {
            // 비교 대상이 없다 - 검증이 아니라 그냥 채우는 것이므로 기록을 남기지 않는다.
            return true;
        }
        try {
            String status = valuesAgree(enteredValue, parsedValue) ? "MATCH" : "MISMATCH";
            DppFieldCrossCheck row = (documentId == null
                    ? crossCheckRepository.findByDppIdAndFieldCodeAndDocumentIdIsNull(dppId, fieldCode)
                    : crossCheckRepository.findByDppIdAndFieldCodeAndDocumentId(dppId, fieldCode, documentId))
                    .orElseGet(DppFieldCrossCheck::new);
            row.setDppId(dppId);
            row.setFieldCode(fieldCode);
            row.setDocumentId(documentId);
            row.setEnteredValue(cut(enteredValue));
            row.setParsedValue(cut(parsedValue));
            row.setStatus(status);
            // 값이 바뀌어 다시 비교됐으면 예전 정리 이력은 의미가 없다.
            row.setResolution(null);
            row.setResolvedBy(null);
            row.setResolvedAt(null);
            crossCheckRepository.save(row);
            if ("MISMATCH".equals(status)) {
                log.info("dppId={} field={} 교차검증 불일치 - 입력값='{}' 문서값='{}'",
                        dppId, fieldCode, cut(enteredValue), cut(parsedValue));
            }
        } catch (RuntimeException e) {
            log.warn("dppId={} field={} 교차검증 기록 실패(업로드는 계속): {}", dppId, fieldCode, e.getMessage());
        }
        return false;
    }

    /** 아직 정리되지 않은 불일치. 하나라도 있으면 발급을 막는다. */
    @Transactional(readOnly = true)
    public List<CrossCheckDto> openMismatches(Long dppId) {
        return crossChecks(dppId).stream()
                .filter(c -> "MISMATCH".equals(c.status()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CrossCheckDto> crossChecks(Long dppId) {
        if (dppId == null) {
            return List.of();
        }
        List<DppFieldCrossCheck> rows;
        try {
            rows = crossCheckRepository.findByDppIdOrderByUpdatedAtDesc(dppId);
        } catch (RuntimeException e) {
            log.warn("dppId={} 교차검증 조회 실패: {}", dppId, e.getMessage());
            return List.of();
        }
        if (rows.isEmpty()) {
            return List.of();
        }
        Map<String, String> labels = labelsOf(rows.stream().map(DppFieldCrossCheck::getFieldCode).toList());
        Map<Long, String> fileNames = fileNamesOf(rows.stream()
                .map(DppFieldCrossCheck::getDocumentId)
                .filter(java.util.Objects::nonNull)
                .toList());
        List<CrossCheckDto> out = new ArrayList<>();
        for (DppFieldCrossCheck r : rows) {
            out.add(new CrossCheckDto(
                    r.getCheckId(),
                    r.getFieldCode(),
                    labels.getOrDefault(r.getFieldCode(), r.getFieldCode()),
                    r.getEnteredValue(),
                    r.getParsedValue(),
                    r.getStatus(),
                    r.getDocumentId() == null ? null : fileNames.get(r.getDocumentId())));
        }
        return out;
    }

    /**
     * 불일치를 사람이 정리한다. KEEP_ENTERED=입력값을 그대로 둔다, USE_PARSED=문서 값을
     * 채택한다(실제 값 교체는 호출부가 한다 - 이 서비스는 dpp_field_value 를 쓰지 않는다).
     */
    @Transactional
    public Optional<DppFieldCrossCheck> resolve(Long checkId, String resolution, Long userId) {
        if (!"KEEP_ENTERED".equals(resolution) && !"USE_PARSED".equals(resolution)) {
            return Optional.empty();
        }
        return crossCheckRepository.findById(checkId).map(row -> {
            row.setStatus("RESOLVED");
            row.setResolution(resolution);
            row.setResolvedBy(userId);
            row.setResolvedAt(java.time.OffsetDateTime.now());
            return crossCheckRepository.save(row);
        });
    }

    // ── 5. 생애주기 단계 ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<LifecycleStageDto> lifecycle(Long dppId) {
        if (dppId == null) {
            return List.of();
        }
        return lifecycleByDpp(List.of(dppId)).getOrDefault(dppId, List.of());
    }

    /** DPP 여러 건의 생애주기를 한 번에 - 대시보드가 목록 전체에 대해 부른다. */
    @Transactional(readOnly = true)
    public Map<Long, List<LifecycleStageDto>> lifecycleByDpp(List<Long> dppIds) {
        if (dppIds == null || dppIds.isEmpty()) {
            return Map.of();
        }
        List<Object[]> rows;
        try {
            rows = dppRepository.findLifecycleStatus(dppIds);
        } catch (RuntimeException e) {
            log.warn("생애주기 조회 실패 - 빈 값으로 처리: {}", e.getMessage());
            return Map.of();
        }
        Map<Long, List<LifecycleStageDto>> out = new LinkedHashMap<>();
        for (Object[] r : rows) {
            Long dppId = ((Number) r[0]).longValue();
            out.computeIfAbsent(dppId, k -> new ArrayList<>()).add(new LifecycleStageDto(
                    ((Number) r[1]).intValue(),
                    String.valueOf(r[2]),
                    String.valueOf(r[3]),
                    Boolean.TRUE.equals(r[4]),
                    ((Number) r[5]).intValue(),
                    ((Number) r[6]).intValue()));
        }
        return out;
    }

    // ── 내부 헬퍼 ───────────────────────────────────────────────────────────

    /**
     * 두 값이 같은가. 숫자로 읽히면 숫자로(표기 차이 무시), 아니면 공백/대소문자만
     * 정리해서 문자열로 비교한다.
     */
    private boolean valuesAgree(String a, String b) {
        BigDecimal na = asNumber(a);
        BigDecimal nb = asNumber(b);
        if (na != null && nb != null) {
            return na.subtract(nb).abs().compareTo(NUMERIC_TOLERANCE) <= 0;
        }
        return normalize(a).equals(normalize(b));
    }

    private static String normalize(String v) {
        return v == null ? "" : v.trim().replaceAll("\\s+", " ").toUpperCase();
    }

    private static BigDecimal asNumber(String v) {
        if (v == null) {
            return null;
        }
        String cleaned = v.trim().replace(",", "");
        // "12.5 kWh" 처럼 단위가 붙어 오는 경우가 많다 - 숫자 부분만 떼어 본다.
        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("^[^0-9+-]*([+-]?[0-9]+(?:\\.[0-9]+)?)").matcher(cleaned);
        if (!m.find()) {
            return null;
        }
        try {
            return new BigDecimal(m.group(1));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String cut(String v) {
        if (v == null) {
            return null;
        }
        String t = v.trim();
        return t.length() > 500 ? t.substring(0, 500) : t;
    }

    private Map<String, String> labelsOf(Collection<String> fieldCodes) {
        if (fieldCodes.isEmpty()) {
            return Map.of();
        }
        Map<String, String> out = new HashMap<>();
        for (RequirementField f : requirementFieldRepository.findByFieldCodeInAndActiveTrue(fieldCodes)) {
            out.put(f.getFieldCode(), f.getLabelKo());
        }
        return out;
    }

    private Map<Long, String> fileNamesOf(Collection<Long> documentIds) {
        if (documentIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, String> out = new HashMap<>();
        for (Long id : documentIds) {
            if (out.containsKey(id)) {
                continue;
            }
            try {
                Optional<Document> doc = documentRepository.findById(id);
                doc.ifPresent(d -> out.put(id, d.getFileName()));
            } catch (RuntimeException e) {
                log.debug("documentId={} 파일명 조회 실패: {}", id, e.getMessage());
            }
        }
        return out;
    }
}
