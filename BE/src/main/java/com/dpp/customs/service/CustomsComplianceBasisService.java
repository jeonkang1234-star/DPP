package com.dpp.customs.service;

import com.dpp.customs.dto.CustomsComplianceItemDto;
import com.dpp.customs.repository.CustomsCaseReadRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 통관 상세 "EU 적합성 선언서 · CE 마크" 카드의 규정별 근거(2026-10-04 강 요청).
 *
 * 예전 카드는 "적합성 요건 충족 / 문서 승인 완료 · n건"이 전부여서, 세관이 "정확히 어떤
 * 규정에서 어떤 수준을 넘겼는지"를 볼 수 없었다. 이 서비스는 DPP에 실제로 저장된 값
 * (dpp_field_value), 회로별 최신 ZKP 증명(zkp_proof.public_signals), SVHC 조성표를 읽어서
 * 규정·조항·법정 기준·실측(신고)값·기준 대비 여유·판정을 한 줄씩 만든다.
 *
 * 원칙
 *  - 값이 없는 항목은 지어내지 않는다 - 행 자체를 만들지 않는다.
 *  - 영업비밀(TRADE_SECRET) 항목은 저장값이 '충족' 토큰뿐이라 "ZKP 증명으로 기준 충족
 *    (실측값 비공개)"로 표시한다 - 실측값을 추정해서 쓰지 않는다.
 *  - 법정 수치 한계가 없거나 아직 시행 전인 의무(배터리 탄소발자국 성능등급, 재생원료
 *    최소 함유율의 2031년 의무 등)는 그 사실을 note에 그대로 적는다.
 *  - 어느 한 줄 계산이 실패해도 통관 상세 전체가 죽지 않게, 도메인별 블록마다 예외를 삼킨다.
 */
@Service
public class CustomsComplianceBasisService {

    private static final Logger log = LoggerFactory.getLogger(CustomsComplianceBasisService.class);
    private static final String PASS = "PASS", FAIL = "FAIL", INFO = "INFO", NA = "NA";
    private static final String TRADE_SECRET_TOKEN = "충족";

    private static final String ESPR = "ESPR (EU) 2024/1781";
    private static final String REACH = "REACH (EC) No 1907/2006";
    private static final String CE = "CE 마킹 - (EC) No 765/2008 · Decision 768/2008/EC";
    private static final String BATT = "배터리 규정 (EU) 2023/1542";
    private static final String CBAM = "CBAM (EU) 2023/956";
    private static final String TEXTILE_LABEL = "섬유제품 표시규정 (EU) No 1007/2011";
    private static final String PPWR = "포장재 규정(PPWR) (EU) 2025/40";

    private final CustomsCaseReadRepository repo;
    private final ObjectMapper objectMapper;

    public CustomsComplianceBasisService(CustomsCaseReadRepository repo, ObjectMapper objectMapper) {
        this.repo = repo;
        this.objectMapper = objectMapper;
    }

    public List<CustomsComplianceItemDto> build(Long dppId, long approvedDocCount, long techFileCount) {
        List<CustomsComplianceItemDto> out = new ArrayList<>();
        if (dppId == null) {
            return out;
        }
        String domain = null;
        Double completeness = null;
        try {
            List<Object[]> rows = repo.findDomainAndCompleteness(dppId);
            if (!rows.isEmpty() && rows.get(0) != null && rows.get(0).length >= 2) {
                domain = rows.get(0)[0] == null ? null : String.valueOf(rows.get(0)[0]);
                completeness = num(rows.get(0)[1] == null ? null : String.valueOf(rows.get(0)[1]));
            }
        } catch (Exception e) {
            log.warn("dppId={} 도메인 조회 실패 - 적합성 근거 생략: {}", dppId, e.getMessage());
            return out;
        }

        Map<String, String> v = new HashMap<>();
        Map<String, Map<String, Object>> proofs = new HashMap<>();
        Map<String, String> proofStatus = new HashMap<>();
        try {
            for (Object[] r : repo.findFieldValues(dppId)) {
                if (r != null && r.length >= 2 && r[0] != null && r[1] != null) {
                    v.put(String.valueOf(r[0]), String.valueOf(r[1]).trim());
                }
            }
            for (Object[] r : repo.findLatestProofsByCircuit(dppId)) {
                if (r == null || r.length < 3 || r[0] == null) continue;
                String circuit = String.valueOf(r[0]);
                proofStatus.put(circuit, r[1] == null ? "" : String.valueOf(r[1]));
                Map<String, Object> signals = Map.of();
                if (r[2] != null) {
                    try {
                        signals = objectMapper.readValue(String.valueOf(r[2]), new TypeReference<Map<String, Object>>() {});
                    } catch (Exception ignore) {
                        // public_signals 모양이 다르면 그 증명은 상태만 쓴다
                    }
                }
                proofs.put(circuit, signals);
            }
        } catch (Exception e) {
            log.warn("dppId={} 입력값/증명 조회 실패: {}", dppId, e.getMessage());
        }

        // ── 공통: ESPR / CE / REACH ────────────────────────────────────────
        final Double comp = completeness;
        safe(dppId, "COMMON", () -> {
            if (comp != null) {
                boolean ok = comp >= 100.0;
                out.add(new CustomsComplianceItemDto(ESPR, "Art. 9·10, Annex III",
                        "DPP 필수 정보요건 충족률", "= 100 %", fmt(comp, 1) + " %",
                        null, ok ? PASS : FAIL, ok ? null : "필수 항목 일부 미입력"));
            }
            out.add(new CustomsComplianceItemDto(CE, "Reg. 765/2008 Art. 30 · Dec. 768/2008 Annex III",
                    "EU 적합성 선언서(DoC) 승인", "≥ 1 건", approvedDocCount + " 건", null,
                    approvedDocCount > 0 ? PASS : FAIL, null));
            out.add(new CustomsComplianceItemDto(CE, "Dec. 768/2008 Annex II Module A",
                    "기술문서(Technical File) 승인", "≥ 1 건", techFileCount + " 건", null,
                    techFileCount > 0 ? PASS : FAIL, null));
            addSvhc(out, dppId, v);
        });

        if ("STEEL".equals(domain)) {
            safe(dppId, domain, () -> addSteel(out, v, proofs, proofStatus));
        } else if ("BATTERY".equals(domain)) {
            safe(dppId, domain, () -> addBattery(out, v, proofs, proofStatus));
        } else if ("TEXTILE".equals(domain)) {
            safe(dppId, domain, () -> addTextile(out, v, proofs, proofStatus));
        }
        safe(dppId, "PACKAGING", () -> addPackaging(out, v));
        return out;
    }

    // ── 공통: REACH SVHC ─────────────────────────────────────────────────────
    private void addSvhc(List<CustomsComplianceItemDto> out, Long dppId, Map<String, String> v) {
        Double max = null;
        String maxName = null;
        for (Map.Entry<String, String> e : v.entrySet()) {
            String k = e.getKey();
            if (!k.startsWith("SVHC") || !k.contains("CONCENTRATION_PCT")) continue;
            Double d = num(e.getValue());
            if (d == null) continue;
            if (max == null || d > max) {
                max = d;
                String idx = k.replace("SVHC_CONCENTRATION_PCT_", "").replace("SVHC_", "").replace("_CONCENTRATION_PCT", "");
                maxName = firstNonBlank(v.get("SVHC_SUBSTANCE_NAME_" + idx), v.get("SVHC_" + idx + "_SUBSTANCE_NAME"), v.get("SVHC_SUBSTANCE_NAME"));
            }
        }
        Double comp = num(repo.findMaxSvhcRate(dppId));
        if (comp != null && (max == null || comp > max)) {
            max = comp;
            maxName = null;
        }
        if (max == null) {
            String flag = v.get("SVHC_OVER_THRESHOLD");
            if (flag == null) return;
            boolean over = "true".equalsIgnoreCase(flag);
            out.add(new CustomsComplianceItemDto(REACH, "Art. 33 · Annex XIV 후보물질",
                    "SVHC 0.1 % w/w 초과 함유 여부", "≤ 0.1 % w/w", over ? "초과 신고" : "초과 없음",
                    null, over ? communicated(v) : PASS, over ? art33Note(v) : null));
            return;
        }
        boolean ok = max <= 0.1;
        String actual = max == 0 ? "0 % w/w (불검출)"
                : fmt(max, 3) + " % w/w" + (maxName != null && !maxName.isBlank() ? " (" + maxName + ")" : "");
        out.add(new CustomsComplianceItemDto(REACH, "Art. 33 · Annex XIV 후보물질",
                "SVHC 최대 함유율", "≤ 0.1 % w/w", actual,
                ok && max > 0 ? "기준의 " + fmt(max / 0.1 * 100.0, 0) + " % 수준" : null,
                ok ? PASS : communicated(v), ok ? null : art33Note(v)));
    }

    private String communicated(Map<String, String> v) {
        return "true".equalsIgnoreCase(v.get("REACH_ARTICLE_33_COMMUNICATION_CHECK")) ? INFO : FAIL;
    }

    private String art33Note(Map<String, String> v) {
        return "true".equalsIgnoreCase(v.get("REACH_ARTICLE_33_COMMUNICATION_CHECK"))
                ? "0.1 % 초과 - Art. 33 수령자 정보제공 이행 확인(함유 자체는 금지 아님)"
                : "0.1 % 초과 - Art. 33 정보제공 이행 기록 없음";
    }

    // ── 철강 ────────────────────────────────────────────────────────────────
    private void addSteel(List<CustomsComplianceItemDto> out, Map<String, String> v,
                          Map<String, Map<String, Object>> proofs, Map<String, String> status) {
        String std = firstNonBlank(v.get("STEEL_STANDARD"), "제품 규격");
        String grade = v.get("STEEL_GRADE");
        String reg = std + (grade != null && !grade.isBlank() ? " · " + grade : "");
        String ref = "CE 조화표준 (CPR (EU) No 305/2011)";

        // 기계적 성질 - 실측값이 공개 항목으로 저장돼 있다
        lowerBound(out, reg, ref, "항복강도 ReH", v.get("YIELD_STRENGTH_ACTUAL_MPA"), v.get("YIELD_STRENGTH_MIN_MPA"), "MPa", 0);
        Double ts = num(v.get("TENSILE_STRENGTH_ACTUAL_MPA"));
        Double tsMin = num(v.get("TENSILE_STRENGTH_MIN_MPA"));
        Double tsMax = num(v.get("TENSILE_STRENGTH_MAX_MPA"));
        if (ts != null && tsMin != null && tsMax != null) {
            boolean ok = ts >= tsMin && ts <= tsMax;
            double room = Math.min(ts - tsMin, tsMax - ts);
            out.add(new CustomsComplianceItemDto(reg, ref, "인장강도 Rm",
                    fmt(tsMin, 0) + " ~ " + fmt(tsMax, 0) + " MPa", fmt(ts, 0) + " MPa",
                    ok ? "상·하한까지 최소 " + fmt(room, 0) + " MPa" : null, ok ? PASS : FAIL, null));
        } else if (isSecret(v.get("TENSILE_STRENGTH_ACTUAL_MPA"))) {
            out.add(secretRow(reg, ref, "인장강도 Rm", rangeText(tsMin, tsMax, "MPa")));
        }
        lowerBound(out, reg, ref, "연신율 A", v.get("ELONGATION_ACTUAL_PCT"), v.get("ELONGATION_MIN_PCT"), "%", 0);

        // 화학성분 - 실측값은 영업비밀이라 ZKP 공개 신호(상한)와 판정만 쓴다
        Map<String, Object> mill = proofs.get("steel-mill-check");
        if (mill != null) {
            String st = status.getOrDefault("steel-mill-check", "");
            Map<String, Object> limits = asMap(mill.get("limits"));
            Map<String, Object> verdicts = asMap(mill.get("verdicts"));
            for (Map.Entry<String, Object> e : limits.entrySet()) {
                String k = e.getKey();
                if (k.endsWith("_min") || k.endsWith("_low") || k.endsWith("_high") || k.endsWith("_max")) continue;
                Double lim = num(String.valueOf(e.getValue()));
                if (lim == null) continue;
                if (lim > 5 && lim == Math.floor(lim)) lim = lim / 1000.0; // 실업로드 경로는 x1000 정수
                Object vd = verdicts.containsKey(k) ? verdicts.get(k) : verdicts.get("chemistry");
                boolean ok = vd != null ? Boolean.TRUE.equals(vd) : ("VERIFIED".equals(st) || "MOCK".equals(st));
                out.add(new CustomsComplianceItemDto(reg, ref + " · ZKP 증명", "화학성분 " + k,
                        "≤ " + fmt(lim, 3) + " wt%", "실측값 비공개 (영지식 증명)", null, ok ? PASS : FAIL,
                        "steel-mill-check 회로 판정"));
            }
            Double kv = num(String.valueOf(limits.get("KV_min")));
            if (kv != null) {
                Object vd = verdicts.get("KV");
                boolean ok = vd != null ? Boolean.TRUE.equals(vd) : "VERIFIED".equals(st);
                out.add(new CustomsComplianceItemDto(reg, ref + " · ZKP 증명", "충격흡수에너지 KV",
                        "≥ " + fmt(kv, 0) + " J", "실측값 비공개 (영지식 증명)", null, ok ? PASS : FAIL, null));
            }
        }

        // CBAM
        Double direct = num(v.get("CBAM_DIRECT_EMISSIONS_TCO2E_PER_T"));
        Double indirect = num(v.get("CBAM_INDIRECT_EMISSIONS_TCO2E_PER_T"));
        if (direct != null || indirect != null || v.containsKey("CBAM_APPLICABLE")) {
            boolean applicable = !"false".equalsIgnoreCase(v.get("CBAM_APPLICABLE"));
            if (direct != null && indirect != null) {
                double total = direct + indirect;
                Double actualRatio = num(v.get("CBAM_ACTUAL_DATA_USED_RATIO_PCT"));
                out.add(new CustomsComplianceItemDto(CBAM, "Art. 7 · Annex IV",
                        "내재배출량 신고 (직접 + 간접)", "신고 의무 (수치 상한 없음)",
                        fmt(direct, 3) + " + " + fmt(indirect, 3) + " = " + fmt(total, 3) + " tCO2e/t", null, PASS,
                        actualRatio != null ? "실측 데이터 사용 비율 " + fmt(actualRatio, 1) + " %" : null));
            } else if (isSecret(v.get("CBAM_DIRECT_EMISSIONS_TCO2E_PER_T"))) {
                out.add(secretRow(CBAM, "Art. 7 · Annex IV", "내재배출량 신고", "신고 의무"));
            }
            String verified = v.get("CBAM_EMISSIONS_VERIFIED_BY_THIRD_PARTY");
            if (verified != null) {
                boolean ok = "true".equalsIgnoreCase(verified);
                out.add(new CustomsComplianceItemDto(CBAM, "Art. 8 · Annex VI", "배출량 제3자 검증",
                        "인정 검증기관 검증", ok ? firstNonBlank(v.get("CBAM_VERIFICATION_BODY_NAME"), "검증 완료") : "미검증",
                        null, ok ? PASS : FAIL, null));
            }
            Map<String, Object> cbam = proofs.get("cbam-check");
            if (cbam != null) {
                Double dm = num(String.valueOf(cbam.get("deMinimisT")));
                Object obligated = cbam.get("obligated") != null ? cbam.get("obligated") : cbam.get("overDeMinimis");
                out.add(new CustomsComplianceItemDto(CBAM, "Art. 2a (2025 간소화 개정)", "연간 수입량 de minimis",
                        "> " + fmt(dm == null ? 50.0 : dm, 0) + " t 이면 신고 의무",
                        Boolean.TRUE.equals(obligated) ? "기준 초과 → 신고 대상" : "기준 이하 → 면제",
                        null, applicable ? INFO : NA, "수입량 자체는 ZKP로 비공개 증명"));
            }
        }
        Double scrap = num(v.get("RECYCLED_SCRAP_RATE"));
        if (scrap != null) {
            out.add(new CustomsComplianceItemDto(ESPR, "Annex I (재생원료 함유량 정보)", "재생 스크랩 투입률",
                    "공개 의무 (법정 하한 없음)", fmt(scrap, 1) + " %", null, INFO, null));
        }
    }

    // ── 배터리 ──────────────────────────────────────────────────────────────
    private void addBattery(List<CustomsComplianceItemDto> out, Map<String, String> v,
                            Map<String, Map<String, Object>> proofs, Map<String, String> status) {
        // Art. 8 재생원료 최소 함유율 - 2031-08-18부터 의무, 그 전엔 문서화·신고 의무
        String note8 = "최소 함유율은 2031-08-18부터 의무 · 현재는 신고 의무";
        recycled(out, v, "RECYCLED_COBALT_RATE", "코발트(Co) 재생원료 함유율", 16.0, note8);
        recycled(out, v, "RECYCLED_LITHIUM_RATE", "리튬(Li) 재생원료 함유율", 6.0, note8);
        recycled(out, v, "RECYCLED_NICKEL_RATE", "니켈(Ni) 재생원료 함유율", 6.0, note8);
        recycled(out, v, "RECYCLED_LEAD_RATE", "납(Pb) 재생원료 함유율", 85.0, note8);

        // Art. 7 탄소발자국
        Double pcf = num(v.get("PCF_VALUE"));
        String required = v.get("BATTERY_CARBON_DECLARATION_REQUIRED");
        if (pcf != null) {
            boolean req = !"false".equalsIgnoreCase(required);
            out.add(new CustomsComplianceItemDto(BATT, "Art. 7(1) · Annex II", "탄소발자국 선언",
                    req ? "선언 의무 (성능등급·최대한계는 위임법 채택 전)" : "선언 의무 대상 아님",
                    fmt(pcf, 1) + " kgCO2e/kWh", null, req ? PASS : NA, null));
        }

        // Annex XII Part C 물질 회수율(2027-12-31까지 달성 목표)
        String noteXII = "2027-12-31 목표치 기준";
        lowerBoundPct(out, BATT, "Annex XII Part C", "코발트(Co) 물질 회수율", v.get("RECYCLED_COBALT_RECOVERY_RATE"), 90.0, noteXII);
        lowerBoundPct(out, BATT, "Annex XII Part C", "구리(Cu) 물질 회수율", v.get("RECYCLED_COPPER_RECOVERY_RATE"), 90.0, noteXII);
        lowerBoundPct(out, BATT, "Annex XII Part C", "리튬(Li) 물질 회수율", v.get("RECYCLED_LITHIUM_RECOVERY_RATE"), 50.0, noteXII);
        lowerBoundPct(out, BATT, "Annex XII Part B", "재활용 효율 (리튬계)", v.get("OVERALL_RECYCLING_EFFICIENCY"), 65.0, "2025-12-31 목표치 기준");

        // ZKP 증명 결과(실측값 비공개 경로) - 공개값이 없을 때만 보충
        Map<String, Object> bc = proofs.get("battery-check");
        if (bc != null && num(v.get("RECYCLED_COBALT_RATE")) == null && num(v.get("RECYCLED_LITHIUM_RATE")) == null) {
            Map<String, Object> verdicts = asMap(bc.get("verdicts"));
            String st = status.getOrDefault("battery-check", "");
            boolean ok = verdicts.isEmpty() ? "VERIFIED".equals(st) : verdicts.values().stream().allMatch(Boolean.TRUE::equals);
            out.add(new CustomsComplianceItemDto(BATT, "Art. 8 · ZKP 증명", "재생원료 함유율 (Co/Li/Ni)",
                    "Co ≥ 16 % · Li ≥ 6 % · Ni ≥ 6 %", "실측값 비공개 (영지식 증명)", null, ok ? PASS : FAIL, note8));
        }
        String dd = v.get("OECD_DUE_DILIGENCE_GUIDANCE_ALIGNED");
        if (dd != null) {
            boolean ok = "true".equalsIgnoreCase(dd);
            out.add(new CustomsComplianceItemDto(BATT, "Art. 48~52", "공급망 실사 (OECD 가이던스 정합)",
                    "실사 정책 수립·이행", ok ? "정합" : "미정합", null, ok ? PASS : INFO,
                    "실사 의무 적용 시점은 2027-08-18로 연기됨"));
        }
    }

    // ── 섬유 ────────────────────────────────────────────────────────────────
    private void addTextile(List<CustomsComplianceItemDto> out, Map<String, String> v,
                            Map<String, Map<String, Object>> proofs, Map<String, String> status) {
        double sum = 0;
        int n = 0;
        StringBuilder parts = new StringBuilder();
        for (int i = 1; i <= 3; i++) {
            Double p = num(v.get("SHELL_MATERIAL_" + i + "_PERCENTAGE_PCT"));
            if (p == null) continue;
            sum += p;
            n++;
            if (parts.length() > 0) parts.append(" + ");
            parts.append(firstNonBlank(v.get("SHELL_MATERIAL_" + i + "_TYPE"), "소재" + i)).append(' ').append(fmt(p, 0)).append('%');
        }
        Map<String, Object> fiber = proofs.get("fiber-sum-check");
        if (n > 0) {
            boolean ok = Math.abs(sum - 100.0) <= 3.0; // Art. 20 제조 공차 3 %
            out.add(new CustomsComplianceItemDto(TEXTILE_LABEL, "Art. 9 · Art. 20 (공차 3 %)", "섬유 혼용률 표시",
                    "합계 100 % (± 3 %)", parts + " = " + fmt(sum, 1) + " %", null, ok ? PASS : FAIL,
                    fiber != null ? "케어라벨 ZKP(fiber-sum-check) " + ("REJECTED".equals(status.get("fiber-sum-check")) ? "불일치" : "일치") : null));
        } else if (fiber != null) {
            boolean ok = !"REJECTED".equals(status.get("fiber-sum-check"));
            out.add(new CustomsComplianceItemDto(TEXTILE_LABEL, "Art. 9 · ZKP 증명", "섬유 혼용률 합계",
                    "99.5 ~ 100.5 %", "실측값 비공개 (영지식 증명)", null, ok ? PASS : FAIL, null));
        }
        absent(out, v, "AZO_DYES_PRESENCE", REACH, "Annex XVII Entry 43", "아조염료(발암성 방향족아민)", "각 아민 ≤ 30 mg/kg");
        absent(out, v, "FORMALDEHYDE_PRESENCE", REACH, "Annex XVII Entry 72", "폼알데하이드 (CMR 물질)", "≤ 75 mg/kg");
        absent(out, v, "PHTHALATES_PRESENCE", REACH, "Annex XVII Entry 51", "프탈레이트 (DEHP·DBP·BBP·DIBP)", "합계 ≤ 0.1 % w/w");
        absent(out, v, "PFAS_PRESENCE", REACH, "Annex XVII Entry 79 (Reg. (EU) 2024/2462)", "PFHxA 및 관련물질", "≤ 25 ppb (PFHxA)");
        Map<String, Object> oeko = proofs.get("oekotex-check");
        if (oeko != null) {
            boolean ok = !"REJECTED".equals(status.get("oekotex-check"));
            out.add(new CustomsComplianceItemDto("OEKO-TEX STANDARD 100 (자율 인증)", "pH 기준 · ZKP 증명", "pH",
                    "4.0 ~ 7.5", "실측값 비공개 (영지식 증명)", null, ok ? PASS : FAIL,
                    firstNonBlank(v.get("OEKOTEX_CERT_NO"), null) != null ? "인증번호 " + v.get("OEKOTEX_CERT_NO") : null));
        }
        Double rec = num(v.get("RECYCLED_FIBER_RATE"));
        if (rec != null) {
            out.add(new CustomsComplianceItemDto(ESPR, "Annex I (재생원료 함유량 정보)", "재생섬유 함유율",
                    "공개 의무 (법정 하한 없음)", fmt(rec, 1) + " %", null, INFO, null));
        }
    }

    // ── 포장재 중금속 (도메인 공통, 값이 있을 때만) ─────────────────────────────
    private void addPackaging(List<CustomsComplianceItemDto> out, Map<String, String> v) {
        Double pb = num(v.get("PACKAGING_LEAD_PB_CONCENTRATION_PPM"));
        Double cd = num(v.get("PACKAGING_CADMIUM_CD_CONCENTRATION_PPM"));
        if (pb == null && cd == null) return;
        double total = (pb == null ? 0 : pb) + (cd == null ? 0 : cd);
        boolean ok = total <= 100.0;
        out.add(new CustomsComplianceItemDto(PPWR, "Art. 5(4)", "포장재 중금속 (Pb+Cd+Hg+Cr⁶⁺)",
                "합계 ≤ 100 mg/kg", "Pb " + fmt(pb == null ? 0 : pb, 0) + " + Cd " + fmt(cd == null ? 0 : cd, 0) + " = " + fmt(total, 0) + " mg/kg",
                ok ? margin(100.0 - total, 100.0, "mg/kg", 0) : null, ok ? PASS : FAIL, "Hg·Cr⁶⁺ 실측값 미입력"));
    }

    // ── helpers ─────────────────────────────────────────────────────────────
    private void lowerBound(List<CustomsComplianceItemDto> out, String reg, String ref, String item,
                            String actualRaw, String minRaw, String unit, int digits) {
        Double a = num(actualRaw), min = num(minRaw);
        if (a != null && min != null) {
            boolean ok = a >= min;
            out.add(new CustomsComplianceItemDto(reg, ref, item, "≥ " + fmt(min, digits) + " " + unit,
                    fmt(a, digits) + " " + unit, ok ? margin(a - min, min, "%".equals(unit) ? "%p" : unit, digits) : null, ok ? PASS : FAIL, null));
        } else if (isSecret(actualRaw)) {
            out.add(secretRow(reg, ref, item, min != null ? "≥ " + fmt(min, digits) + " " + unit : "규격 하한"));
        }
    }

    private void lowerBoundPct(List<CustomsComplianceItemDto> out, String reg, String ref, String item,
                               String actualRaw, double min, String note) {
        Double a = num(actualRaw);
        if (a == null) {
            if (isSecret(actualRaw)) out.add(secretRow(reg, ref, item, "≥ " + fmt(min, 0) + " %"));
            return;
        }
        if (a == 0.0) {
            out.add(new CustomsComplianceItemDto(reg, ref, item, "≥ " + fmt(min, 0) + " %", "0 %", null, NA, "해당 금속 미함유 · 적용 제외"));
            return;
        }
        boolean ok = a >= min;
        out.add(new CustomsComplianceItemDto(reg, ref, item, "≥ " + fmt(min, 0) + " %", fmt(a, 1) + " %",
                ok ? margin(a - min, min, "%p", 1) : null, ok ? PASS : FAIL, note));
    }

    private void recycled(List<CustomsComplianceItemDto> out, Map<String, String> v, String code, String item, double min, String note) {
        lowerBoundPct(out, BATT, "Art. 8(2)", item, v.get(code), min, note);
    }

    private void absent(List<CustomsComplianceItemDto> out, Map<String, String> v, String code,
                        String reg, String ref, String item, String limit) {
        String raw = v.get(code);
        if (raw == null) return;
        boolean present = "true".equalsIgnoreCase(raw);
        out.add(new CustomsComplianceItemDto(reg, ref, item, limit, present ? "검출(함유) 신고" : "불검출",
                null, present ? FAIL : PASS, null));
    }

    private CustomsComplianceItemDto secretRow(String reg, String ref, String item, String requirement) {
        return new CustomsComplianceItemDto(reg, ref, item, requirement, "실측값 비공개 (영업비밀)", null, PASS,
                "ZKP 증명으로 기준 충족만 공개");
    }

    private static boolean isSecret(String raw) {
        return raw != null && TRADE_SECRET_TOKEN.equals(raw.trim());
    }

    private static String rangeText(Double lo, Double hi, String unit) {
        if (lo != null && hi != null) return fmt(lo, 0) + " ~ " + fmt(hi, 0) + " " + unit;
        if (lo != null) return "≥ " + fmt(lo, 0) + " " + unit;
        return "규격 범위";
    }

    private static String margin(double diff, double base, String unit, int digits) {
        String abs = "+" + fmt(diff, digits) + " " + unit;
        if (base == 0) return abs;
        return abs + " (기준 대비 +" + fmt(diff / base * 100.0, 1) + " %)";
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> asMap(Object o) {
        if (o instanceof Map<?, ?> m) {
            Map<String, Object> r = new LinkedHashMap<>();
            m.forEach((k, val) -> r.put(String.valueOf(k), val));
            return r;
        }
        return Map.of();
    }

    private static Double num(String s) {
        if (s == null) return null;
        String t = s.replace(",", "").replace("%", "").trim();
        if (t.isEmpty() || "null".equals(t)) return null;
        try {
            return Double.valueOf(t);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String fmt(double d, int digits) {
        return new BigDecimal(d).setScale(digits, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
    }

    private static String firstNonBlank(String... xs) {
        for (String x : xs) {
            if (x != null && !x.isBlank()) return x;
        }
        return null;
    }

    private void safe(Long dppId, String block, Runnable r) {
        try {
            r.run();
        } catch (Exception e) {
            log.warn("dppId={} 적합성 근거({}) 계산 실패 - 해당 블록만 생략: {}", dppId, block, e.getMessage());
        }
    }
}
