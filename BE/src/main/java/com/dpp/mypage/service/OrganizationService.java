package com.dpp.mypage.service;

import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.document.client.ParserClient;
import com.dpp.document.config.DocumentIntegrationProperties;
import com.dpp.mypage.dto.OrganizationResponse;
import com.dpp.mypage.dto.OrganizationUpdateRequest;
import com.dpp.mypage.entity.OrgApprovalStatus;
import com.dpp.mypage.entity.OrgProfileStatus;
import com.dpp.mypage.entity.Organization;
import com.dpp.mypage.repository.OrganizationRepository;
import com.dpp.mypage.repository.RoleRepository;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
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
 * approval_status(관리자 승인)는 두 경로로만 바뀐다: (1) 이 서비스의 신규 가입 시점
 * 자동 심사, (2) AdminOrgApprovalService의 관리자 승인/반려 API. (1)의 자동 심사 로직은
 * 2026-08-19 강 요청으로 재설계됨 - 예전엔 국내 사업자등록번호 체크섬(형식 검증만, 국세청
 * 실제 DB 대조 아님) 통과만으로 즉시 ACTIVE 처리했으나, "첨부 여부만 확인하는 건 자동심사로
 * 볼 수 없다"는 지적에 따라 폐지했다. 지금은: 세관/시장감독기관(orgTypeHint 있음) 계정은
 * 공적 기관 신원 확인이 필요하므로 자동승인 자체를 시도하지 않고 항상 PENDING(관리자 수동
 * 심사)으로 남긴다. 그 외(제조사/협력사) 계정은 첨부된 사업자등록증을 parser 서비스
 * (ParserClient.verifyBizCert)로 실제 텍스트 추출 후 사업자등록번호·상호가 가입 입력값과
 * 완전히 일치할 때만 즉시 ACTIVE 처리하고, 조금이라도 어긋나면 역시 PENDING으로 남긴다
 * (verifyBizCert 메서드 참고). 여기 findOrCreateForSignup 이외의 메서드(마이페이지 프로필
 * CRUD)는 여전히 approval_status를 건드리지 않는다.
 */
@Service
public class OrganizationService {

    private static final Logger log = LoggerFactory.getLogger(OrganizationService.class);

    /** role 테이블 전체 코드 중 "조직"에 해당하는 것만 - ADMIN/CONSUMER는 개인 계정용이라 제외. */
    private static final Set<String> ALLOWED_ORG_TYPES = Set.of(
            "MANUFACTURER", "EU_AUTHORITY", "CUSTOMS", "RAW_SUPPLIER",
            "LOGISTICS", "DISTRIBUTOR", "RECYCLER", "TEST_LAB");

    private static final Set<String> ALLOWED_DOMAINS = Set.of("STEEL", "TEXTILE", "BATTERY");

    /** 세관/시장감독기관처럼 공적 성격의 계정 유형 - 가입 시점부터 org_type을 확정하고
     * (일반 기업과 달리 마이페이지까지 기다리지 않는다), 사업자등록증 검증 결과와 무관하게
     * 항상 관리자 수동 심사로 보낸다(2026-08-19 강 요청 "세관, 시장감독기관 같은 공적인
     * 계정은 수동 심사가 필요"). */
    private static final Set<String> PUBLIC_AUTHORITY_ORG_TYPES = Set.of("CUSTOMS", "EU_AUTHORITY");

    private final OrganizationRepository organizationRepository;
    private final UserAccountRepository userAccountRepository;
    private final RoleRepository roleRepository;
    private final ParserClient parserClient;
    private final DocumentIntegrationProperties documentProperties;

    public OrganizationService(OrganizationRepository organizationRepository,
                                UserAccountRepository userAccountRepository,
                                RoleRepository roleRepository,
                                ParserClient parserClient,
                                DocumentIntegrationProperties documentProperties) {
        this.organizationRepository = organizationRepository;
        this.userAccountRepository = userAccountRepository;
        this.roleRepository = roleRepository;
        this.parserClient = parserClient;
        this.documentProperties = documentProperties;
    }

    /** parser(FastAPI) POST /verify-biz-cert 응답 요약. */
    private record BizCertVerdict(boolean autoApprovable, List<String> reasons) {
    }

    /** BusinessSignupService 전용. 반드시 그쪽의 @Transactional 안에서 호출될 것.
     *
     * @param orgTypeHint    FE 가입 화면에서 고른 계정 유형 힌트("CUSTOMS"/"EU_AUTHORITY"/
     *                       null) - 세관·시장감독기관이면 항상 수동 심사로 보내기 위함
     *                       (2026-08-19). 그 외(제조사/협력사)는 null이고, org_type은 종전과
     *                       동일하게 가입 시점엔 비워둔 채 마이페이지에서 확정한다.
     * @param bizRegCertFile 사업자등록증 파일(제조사/협력사 가입 시 필수) - parser 서비스로
     *                       형식·데이터를 확인해 체크섬 단독 검증을 대체한다(2026-08-19 강
     *                       요청). 공적 계정(orgTypeHint 있음)은 어차피 수동 심사라 검증하지
     *                       않는다.
     */
    @Transactional
    public Organization findOrCreateForSignup(String companyName, String bizRegNo, String countryInput,
                                               String domainInput, String orgTypeHint, MultipartFile bizRegCertFile) {
        String countryCode = normalizeCountryCode(countryInput);
        String orgType = (orgTypeHint == null || orgTypeHint.isBlank())
                ? null : orgTypeHint.trim().toUpperCase();
        boolean isPublicAuthority = orgType != null && PUBLIC_AUTHORITY_ORG_TYPES.contains(orgType);
        // 세관/시장감독기관은 사업자등록번호 입력란이 아예 없다(2026-08-21 강 요청 6번).
        // biz_reg_no는 nullable이고 ux_org_biz_reg_no는 NULL을 제외하므로, 같은 국가에
        // 세관 계정이 여럿 있어도(항구별 세관 등) 충돌하지 않는다.
        String bizRegNoOrNull = (bizRegNo == null || bizRegNo.isBlank()) ? null : bizRegNo.trim();
        // 세관/시장감독기관은 산업 도메인(STEEL/TEXTILE/BATTERY) 개념이 없다 - domain 컬럼은
        // nullable이라 그냥 비워둔다(V1__schema.sql: CHECK (domain IN (...))는 NULL을 막지
        // 않음). 제조사/협력사만 기존처럼 필수로 검증한다.
        String domain = isPublicAuthority ? null : normalizeDomain(domainInput);

        // 사업자등록번호가 없으면(공적 기관) 기관명+국가로 기존 조직을 찾는다 - 같은 세관에
        // 두 번째 담당자가 가입하면 새 조직을 만들지 않고 합류시키기 위함.
        Optional<Organization> existing = bizRegNoOrNull == null
                ? organizationRepository.findByCountryCodeAndOrgNameAndDeletedAtIsNull(countryCode, companyName)
                : organizationRepository.findByCountryCodeAndBizRegNoAndDeletedAtIsNull(countryCode, bizRegNoOrNull);
        if (existing.isPresent()) {
            Organization joined = existing.get();

            // 2026-08-23 강 리포트("협력사로 가입했는데 제조사 화면이 뜬다")의 실제 원인.
            // 같은 사업자등록번호를 넣으면 "같은 회사의 다른 담당자"로 보고 그 조직에
            // 합류시키는데, 그때 가입 화면에서 고른 계정 유형은 조용히 무시됐다. 그래서
            // 제조사로 등록된 번호로 '협력사'를 골라 가입하면 org_type이 MANUFACTURER인
            // 조직에 들어가 제조사 화면을 보게 됐다 - 사용자 입장에선 버그로 보이지만
            // 서버는 데이터대로 동작한 것이다.
            //
            // 조직 유형은 회사의 속성이지 가입자가 고르는 값이 아니므로, 기존 조직을
            // 덮어쓰지 않는다. 대신 어긋나면 그 자리에서 막고 이유를 정확히 알려준다 -
            // 조용히 다른 유형으로 만들어 버리는 것보다 낫다.
            String requestedType = (orgType == null || orgType.isBlank()) ? null : orgType.trim().toUpperCase();
            if (requestedType != null && joined.getOrgType() != null
                    && !requestedType.equals(joined.getOrgType())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "이미 등록된 사업자등록번호입니다. 이 번호는 '" + joined.getOrgName() + "'("
                                + orgTypeLabel(joined.getOrgType()) + ")로 등록되어 있어 "
                                + orgTypeLabel(requestedType) + "(으)로는 가입할 수 없습니다. "
                                + "다른 회사라면 그 회사의 사업자등록번호로 가입해 주세요.");
            }

            log.info("기존 조직에 합류: org_id={}, countryCode={}, bizRegNo={}, approvalStatus={}",
                    joined.getOrgId(), countryCode, bizRegNoOrNull, joined.getApprovalStatus());
            // 아직 승인 전인 조직에 다시 가입하는 경우엔 이번에 낸 서류로 자동심사를 한 번 더
            // 돌린다(2026-08-22 강 리포트 "다온텍스타일로 회원가입했는데 자동검증이 안 되고
            // 관리자 수동 심사로 넘어감"). 예전엔 여기서 그냥 return해 버려서, 계정만 지우고
            // 조직 행이 PENDING으로 남아 있으면 몇 번을 다시 가입해도 검증이 아예 돌지 않고
            // 영원히 수동 심사로 빠졌다. 이미 ACTIVE/REJECTED로 심사가 끝난 조직은 건드리지
            // 않는다 - 나중에 합류하는 직원이 회사 승인 상태를 뒤집으면 안 된다.
            if (joined.getApprovalStatus() == OrgApprovalStatus.PENDING && !isPublicAuthority) {
                storeBizRegCert(joined, bizRegCertFile);
                BizCertVerdict verdict = verifyBizCert(bizRegCertFile, bizRegNoOrNull, companyName);
                recordVerdict(joined, verdict);
                if (verdict.autoApprovable()) {
                    joined.setApprovalStatus(OrgApprovalStatus.ACTIVE);
                    joined.setApprovedAt(OffsetDateTime.now());
                    log.info("기존 PENDING 조직 자동 승인: org_id={} 재제출 서류 검증 통과", joined.getOrgId());
                } else {
                    log.info("기존 PENDING 조직 수동 심사 유지: org_id={} - {}", joined.getOrgId(), verdict.reasons());
                }
                return organizationRepository.save(joined);
            }
            return joined;
        }

        Organization org = new Organization();
        org.setOrgName(companyName);
        org.setCountryCode(countryCode);
        org.setBizRegNo(bizRegNoOrNull);
        org.setDomain(domain);
        // org_type은 네 유형 모두 가입 시점에 확정한다. 예전엔 제조사/협력사를 NULL로 남기고
        // 마이페이지에서 채우게 했는데, 그 사이 NotificationCategory.visibleTo가 default 분기로
        // 빠져 갓 가입한 제조사에게 8개 카테고리가 전부 보였다(2026-08-21 강 요청 5번).
        if (orgType != null && ALLOWED_ORG_TYPES.contains(orgType)) {
            org.setOrgType(orgType);
        }

        if (isPublicAuthority) {
            // approval_status는 기본값 PENDING을 그대로 둬서 항상 관리자 수동 심사로 보낸다 -
            // 사업자등록증 검증을 아예 시도하지 않는다(공적 기관은 사업자등록증 개념 자체가
            // 안 맞는다). 승인 전까지는 로그인도 막힌다(PasswordAuthService, 2026-08-21 강
            // 요청 9번) - 온보딩까지는 마치게 두되 그 뒤 로그아웃된다.
            log.info("공적 계정 가입: orgType={}, countryCode={} - 자동승인 대상 제외, "
                    + "관리자 수동 심사로 전환", org.getOrgType(), countryCode);
        } else {
            BizCertVerdict verdict = verifyBizCert(bizRegCertFile, bizRegNoOrNull, companyName);
            recordVerdict(org, verdict);
            if (verdict.autoApprovable()) {
                org.setApprovalStatus(OrgApprovalStatus.ACTIVE);
                org.setApprovedAt(OffsetDateTime.now());
                // approvedBy는 비워둔다 - NULL이 "관리자가 아니라 자동 심사로 승인됨"의 표식
                // (AdminOrgApprovalService가 목록 응답에서 이 값으로 자동/수동을 구분한다).
                log.info("자동 승인: countryCode={}, bizRegNo={} 사업자등록증 형식·데이터 확인 통과",
                        countryCode, bizRegNoOrNull);
            } else {
                log.info("수동 심사 대기: countryCode={}, bizRegNo={} 사업자등록증 검증 미통과 - {}",
                        countryCode, bizRegNoOrNull, verdict.reasons());
            }
        }

        // 심사용 첨부는 승인 여부와 무관하게 항상 남긴다 - 공적 기관은 이 파일이 유일한
        // 심사 근거이고, 제조사/협력사도 반려 뒤 재심사할 때 원본이 필요하다.
        storeBizRegCert(org, bizRegCertFile);

        Organization saved = organizationRepository.save(org);
        log.info("신규 조직 생성: org_id={}, countryCode={}, bizRegNo={}, orgType={}, approvalStatus={}",
                saved.getOrgId(), countryCode, bizRegNoOrNull, saved.getOrgType(), saved.getApprovalStatus());
        return saved;
    }

    /**
     * 가입 시 제출한 사업자등록증(기관은 지정 공문 등 증빙서류) 원본을 업로드 디렉터리에
     * 저장하고 organization에 경로를 남긴다. 관리자 심사 화면이 이 파일을 그대로 열어
     * 보여준다(AdminOrgApprovalService.loadBizRegCert, 2026-08-22 강 요청).
     *
     * 저장에 실패해도 가입 자체는 막지 않는다 - 볼륨 권한 문제로 심사 첨부가 안 붙는 것보다
     * 가입이 되는 게 낫고, 관리자 화면에는 "첨부 없음"으로 표시된다.
     */
    private void storeBizRegCert(Organization org, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return;
        }
        String original = file.getOriginalFilename();
        String extension = ".pdf";
        if (original != null) {
            int dot = original.lastIndexOf('.');
            if (dot > 0 && dot < original.length() - 1 && original.length() - dot <= 6) {
                extension = original.substring(dot).toLowerCase();
            }
        }
        Path uploadDir = Path.of(documentProperties.getUploadDir()).resolve("biz-reg-certs");
        Path storedPath = uploadDir.resolve(UUID.randomUUID() + extension);
        try {
            Files.createDirectories(uploadDir);
            Files.write(storedPath, file.getBytes());
        } catch (IOException e) {
            log.warn("사업자등록증 원본 저장 실패(org={}): {} - 첨부 없이 진행합니다.",
                    org.getOrgName(), e.getMessage());
            return;
        }
        org.setBizRegCertUri(storedPath.toString());
        org.setBizRegCertName(original != null && !original.isBlank() ? original : storedPath.getFileName().toString());
        org.setBizRegCertMime(file.getContentType());
        org.setBizRegCertSize(file.getSize());
        org.setBizRegCertUploadedAt(OffsetDateTime.now());
    }

    /** parser 판정을 조직에 기록해 둔다 - 관리자 상세 화면이 "왜 수동 심사로 왔는지"를 보여준다. */
    private void recordVerdict(Organization org, BizCertVerdict verdict) {
        org.setVerifyAutoApprovable(verdict.autoApprovable());
        String reasons = String.join("\n", verdict.reasons());
        org.setVerifyReasons(reasons.length() > 1000 ? reasons.substring(0, 1000) : reasons);
        org.setVerifyCheckedAt(OffsetDateTime.now());
    }

    /**
     * parser(FastAPI) POST /verify-biz-cert 호출 - "첨부 여부만 확인"이 아니라 문서에서
     * 실제로 사업자등록번호·상호를 읽어 가입 입력값과 대조한 결과를 받는다(biz_reg.py 참고).
     * 파일이 없거나 파서 서비스 호출이 실패하면(장애·타임아웃) 가입 자체를 막지 않고
     * 관리자 수동 심사로 안전하게 폴백한다 - DocumentSlotService.autoFillFieldsFromParsedDocument
     * 와 동일한 "파서 장애가 핵심 흐름을 막으면 안 된다" 원칙.
     */
    private BizCertVerdict verifyBizCert(MultipartFile bizRegCertFile, String bizRegNo, String companyName) {
        if (bizRegCertFile == null || bizRegCertFile.isEmpty()) {
            log.warn("사업자등록증 파일 없음 - bizRegNo={} 자동승인 불가, 관리자 수동 심사로 전환", bizRegNo);
            return new BizCertVerdict(false, List.of("사업자등록증 파일이 첨부되지 않았습니다."));
        }
        try {
            Map<String, Object> result = parserClient.verifyBizCert(bizRegCertFile, bizRegNo, companyName);
            boolean autoApprovable = Boolean.TRUE.equals(result.get("auto_approvable"));
            @SuppressWarnings("unchecked")
            List<String> reasons = (List<String>) result.getOrDefault("reasons", List.of());
            return new BizCertVerdict(autoApprovable, reasons);
        } catch (RestClientException | IOException e) {
            log.warn("사업자등록증 검증 서비스 호출 실패(bizRegNo={}) - 관리자 수동 심사로 전환: {}",
                    bizRegNo, e.getMessage());
            return new BizCertVerdict(false, List.of("사업자등록증 검증 서비스를 호출하지 못했습니다: " + e.getMessage()));
        }
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
        if (request.websiteUrl() != null) {
            org.setWebsiteUrl(blankToNull(request.websiteUrl()));
        }
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

    /** org_type 코드를 가입 화면에서 쓰는 말로. 에러 메시지에서만 쓴다. */
    private static String orgTypeLabel(String orgType) {
        if (orgType == null) return "미지정";
        return switch (orgType) {
            case "MANUFACTURER" -> "제조사";
            case "RAW_SUPPLIER" -> "협력사";
            case "TEST_LAB" -> "시험·인증기관";
            case "RECYCLER" -> "재활용 처리업체";
            case "CUSTOMS" -> "세관";
            case "EU_AUTHORITY" -> "시장감독기관";
            default -> orgType;
        };
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
