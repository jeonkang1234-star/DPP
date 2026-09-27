package com.dpp.mypage.service;

import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.mypage.dto.PersonalProductDto;
import com.dpp.mypage.dto.ScanSummaryDto;
import com.dpp.mypage.entity.ScanHistory;
import com.dpp.mypage.entity.ScanStatus;
import com.dpp.mypage.dto.PersonalBrandDto;
import com.dpp.mypage.dto.PersonalCatalogItemDto;
import com.dpp.mypage.dto.PersonalCatalogPageDto;
import com.dpp.mypage.repository.PersonalProductSearchRepository;
import com.dpp.mypage.repository.ScanHistoryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/** REQ-MYPAGE(개인): 제품 검색(제품명·브랜드) / 조회 이력 기록·조회·삭제. */
@Service
public class ScanHistoryService {

    /**
     * 화면에 보여줄 최근 조회 기록 건수(2026-08-23 강 요청 "최근 5개 정도로").
     * DB 행을 지우는 게 아니라 응답만 자른다 - 사용자가 직접 삭제한 것(removed_at)과
     * "오래돼서 안 보이는 것"은 다른 개념이라 기록 자체는 남겨둔다.
     */
    private static final int RECENT_LIMIT = 5;

    /**
     * 이 글자 수 미만이면 검색 자체를 하지 않는다. 한 글자만으로도 ILIKE '%ㄱ%'가
     * 사실상 전체 목록이 되어버려서, 개인 회원이 레지스트리를 통째로 훑는 통로가 된다.
     */
    private static final int MIN_QUERY_LENGTH = 2;

    private final ScanHistoryRepository scanHistoryRepository;
    private final PersonalProductSearchRepository personalProductSearchRepository;
    private final UserAccountRepository userAccountRepository;

    public ScanHistoryService(ScanHistoryRepository scanHistoryRepository,
                               PersonalProductSearchRepository personalProductSearchRepository,
                               UserAccountRepository userAccountRepository) {
        this.scanHistoryRepository = scanHistoryRepository;
        this.personalProductSearchRepository = personalProductSearchRepository;
        this.userAccountRepository = userAccountRepository;
    }

    @Transactional(readOnly = true)
    public List<ScanSummaryDto> getScans(Long userId) {
        return scanHistoryRepository.findByUserIdAndRemovedAtIsNullOrderByScannedAtDesc(userId).stream()
                .limit(RECENT_LIMIT)
                .map(ScanSummaryDto::from)
                .toList();
    }

    /**
     * 제품명·브랜드로만 검색한다(2026-08-23 강 요청). 규제기관 검색(DppRegistryService)과
     * 달리 검색어 없이 목록을 주지 않는다 - 이유는 PersonalProductSearchRepository 주석 참고.
     */
    @Transactional(readOnly = true)
    public List<PersonalProductDto> searchProducts(Long userId, String query) {
        requireUser(userId);
        String q = query == null ? "" : query.trim();
        if (q.length() < MIN_QUERY_LENGTH) {
            return List.of();
        }
        return personalProductSearchRepository.searchByNameOrBrand(q).stream()
                .map(row -> new PersonalProductDto(
                        String.valueOf(row[0]),
                        (String) row[1],
                        (String) row[2],
                        (String) row[3],
                        toDateString(row[4])))
                .toList();
    }

    /** 전체 제품 둘러보기 한 페이지 최대 건수 - 카드 그리드 4열 기준 6줄. */
    private static final int CATALOG_MAX_SIZE = 48;
    private static final Set<String> DOMAINS = Set.of("STEEL", "BATTERY", "TEXTILE");

    /**
     * 발급된 DPP 전체 둘러보기(2026-09-27 강 요청 - "개인 페이지에서 조회할 데이터가 거의 없다").
     * by=brand 면 검색어를 브랜드에, 그 외(product)면 제품명에 맞춘다. 검색어가 없으면 전체 목록.
     * brand 를 주면 그 브랜드 제품만(브랜드 카드를 눌렀을 때).
     */
    @Transactional(readOnly = true)
    public PersonalCatalogPageDto catalog(Long userId, String by, String q, String brand, String domain,
                                          int page, int size) {
        requireUser(userId);
        String mode = "brand".equalsIgnoreCase(by) ? "brand" : "product";
        String query = q == null ? "" : q.trim();
        String brandName = brand == null ? "" : brand.trim();
        String dom = normalizeDomain(domain);
        int safeSize = Math.max(1, Math.min(size <= 0 ? 24 : size, CATALOG_MAX_SIZE));
        int safePage = Math.max(0, page);
        List<PersonalCatalogItemDto> items = personalProductSearchRepository
                .catalog(mode, query, brandName, dom, safeSize, safePage * safeSize).stream()
                .map(row -> new PersonalCatalogItemDto(
                        String.valueOf(row[0]),
                        (String) row[1],
                        (String) row[2],
                        (String) row[3],
                        (String) row[4],
                        (String) row[5],
                        toDateString(row[6]),
                        Boolean.TRUE.equals(row[7])))
                .toList();
        long total = personalProductSearchRepository.catalogCount(mode, query, brandName, dom);
        return new PersonalCatalogPageDto(items, total, safePage, safeSize);
    }

    /** 브랜드 목록(제품 수 많은 순). q 는 브랜드명·제조사명 부분 일치. */
    @Transactional(readOnly = true)
    public List<PersonalBrandDto> brands(Long userId, String q, String domain) {
        requireUser(userId);
        String query = q == null ? "" : q.trim();
        return personalProductSearchRepository.brands(query, normalizeDomain(domain)).stream()
                .map(row -> new PersonalBrandDto(
                        (String) row[0],
                        (String) row[1],
                        (String) row[2],
                        row[3] instanceof Number n ? n.longValue() : 0L))
                .toList();
    }

    private String normalizeDomain(String domain) {
        String d = domain == null ? "" : domain.trim().toUpperCase(Locale.ROOT);
        return DOMAINS.contains(d) ? d : "";
    }

    /**
     * 공개 여권을 열람했다는 기록을 남긴다. 같은 제품을 다시 열면 새 행 대신 기존 행의
     * 열람 일시만 갱신한다(최근 5칸을 같은 제품이 다 차지하는 걸 막는다).
     *
     * 존재하지 않거나 ACTIVE가 아닌 publicUuid면 404 - 임의의 UUID를 넣어 남의 계정 기록에
     * 쓰레기 행을 만들 수 없게 한다. 제품명·브랜드는 요청 본문에서 받지 않고 DB에서 다시
     * 읽는다(클라이언트가 보낸 표시 문자열을 그대로 저장하면 위조할 수 있다).
     */
    @Transactional
    public ScanSummaryDto recordScan(Long userId, String publicUuid) {
        requireUser(userId);
        String uuid = publicUuid == null ? "" : publicUuid.trim();
        List<Object[]> rows = uuid.isEmpty() ? List.of() : personalProductSearchRepository.findActiveByPublicUuid(uuid);
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 제품 여권을 찾을 수 없습니다.");
        }
        Object[] row = rows.get(0);
        Long dppId = row[0] instanceof Number n ? n.longValue() : null;
        String productName = (String) row[1];
        String brandName = (String) row[2];
        OffsetDateTime updatedAt = toOffsetDateTime(row[3]);

        ScanHistory scan = scanHistoryRepository
                .findFirstByUserIdAndPassportCodeAndRemovedAtIsNull(userId, uuid)
                .orElseGet(() -> {
                    ScanHistory fresh = new ScanHistory();
                    fresh.setUserId(userId);
                    fresh.setPassportCode(uuid);
                    return fresh;
                });
        scan.setDppId(dppId);
        scan.setProductName(productName == null || productName.isBlank() ? uuid : productName);
        scan.setBrandName(brandName);
        scan.setStatus(ScanStatus.VERIFIED);
        scan.setScannedAt(OffsetDateTime.now());
        scan.setPassportUpdatedAt(updatedAt);
        return ScanSummaryDto.from(scanHistoryRepository.save(scan));
    }

    /** 소프트 삭제 - 본인 기록이 아니면 404 (존재 여부 노출 방지 차원에서 403 대신 404). */
    @Transactional
    public void removeScan(Long userId, Long scanId) {
        ScanHistory scan = scanHistoryRepository.findByScanIdAndUserId(scanId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "조회 기록을 찾을 수 없습니다."));
        scan.setRemovedAt(OffsetDateTime.now());
        scanHistoryRepository.save(scan);
    }

    /**
     * 계정 유형은 따로 막지 않는다 - 여기서 나가는 정보는 전부 로그인 없이 /p/{publicUuid}로도
     * 보이는 공개 여권 데이터이고, 기록은 어차피 본인 user_id에만 쌓인다. 존재하지 않는
     * 사용자만 걸러낸다(탈퇴/삭제된 토큰으로 scan_history FK 위반을 내지 않기 위해).
     */
    private UserAccount requireUser(Long userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 사용자입니다."));
        if (user.getAccountType() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "조회 권한이 없습니다.");
        }
        return user;
    }

    /** AdminDashboardService와 같은 이유로 넓게 받는다 - Hibernate가 timestamptz를 여러 타입으로 준다. */
    private OffsetDateTime toOffsetDateTime(Object raw) {
        if (raw instanceof OffsetDateTime odt) return odt;
        if (raw instanceof java.sql.Timestamp ts) return ts.toInstant().atOffset(ZoneOffset.UTC);
        if (raw instanceof java.time.Instant inst) return inst.atOffset(ZoneOffset.UTC);
        if (raw instanceof java.time.LocalDateTime ldt) return ldt.atOffset(ZoneOffset.UTC);
        if (raw instanceof java.util.Date d) return d.toInstant().atOffset(ZoneOffset.UTC);
        return null;
    }

    private String toDateString(Object raw) {
        OffsetDateTime odt = toOffsetDateTime(raw);
        if (odt != null) return odt.toLocalDate().toString();
        if (raw instanceof LocalDate ld) return ld.toString();
        return null;
    }
}
