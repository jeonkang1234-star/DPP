package com.dpp.verify.service;

import com.dpp.auth.entity.AccountType;
import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.mypage.entity.Organization;
import com.dpp.mypage.repository.OrganizationRepository;
import com.dpp.verify.dto.DppSearchResultDto;
import com.dpp.verify.repository.DppRegistrySearchRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;

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

    public DppRegistryService(UserAccountRepository userAccountRepository,
                               OrganizationRepository organizationRepository,
                               DppRegistrySearchRepository dppRegistrySearchRepository) {
        this.userAccountRepository = userAccountRepository;
        this.organizationRepository = organizationRepository;
        this.dppRegistrySearchRepository = dppRegistrySearchRepository;
    }

    @Transactional(readOnly = true)
    public List<DppSearchResultDto> search(Long userId, String query) {
        requireRegulatorAccess(userId);
        String q = query == null ? "" : query.trim();
        List<Object[]> rows = q.isEmpty() ? dppRegistrySearchRepository.recent() : dppRegistrySearchRepository.search(q);
        return rows.stream().map(this::toDto).toList();
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
        return new DppSearchResultDto(dppId, publicUuid, serialNumber, modelName, orgName, hsCode, domain, status, issuedAtDate);
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
