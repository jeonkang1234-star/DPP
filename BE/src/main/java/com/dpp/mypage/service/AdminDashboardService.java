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

import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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

    @Transactional(readOnly = true)
    public AdminDashboardResponse getDashboard(Long adminUserId) {
        requireAdmin(adminUserId);

        Map<String, Long> usersByType = adminStatsRepository.countUsersByAccountType().stream()
                .collect(Collectors.toMap(r -> String.valueOf(r[0]), r -> ((Number) r[1]).longValue()));
        long business = usersByType.getOrDefault("BUSINESS", 0L);
        long personal = usersByType.getOrDefault("PERSONAL", 0L);
        long adminCount = usersByType.getOrDefault("ADMIN", 0L);
        long totalUsers = business + personal + adminCount;

        Map<String, Long> dppsByDomain = adminStatsRepository.countDppsByDomain().stream()
                .collect(Collectors.toMap(r -> String.valueOf(r[0]), r -> ((Number) r[1]).longValue()));
        long steel = dppsByDomain.getOrDefault("STEEL", 0L);
        long battery = dppsByDomain.getOrDefault("BATTERY", 0L);
        long textile = dppsByDomain.getOrDefault("TEXTILE", 0L);
        long totalDpps = steel + battery + textile;

        long pending = adminStatsRepository.countPendingApprovals();

        Long lastAnchoredMinutesAgo = null;
        Long lastAnchorBlockNo = null;
        Object[] latest = firstRow(adminStatsRepository.findLatestAnchor(), 2);
        if (latest != null) {
            OffsetDateTime at = toOffsetDateTime(latest[0]);
            if (at != null) {
                lastAnchoredMinutesAgo = Duration.between(at, OffsetDateTime.now()).toMinutes();
            }
            Object blockRaw = latest[1];
            lastAnchorBlockNo = blockRaw == null ? null : ((Number) blockRaw).longValue();
        }

        Object[] successRow = firstRow(adminStatsRepository.countAnchorSuccessRate30d(), 2);
        long total30 = successRow == null ? 0L : toLong(successRow[0]);
        long ok30 = successRow == null ? 0L : toLong(successRow[1]);
        Double successRate = total30 > 0 ? Math.round(ok30 * 10000.0 / total30) / 100.0 : null;

        List<Long> sparkline = buildSparkline(adminStatsRepository.dailyAnchorCounts14d());

        List<Object[]> inquiryRows = adminStatsRepository.countInquiriesByType30d();
        long inquiryTotal = inquiryRows.stream().mapToLong(r -> ((Number) r[1]).longValue()).sum();
        List<AdminInquiryStatDto> inquiries = inquiryRows.stream()
                .map(r -> {
                    String key = String.valueOf(r[0]);
                    long count = ((Number) r[1]).longValue();
                    int pct = inquiryTotal > 0 ? (int) Math.round(count * 100.0 / inquiryTotal) : 0;
                    return new AdminInquiryStatDto(key, inquiryLabel(key), count, pct);
                })
                .toList();

        return new AdminDashboardResponse(totalUsers, business, personal, totalDpps, steel, battery, textile,
                pending, lastAnchoredMinutesAgo, lastAnchorBlockNo, successRate, sparkline,
                inquiryTotal, inquiries);
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
                joinedDate, countryCode, domainLabel(domain), held, issued);
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

    private OffsetDateTime toOffsetDateTime(Object raw) {
        if (raw instanceof OffsetDateTime odt) {
            return odt;
        }
        if (raw instanceof java.sql.Timestamp ts) {
            return ts.toInstant().atOffset(ZoneOffset.UTC);
        }
        return null;
    }

    private LocalDate toLocalDate(Object raw) {
        if (raw instanceof LocalDate ld) {
            return ld;
        }
        if (raw instanceof java.sql.Date sd) {
            return sd.toLocalDate();
        }
        return null;
    }

    private void requireAdmin(Long userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 사용자입니다."));
        if (user.getAccountType() != AccountType.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 접근할 수 있습니다.");
        }
    }
}
