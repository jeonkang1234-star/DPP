package com.dpp.verify.service;

import com.dpp.auth.entity.AccountType;
import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.dpp.dto.PublicPassportResponse;
import com.dpp.dpp.service.PublicPassportService;
import com.dpp.mypage.entity.Organization;
import com.dpp.mypage.repository.OrganizationRepository;
import com.dpp.verify.dto.DppSearchResultDto;
import com.dpp.verify.dto.RegulatorDppDetailDto;
import com.dpp.verify.repository.DppRegistrySearchRepository;
import com.dpp.verify.repository.RegulatorDppDetailRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * REQ-VERIFY: EU 시장감시(레지스트리 조회) / 관세청(통관 조회) 공용 - 발급된 DPP를
 * 검색한다. 예전엔 둘 다 FE euVals.js/customsVals.js에 하드코딩된 배열이었다
 * (2026-08-16, 강 요청으로 실데이터 전환).
 *
 * 접근 권한: ADMIN이거나, 소속 조직의 org_type이 EU_AUTHORITY/CUSTOMS인 BUSINESS
 * 계정만 - OrganizationService.ALLOWED_ORG_TYPES와 같은 코드 집합을 쓴다.
 */
@Service
public class DppRegistryService {

    private static final Set<String> REGULATOR_ORG_TYPES = Set.of("EU_AUTHORITY", "CUSTOMS");

    private final UserAccountRepository userAccountRepository;
    private final OrganizationRepository organizationRepository;
    private final DppRegistrySearchRepository dppRegistrySearchRepository;
    private final RegulatorDppDetailRepository regulatorDppDetailRepository;
    private final PublicPassportService publicPassportService;

    public DppRegistryService(UserAccountRepository userAccountRepository,
                               OrganizationRepository organizationRepository,
                               DppRegistrySearchRepository dppRegistrySearchRepository,
                               RegulatorDppDetailRepository regulatorDppDetailRepository,
                               PublicPassportService publicPassportService) {
        this.userAccountRepository = userAccountRepository;
        this.organizationRepository = organizationRepository;
        this.dppRegistrySearchRepository = dppRegistrySearchRepository;
        this.regulatorDppDetailRepository = regulatorDppDetailRepository;
        this.publicPassportService = publicPassportService;
    }

    /**
     * q(자유 검색어) + orgName/hsCode(개별 필터)를 AND로 겹쳐 조회한다.
     * 셋 다 비면 최신 발급 목록 - 예전 recent()와 같은 결과다.
     * 빈 문자열로 정규화해서 넘기는 이유는 DppRegistrySearchRepository.search 주석 참고.
     */
    @Transactional(readOnly = true)
    public List<DppSearchResultDto> search(Long userId, String query, String orgName, String hsCode) {
        return search(userId, query, orgName, "", hsCode, "");
    }

    /**
     * 2026-09-28 강 요청: 개인 페이지처럼 회사·제품명·도메인으로도 좁힐 수 있게.
     * productName은 모델명/브랜드 중 하나라도 걸리면 통과, domain은 STEEL/BATTERY/TEXTILE
     * 정확히 일치(비면 전체).
     */
    @Transactional(readOnly = true)
    public List<DppSearchResultDto> search(Long userId, String query, String orgName, String productName,
                                           String hsCode, String domain) {
        requireRegulatorAccess(userId);
        return dppRegistrySearchRepository
                .search(norm(query), norm(orgName), norm(productName), norm(hsCode), norm(domain).toUpperCase())
                .stream().map(this::toDto).toList();
    }

    /**
     * 규제기관 전용 DPP 상세(2026-09-28 강 요청) - 개인 QR 조회보다 넓은 범위.
     * 공개 여권 응답(규제기관 자격이라 RESTRICTED 항목 값 포함)에 더해 제품 식별 정보,
     * 제조사 신원, 공급망 참여자, 증빙서류, ZKP 증명, 블록체인 앵커, 통관 이력을 붙인다.
     * 발급(ACTIVE)된 DPP만 - 검색 목록과 같은 기준.
     */
    @Transactional(readOnly = true)
    public RegulatorDppDetailDto detail(Long userId, String publicUuid) {
        requireRegulatorAccess(userId);
        UUID uuid;
        try {
            uuid = UUID.fromString(publicUuid == null ? "" : publicUuid.trim());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "잘못된 DPP 식별자입니다.");
        }
        List<Object[]> headerRows = regulatorDppDetailRepository.findHeader(uuid.toString());
        if (headerRows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "발급된 DPP를 찾을 수 없습니다.");
        }
        Object[] h = headerRows.get(0);
        Long dppId = Long.valueOf(str(h[0]));

        Map<String, String> product = new LinkedHashMap<>();
        product.put("publicUuid", str(h[1]));
        product.put("serialNumber", str(h[2]));
        product.put("status", str(h[3]));
        product.put("lifecycleStage", str(h[4]));
        product.put("lifecycleStageName", str(h[5]));
        product.put("completeness", str(h[6]));
        product.put("issuedAt", str(h[7]));
        product.put("internalSku", str(h[8]));
        product.put("gtin", str(h[9]));
        product.put("modelName", str(h[10]));
        product.put("brand", str(h[11]));
        product.put("hsCode", str(h[12]));
        product.put("originCountry", str(h[13]));
        product.put("domain", str(h[14]));
        product.put("granularity", str(h[15]));

        Map<String, String> manufacturer = new LinkedHashMap<>();
        manufacturer.put("orgName", str(h[16]));
        manufacturer.put("bizRegNo", str(h[17]));
        manufacturer.put("eoriCode", str(h[18]));
        manufacturer.put("leiCode", str(h[19]));
        manufacturer.put("countryCode", str(h[20]));
        manufacturer.put("address", str(h[21]));
        manufacturer.put("contactName", str(h[22]));
        manufacturer.put("contactEmail", str(h[23]));
        manufacturer.put("contactPhone", str(h[24]));
        boolean hasPhoto = "Y".equals(str(h[25]));

        List<Map<String, String>> participants = rows(regulatorDppDetailRepository.findParticipants(dppId),
                "orgName", "roleName", "submitStatus", "completedAt");
        List<Map<String, String>> documents = rows(regulatorDppDetailRepository.findDocuments(dppId),
                "docType", "fileName", "issuer", "issuedAt", "expiresAt", "reviewStatus", "contentHash", "uploadedAt", "submittedBy");
        List<Map<String, String>> proofs = rows(regulatorDppDetailRepository.findProofs(dppId),
                "claimType", "circuitName", "status", "verifiedAt", "createdAt");
        List<Map<String, String>> anchors = rows(regulatorDppDetailRepository.findAnchors(dppId),
                "targetType", "txId", "blockNo", "status", "anchoredAt", "contentHash");
        List<Map<String, String>> clearances = rows(regulatorDppDetailRepository.findClearances(dppId),
                "side", "exportCountry", "importCountry", "customsOrg", "hsCode", "decision", "integrityResult", "decidedAt", "requestedAt");

        List<String> restrictedLabels = regulatorDppDetailRepository.findRestrictedLabels(str(h[14]));

        PublicPassportResponse passport = publicPassportService.getByPublicUuid(uuid, userId);

        return new RegulatorDppDetailDto(product, manufacturer, participants, documents, proofs, anchors,
                clearances, hasPhoto, restrictedLabels, passport);
    }

    private static String str(Object v) {
        return v == null ? null : String.valueOf(v);
    }

    private static List<Map<String, String>> rows(List<Object[]> raw, String... keys) {
        return raw.stream().map(r -> {
            Map<String, String> m = new LinkedHashMap<>();
            for (int i = 0; i < keys.length && i < r.length; i++) {
                m.put(keys[i], str(r[i]));
            }
            return m;
        }).toList();
    }

    private String norm(String v) {
        return v == null ? "" : v.trim();
    }

    private DppSearchResultDto toDto(Object[] row) {
        Long dppId = ((Number) row[0]).longValue();
        String publicUuid = String.valueOf(row[1]);
        String serialNumber = (String) row[2];
        String modelName = (String) row[3];
        String orgName = (String) row[4];
        String hsCode = (String) row[5];
        String domain = (String) row[6];
        String status = (String) row[7];
        Object issuedAtRaw = row[8];
        String issuedAtDate = null;
        if (issuedAtRaw instanceof OffsetDateTime odt) {
            issuedAtDate = odt.toLocalDate().toString();
        } else if (issuedAtRaw instanceof java.sql.Timestamp ts) {
            issuedAtDate = LocalDate.ofInstant(ts.toInstant(), ZoneOffset.UTC).toString();
        }
        String brand = row.length > 9 ? (String) row[9] : null;
        return new DppSearchResultDto(dppId, publicUuid, serialNumber, modelName, orgName, hsCode, domain, status, issuedAtDate, brand);
    }

    private void requireRegulatorAccess(Long userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 사용자입니다."));
        if (user.getAccountType() == AccountType.ADMIN) {
            return;
        }
        if (user.getOrgId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "규제기관 계정만 조회할 수 있습니다.");
        }
        Organization org = organizationRepository.findById(user.getOrgId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "규제기관 계정만 조회할 수 있습니다."));
        if (!REGULATOR_ORG_TYPES.contains(org.getOrgType())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "규제기관 계정만 조회할 수 있습니다.");
        }
    }
}
