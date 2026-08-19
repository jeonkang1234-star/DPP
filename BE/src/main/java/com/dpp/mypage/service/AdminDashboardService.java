package com.dpp.mypage.service;

import com.dpp.auth.entity.AccountType;
import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.mypage.dto.AdminDashboardResponse;
import com.dpp.mypage.dto.AdminMemberDto;
import com.dpp.mypage.repository.AdminStatsRepository;
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
import java.util.Optional;
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
        Optional<Object[]> latest = adminStatsRepository.findLatestAnchor();
        if (latest.isPresent()) {
            OffsetDateTime at = toOffsetDateTime(latest.get()[0]);
            if (at != null) {
                lastAnchoredMinutesAgo = Duration.between(at, OffsetDateTime.now()).toMinutes();
            }
            Object blockRaw = latest.get()[1];
            lastAnchorBlockNo = blockRaw == null ? null : ((Number) blockRaw).longValue();
        }

        Object[] successRow = adminStatsRepository.countAnchorSuccessRate30d();
        long total30 = ((Number) successRow[0]).longValue();
        long ok30 = ((Number) successRow[1]).longValue();
        Double successRate = total30 > 0 ? Math.round(ok30 * 10000.0 / total30) / 100.0 : null;

        List<Long> sparkline = buildSparkline(adminStatsRepository.dailyAnchorCounts14d());

        return new AdminDashboardResponse(totalUsers, business, personal, totalDpps, steel, battery, textile,
                pending, lastAnchoredMinutesAgo, lastAnchorBlockNo, successRate, sparkline);
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
