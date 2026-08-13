package com.dpp.mypage.service;

import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.mypage.dto.OrganizationResponse;
import com.dpp.mypage.dto.OrganizationUpdateRequest;
import com.dpp.mypage.entity.OrgProfileStatus;
import com.dpp.mypage.entity.Organization;
import com.dpp.mypage.repository.OrganizationRepository;
import com.dpp.mypage.repository.RoleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.Set;

/**
 * 회사/조직 프로필. 두 가지 진입점이 있다:
 *  1) findOrCreateForSignup - BusinessSignupService가 가입 확정 시점에 호출.
 *     (country_code, biz_reg_no)가 이미 존재하는 조직이면 새로 만들지 않고 거기 합류시킨다
 *     (같은 회사 두 번째 직원이 가입하는 경우 - ux_org_biz_reg_no 유니크 인덱스 활용).
 *  2) get/updateMyOrganization - 로그인한 사용자가 마이페이지에서 자기 조직 프로필을
 *     조회/보완. org_type(가입 시엔 NULL)·주소·담당자 정보는 여기서 채운다.
 *
 * approval_status(관리자 승인)는 이 서비스에서 건드리지 않는다 - RBAC/권한 체크 인프라가
 * 아직 없어서 admin 전용 승인 API는 별도 작업으로 남겨둔다.
 */
@Service
public class OrganizationService {

    private static final Logger log = LoggerFactory.getLogger(OrganizationService.class);

    /** role 테이블 전체 코드 중 "조직"에 해당하는 것만 - ADMIN/CONSUMER는 개인 계정용이라 제외. */
    private static final Set<String> ALLOWED_ORG_TYPES = Set.of(
            "MANUFACTURER", "EU_AUTHORITY", "CUSTOMS", "RAW_SUPPLIER",
            "LOGISTICS", "DISTRIBUTOR", "RECYCLER", "TEST_LAB");

    private static final Set<String> ALLOWED_DOMAINS = Set.of("STEEL", "TEXTILE", "BATTERY");

    private final OrganizationRepository organizationRepository;
    private final UserAccountRepository userAccountRepository;
    private final RoleRepository roleRepository;

    public OrganizationService(OrganizationRepository organizationRepository,
                                UserAccountRepository userAccountRepository,
                                RoleRepository roleRepository) {
        this.organizationRepository = organizationRepository;
        this.userAccountRepository = userAccountRepository;
        this.roleRepository = roleRepository;
    }

    /** BusinessSignupService 전용. 반드시 그쪽의 @Transactional 안에서 호출될 것. */
    @Transactional
    public Organization findOrCreateForSignup(String companyName, String bizRegNo,
                                               String countryInput, String domainInput) {
        String countryCode = normalizeCountryCode(countryInput);
        String domain = normalizeDomain(domainInput);

        Optional<Organization> existing = organizationRepository
                .findByCountryCodeAndBizRegNoAndDeletedAtIsNull(countryCode, bizRegNo);
        if (existing.isPresent()) {
            log.info("기존 조직에 합류: org_id={}, countryCode={}, bizRegNo={}",
                    existing.get().getOrgId(), countryCode, bizRegNo);
            return existing.get();
        }

        Organization org = new Organization();
        org.setOrgName(companyName);
        org.setCountryCode(countryCode);
        org.setBizRegNo(bizRegNo);
        org.setDomain(domain);
        // org_type은 일부러 비워둔다 - "가입 직후에는 NULL, 마이페이지에서 확정" (V1 스키마 주석).
        Organization saved = organizationRepository.save(org);
        log.info("신규 조직 생성: org_id={}, countryCode={}, bizRegNo={}", saved.getOrgId(), countryCode, bizRegNo);
        return saved;
    }

    @Transactional(readOnly = true)
    public OrganizationResponse getMyOrganization(Long userId) {
        return OrganizationResponse.of(requireOrg(userId));
    }

    @Transactional
    public OrganizationResponse updateMyOrganization(Long userId, OrganizationUpdateRequest request) {
        Organization org = requireOrg(userId);

        if (request.orgType() != null && !request.orgType().isBlank()) {
            String orgType = request.orgType().trim().toUpperCase();
            if (!ALLOWED_ORG_TYPES.contains(orgType) || !roleRepository.existsById(orgType)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "허용되지 않는 조직 유형입니다: " + request.orgType());
            }
            org.setOrgType(orgType);
        }
        if (request.orgName() != null && !request.orgName().isBlank()) {
            org.setOrgName(request.orgName());
        }
        // PUT이지만 부분 업데이트(PATCH 의미)로 동작한다 - 점진적 온보딩 특성상 한 번에 한두
        // 필드씩 여러 번 나눠서 채우는 흐름이라, 요청에 없는(JSON에서 아예 빠진, null) 필드는
        // 건드리지 않고 그대로 둔다. 필드를 명시적으로 지우고 싶으면 빈 문자열("")을 보내면
        // blankToNull이 null로 바꿔 저장한다 - "요청에서 생략"과 "빈 값으로 지움"을 구분.
        if (request.leiCode() != null) {
            org.setLeiCode(blankToNull(request.leiCode()));
        }
        if (request.eoriCode() != null) {
            org.setEoriCode(blankToNull(request.eoriCode()));
        }
        if (request.uoi() != null) {
            org.setUoi(blankToNull(request.uoi()));
        }
        if (request.postalCode() != null) {
            org.setPostalCode(blankToNull(request.postalCode()));
        }
        if (request.addressLine1() != null) {
            org.setAddressLine1(blankToNull(request.addressLine1()));
        }
        if (request.addressLine2() != null) {
            org.setAddressLine2(blankToNull(request.addressLine2()));
        }
        if (request.city() != null) {
            org.setCity(blankToNull(request.city()));
        }
        if (request.contactName() != null) {
            org.setContactName(blankToNull(request.contactName()));
        }
        if (request.contactDept() != null) {
            org.setContactDept(blankToNull(request.contactDept()));
        }
        if (request.contactPhone() != null) {
            org.setContactPhone(blankToNull(request.contactPhone()));
        }
        if (request.contactEmail() != null) {
            org.setContactEmail(blankToNull(request.contactEmail()));
        }

        // 조직유형 + 담당자명 + 담당자 연락처까지 채워지면 자체신고 완료(SUBMITTED)로 승격.
        // approval_status(관리자 승인)는 여기서 건드리지 않는다.
        if (org.getProfileStatus() == OrgProfileStatus.INCOMPLETE
                && org.getOrgType() != null
                && org.getContactName() != null
                && org.getContactPhone() != null) {
            org.setProfileStatus(OrgProfileStatus.SUBMITTED);
        }

        return OrganizationResponse.of(organizationRepository.save(org));
    }

    private Organization requireOrg(Long userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 사용자입니다."));
        Long orgId = user.getOrgId();
        if (orgId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이 계정에 연결된 조직이 없습니다.");
        }
        return organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "조직 정보를 찾을 수 없습니다."));
    }

    /** FE가 country에 "대한민국" 같은 표시용 문자열을 보내도 CHAR(2) country_code로 정규화한다. */
    private String normalizeCountryCode(String input) {
        if (input == null || input.isBlank()) {
            return "KR";
        }
        String v = input.trim();
        if (v.equalsIgnoreCase("KR") || v.contains("대한민국") || v.contains("한국")) {
            return "KR";
        }
        return v.length() >= 2 ? v.substring(0, 2).toUpperCase() : "KR";
    }

    private String normalizeDomain(String input) {
        if (input == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "산업 도메인을 입력해 주세요.");
        }
        String v = input.trim().toUpperCase();
        if (!ALLOWED_DOMAINS.contains(v)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 산업 도메인입니다: " + input);
        }
        return v;
    }

    private String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}
