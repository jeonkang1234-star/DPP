package com.dpp.mypage.service;

import com.dpp.auth.entity.AccountType;
import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.mypage.dto.AdminDashboardResponse;
import com.dpp.mypage.dto.AdminInquiryStatDto;
import com.dpp.mypage.dto.AdminMemberDto;
import com.dpp.mypage.repository.AdminStatsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 관리자 대시보드 KPI/회원 목록 - 예전엔 AppView.jsx에 "1,284"/"48,392"/"#8,412,930"/
 * "99.98%" 같은 숫자가 그대로 하드코딩돼 있었고, 회원 목록(data.json members)도 고정
 * 배열이었다(2026-08-19 강 요청 "현재 전부 다 목데이터인데 전부 실데이터로 변경").
 *
 * DPP/앵커링 실적이 없으면 가짜 숫자를 채우지 않고 0 또는 null로 내려준다 -
 * DashboardService(제조사 대시보드)와 같은 원칙. 특히 블록체인 앵커는 이 프로토타입에서
 * 실제 체인이 아니라 MOCK 상태로 기록되므로(V1__schema.sql 주석: "MOCK = 1차
 * 프로토타입, 해시는 실제, tx_id는 가상"), "블록 높이"·"성공률" 모두 실제 blockchain_anchor
 * 테이블 값을 그대로 계산한 것이지 가상의 체인 API를 조회한 게 아니다.
 */
@Service
public class AdminDashboardService {

    private static final Logger log = LoggerFactory.getLogger(AdminDashboardService.class);

    private final UserAccountRepository userAccountRepository;
    private final AdminStatsRepository adminStatsRepository;

    public AdminDashboardService(UserAccountRepository userAccountRepository,
                                  AdminStatsRepository adminStatsRepository) {
        this.userAccountRepository = userAccountRepository;
        this.adminStatsRepository = adminStatsRepository;
    }

    /**
     * KPI 하나가 죽어도 나머지는 살린다.
     *
     * 2026-08-20과 2026-08-23, 같은 증상이 두 번 났다 - "전체 가입자 수/등록 DPP 수/앵커
     * 상태가 전부 '—'". 두 번 다 원인은 집계 쿼리 하나가 예외를 던져서 GET /admin/dashboard
     * 전체가 500이 된 것이었고, FE가 그 실패를 조용히 삼켜서(catch(()=>{})) 화면엔
     * "데이터가 없다"로만 보였다. 지표 하나 때문에 대시보드 전체가 사라지는 구조 자체가
     * 문제라서, 이제 각 집계를 독립적으로 감싼다:
     *   - 실패한 지표만 null(화면에서 '—'), 나머지는 정상 표시
     *   - 실패는 스택 트레이스까지 WARN 로그로 남는다(원인 추적 가능)
     * 이건 예외를 숨기는 게 아니라, 예외의 폭발 반경을 지표 하나로 줄이는 것이다.
     */
    @Transactional(readOnly = true)
    public AdminDashboardResponse getDashboard(Long adminUserId) {
        requireAdmin(adminUserId);

        Map<String, Long> usersByType = safe("가입자 수 집계",
                () -> toCountMap(adminStatsRepository.countUsersByAccountType()), Map.of());
        Long business = usersByType.get("BUSINESS");
        Long personal = usersByType.get("PERSONAL");
        Long adminCount = usersByType.get("ADMIN");
        Long totalUsers = usersByType.isEmpty() ? null
                : nz(business) + nz(personal) + nz(adminCount);

        Map<String, Long> dppsByDomain = safe("도메인별 DPP 수 집계",
                () -> toCountMap(adminStatsRepository.countDppsByDomain()), Map.of());
        Long steel = dppsByDomain.get("STEEL");
        Long battery = dppsByDomain.get("BATTERY");
        Long textile = dppsByDomain.get("TEXTILE");
        Long totalDpps = dppsByDomain.isEmpty() ? null : nz(steel) + nz(battery) + nz(textile);

        Long pending = safeOrNull("가입 승인 대기 건수",
                () -> Long.valueOf(adminStatsRepository.countPendingApprovals()));

        // "몇 분 전"은 SQL이 이미 계산해서 숫자로 내려준다(AdminStatsRepository.findLatestAnchor
        // 주석 참고) - 여기서 timestamptz를 다시 자바 타입으로 변환하지 않는다.
        Object[] latest = safeOrNull("최근 앵커링 조회",
                () -> firstRow(adminStatsRepository.findLatestAnchor(), 2));
        Long lastAnchoredMinutesAgo = null;
        Long lastAnchorBlockNo = null;
        if (latest != null) {
            if (latest[0] instanceof Number minutes) {
                lastAnchoredMinutesAgo = Math.max(0L, minutes.longValue());
            }
            if (latest[1] instanceof Number block) {
                lastAnchorBlockNo = block.longValue();
            }
        }

        Double successRate = safeOrNull("30일 앵커링 성공률", () -> {
            Object[] successRow = firstRow(adminStatsRepository.countAnchorSuccessRate30d(), 2);
            long total30 = successRow == null ? 0L : toLong(successRow[0]);
            long ok30 = successRow == null ? 0L : toLong(successRow[1]);
            return total30 > 0 ? Double.valueOf(Math.round(ok30 * 10000.0 / total30) / 100.0) : null;
        });

        List<Long> sparkline = safe("14일 앵커링 추이",
                () -> buildSparkline(adminStatsRepository.dailyAnchorCounts14d()), List.of());

        List<Object[]> inquiryRows = safe("30일 문의 유형별 집계",
                adminStatsRepository::countInquiriesByType30d, List.of());
        Long inquiryTotal = inquiryRows.stream().mapToLong(r -> toLong(r[1])).sum();
        List<AdminInquiryStatDto> inquiries = inquiryRows.stream()
                .map(r -> {
                    String key = String.valueOf(r[0]);
                    long count = toLong(r[1]);
                    int pct = inquiryTotal > 0 ? (int) Math.round(count * 100.0 / inquiryTotal) : 0;
                    return new AdminInquiryStatDto(key, inquiryLabel(key), count, pct);
                })
                .toList();

        return new AdminDashboardResponse(totalUsers, business, personal, totalDpps, steel, battery, textile,
                pending, lastAnchoredMinutesAgo, lastAnchorBlockNo, successRate, sparkline,
                inquiryTotal, inquiries);
    }

    /**
     * 집계 하나를 감싸서, 실패하면 스택을 로그에 남기고 fallback을 돌려준다.
     * 여기서 잡는 건 "이 지표를 못 구했다"뿐이다 - requireAdmin의 401/403처럼 응답 자체가
     * 달라져야 하는 예외는 이 밖에서 던지므로 영향받지 않는다.
     */
    private <T> T safe(String label, java.util.function.Supplier<T> supplier, T fallback) {
        try {
            T value = supplier.get();
            return value == null ? fallback : value;
        } catch (RuntimeException e) {
            log.warn("관리자 대시보드 지표 '{}' 집계 실패 - 이 지표만 비워둔다", label, e);
            return fallback;
        }
    }

    /** 실패하든 값이 없든 null이 정상인 지표용(대입 대상 타입으로 T가 결정된다). */
    private <T> T safeOrNull(String label, java.util.function.Supplier<T> supplier) {
        try {
            return supplier.get();
        } catch (RuntimeException e) {
            log.warn("관리자 대시보드 지표 '{}' 집계 실패 - 이 지표만 비워둔다", label, e);
            return null;
        }
    }

    /** [키, 개수] 2컬럼 집계 결과를 Map으로. 같은 키가 두 번 나와도(이론상 없음) 죽지 않게 합산한다. */
    private Map<String, Long> toCountMap(List<Object[]> rows) {
        Map<String, Long> out = new LinkedHashMap<>();
        for (Object[] row : rows) {
            if (row == null || row.length < 2) continue;
            out.merge(String.valueOf(row[0]), toLong(row[1]), Long::sum);
        }
        return out;
    }

    private long nz(Long v) {
        return v == null ? 0L : v;
    }

    /**
     * notification.sub_type 코드를 화면 라벨로. 모르는 코드는 코드 그대로 보여준다 -
     * 없는 유형을 임의로 "기타"에 합치면 집계가 왜곡되기 때문. TIER(Tier 심사)는 애초에
     * 쿼리에서 제외되므로 여기에도 없다(2026-08-20 강 요청).
     */
    private String inquiryLabel(String subType) {
        if (subType == null) return "기타";
        return switch (subType) {
            case "ACCOUNT" -> "계정·인증";
            case "DPP" -> "DPP 등록";
            case "DATA" -> "데이터 검증";
            case "CUSTOMS" -> "통관";
            case "ZKP" -> "영지식증명";
            case "ETC" -> "기타";
            default -> subType;
        };
    }

    @Transactional(readOnly = true)
    public List<AdminMemberDto> listMembers(Long adminUserId) {
        requireAdmin(adminUserId);
        return adminStatsRepository.findMembersWithDppCounts().stream().map(this::toMemberDto).toList();
    }

    private AdminMemberDto toMemberDto(Object[] row) {
        Long orgId = ((Number) row[0]).longValue();
        String orgName = (String) row[1];
        String bizRegNo = (String) row[2];
        OffsetDateTime joinedAt = toOffsetDateTime(row[3]);
        String joinedDate = joinedAt == null ? "—" : joinedAt.toLocalDate().toString();
        String countryCode = row[4] == null ? "—" : String.valueOf(row[4]).trim();
        String domain = row[5] == null ? null : String.valueOf(row[5]);
        long held = ((Number) row[6]).longValue();
        long issued = ((Number) row[7]).longValue();
        return new AdminMemberDto(orgId, orgName, bizRegNo == null || bizRegNo.isBlank() ? "—" : bizRegNo,
                joinedDate, countryCode, domainLabel(domain), held, issued,
                dash(row.length > 8 ? row[8] : null),
                dash(row.length > 9 ? row[9] : null),
                dash(row.length > 10 ? row[10] : null));
    }

    /** 빈 값은 화면에서 빈칸이 아니라 '—'로 보이게 한다 - 조회는 됐는데 값이 없다는 뜻. */
    private String dash(Object raw) {
        String v = raw == null ? null : String.valueOf(raw).trim();
        return v == null || v.isEmpty() ? "—" : v;
    }

    private String domainLabel(String domain) {
        if ("STEEL".equals(domain)) return "철강";
        if ("BATTERY".equals(domain)) return "배터리";
        if ("TEXTILE".equals(domain)) return "섬유·패션";
        return "—";
    }

    /**
     * 네이티브 쿼리 결과의 첫 행을 컬럼 수까지 확인해서 꺼낸다. 행이 없거나 모양이
     * 예상과 다르면 null - 대시보드 KPI 하나 때문에 화면 전체가 500으로 죽지 않게 한다.
     *
     * 2026-08-20 강 리포트("전체 가입자 수, 등록 DPP 수에 숫자가 안 뜸")의 실제 원인이
     * 여기였다. 앵커 행이 하나라도 생기면 GET /admin/dashboard가
     * "Index 1 out of bounds for length 1"로 500이 났고, FE는 이 호출 실패를 조용히
     * 삼켜서(catch(()=>{})) 가입자 수·DPP 수까지 전부 '—'로 보였다. 원인은 리포지터리
     * 반환 타입이었고(AdminStatsRepository.findLatestAnchor 주석 참고) 거기서 고쳤지만,
     * 같은 실수가 또 나도 KPI 하나만 비고 나머지는 나오도록 여기서 한 번 더 막는다.
     */
    private Object[] firstRow(List<Object[]> rows, int minColumns) {
        if (rows == null || rows.isEmpty()) {
            return null;
        }
        Object[] row = rows.get(0);
        if (row == null || row.length < minColumns) {
            log.warn("예상과 다른 쿼리 결과 모양(컬럼 {}개 필요, 실제 {}개) - 해당 지표는 비워둔다",
                    minColumns, row == null ? 0 : row.length);
            return null;
        }
        return row;
    }

    private long toLong(Object raw) {
        return raw instanceof Number n ? n.longValue() : 0L;
    }

    /** 최근 14일을 전부 0으로 채운 뒤 실제 집계값을 덮어써서, 앵커링이 없었던 날도 빠지지 않고 0으로 나오게 한다. */
    private List<Long> buildSparkline(List<Object[]> rows) {
        Map<LocalDate, Long> byDate = new LinkedHashMap<>();
        LocalDate today = OffsetDateTime.now().toLocalDate();
        for (int i = 13; i >= 0; i--) {
            byDate.put(today.minusDays(i), 0L);
        }
        for (Object[] row : rows) {
            LocalDate d = toLocalDate(row[0]);
            if (d != null && byDate.containsKey(d)) {
                byDate.put(d, ((Number) row[1]).longValue());
            }
        }
        return new ArrayList<>(byDate.values());
    }

    /**
     * 네이티브 쿼리가 돌려준 시각 값을 OffsetDateTime으로. Hibernate가 timestamptz를
     * java.sql.Timestamp / java.time.Instant / OffsetDateTime / LocalDateTime 중
     * 무엇으로 줄지는 드라이버·방언 조합에 따라 달라진다. 예전엔 앞의 둘만 처리하고
     * 나머지는 조용히 null이 됐고, 그 결과 값이 멀쩡히 있는데도 화면엔 '—'/'기록 없음'만
     * 보였다(2026-08-22 강 리포트). 이제 전부 받고, 그래도 모르는 타입이면 로그를 남긴다.
     */
    private OffsetDateTime toOffsetDateTime(Object raw) {
        if (raw == null) {
            return null;
        }
        if (raw instanceof OffsetDateTime odt) {
            return odt;
        }
        if (raw instanceof java.sql.Timestamp ts) {
            return ts.toInstant().atOffset(ZoneOffset.UTC);
        }
        if (raw instanceof java.time.Instant inst) {
            return inst.atOffset(ZoneOffset.UTC);
        }
        if (raw instanceof java.time.ZonedDateTime zdt) {
            return zdt.toOffsetDateTime();
        }
        if (raw instanceof java.time.LocalDateTime ldt) {
            return ldt.atOffset(ZoneOffset.UTC);
        }
        if (raw instanceof java.util.Date d) {
            return d.toInstant().atOffset(ZoneOffset.UTC);
        }
        log.warn("시각 컬럼을 해석하지 못했다(타입 {}) - 해당 값은 비워둔다", raw.getClass().getName());
        return null;
    }

    /** toOffsetDateTime과 같은 이유로 넓게 받는다 - 못 받으면 그 날짜의 스파크라인 막대가 조용히 0이 된다. */
    private LocalDate toLocalDate(Object raw) {
        if (raw == null) {
            return null;
        }
        if (raw instanceof LocalDate ld) {
            return ld;
        }
        if (raw instanceof java.sql.Date sd) {
            return sd.toLocalDate();
        }
        OffsetDateTime odt = toOffsetDateTime(raw);
        return odt == null ? null : odt.toLocalDate();
    }

    private void requireAdmin(Long userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 사용자입니다."));
        if (user.getAccountType() != AccountType.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 접근할 수 있습니다.");
        }
    }
}
