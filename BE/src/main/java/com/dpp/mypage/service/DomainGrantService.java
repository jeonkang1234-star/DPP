package com.dpp.mypage.service;

import com.dpp.audit.service.AuditLogService;
import com.dpp.auth.entity.AccountType;
import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.document.config.DocumentIntegrationProperties;
import com.dpp.mypage.dto.DomainGrantResponse;
import com.dpp.mypage.dto.MyDomainsResponse;
import com.dpp.mypage.entity.OrgDomainGrant;
import com.dpp.mypage.entity.Organization;
import com.dpp.mypage.repository.OrgDomainGrantRepository;
import com.dpp.mypage.repository.OrganizationRepository;
import com.dpp.notify.entity.Notification;
import com.dpp.notify.entity.NotificationCategory;
import com.dpp.notify.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * 제조사 도메인 확장 - 신청 -> 관리자 심사 -> 승인된 도메인으로 DPP 발급
 * (2026-08-22 강 요청).
 *
 * 허용 도메인 = organization.domain(가입 시 확정된 주력 도메인) + org_domain_grant의
 * APPROVED 행. 주력 도메인을 표에도 backfill해 뒀지만(V29), 계산에서 둘 다 보는 이유는
 * 나중에 가입한 조직이 backfill을 못 받아도 자기 주력 도메인은 항상 쓸 수 있어야 하기
 * 때문이다.
 */
@Service
public class DomainGrantService {

    private static final Logger log = LoggerFactory.getLogger(DomainGrantService.class);

    private static final Set<String> ALLOWED_DOMAINS = Set.of("STEEL", "TEXTILE", "BATTERY");

    /** 도메인 확장을 신청할 수 있는 조직 유형 - 제조사만. 협력사·기관은 자기 DPP를 발급하지 않는다. */
    private static final Set<String> REQUESTABLE_ORG_TYPES = Set.of("MANUFACTURER");

    private final OrgDomainGrantRepository grantRepository;
    private final OrganizationRepository organizationRepository;
    private final UserAccountRepository userAccountRepository;
    private final NotificationRepository notificationRepository;
    private final DocumentIntegrationProperties documentProperties;
    private final AuditLogService auditLogService;

    public DomainGrantService(OrgDomainGrantRepository grantRepository,
                               OrganizationRepository organizationRepository,
                               UserAccountRepository userAccountRepository,
                               NotificationRepository notificationRepository,
                               DocumentIntegrationProperties documentProperties,
                               AuditLogService auditLogService) {
        this.grantRepository = grantRepository;
        this.organizationRepository = organizationRepository;
        this.userAccountRepository = userAccountRepository;
        this.notificationRepository = notificationRepository;
        this.documentProperties = documentProperties;
        this.auditLogService = auditLogService;
    }

    // ── 제조사 쪽 ────────────────────────────────────────────────

    /** DPP 생성 탭의 도메인 선택기 + 마이페이지 도메인 카드가 함께 쓰는 응답. */
    @Transactional(readOnly = true)
    public MyDomainsResponse myDomains(Long userId) {
        Organization org = requireOrg(userId);
        List<String> allowed = allowedDomains(org);
        List<MyDomainsResponse.DomainOption> options = allowed.stream()
                .map(d -> new MyDomainsResponse.DomainOption(d, DomainGrantResponse.domainLabel(d)))
                .toList();
        List<DomainGrantResponse> grants = grantRepository.findByOrgIdOrderByRequestedAtDesc(org.getOrgId())
                .stream().map(g -> DomainGrantResponse.of(g, org.getOrgName())).toList();
        return new MyDomainsResponse(org.getDomain(), options, grants);
    }

    /**
     * 도메인 확장 신청. 증빙서류는 필수다 - 관리자가 눈으로 확인할 근거가 없으면 심사 자체가
     * 성립하지 않는다(가입 심사에서 사업자등록증을 필수로 둔 것과 같은 이유).
     *
     * 이미 쓸 수 있는 도메인이면 400. 심사 대기 중이면 400. 반려됐던 건은 같은 행을
     * PENDING으로 되돌려 재신청으로 처리한다(ux_org_domain_grant 유니크 제약 때문에
     * 새 행을 만들 수 없다).
     */
    @Transactional
    public DomainGrantResponse request(Long userId, String domainInput, String reason, MultipartFile evidence) {
        Organization org = requireOrg(userId);
        if (org.getOrgType() == null || !REQUESTABLE_ORG_TYPES.contains(org.getOrgType())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "제조사 계정만 도메인 확장을 신청할 수 있습니다.");
        }
        String domain = domainInput == null ? null : domainInput.trim().toUpperCase();
        if (domain == null || !ALLOWED_DOMAINS.contains(domain)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "지원하지 않는 도메인입니다. STEEL/BATTERY/TEXTILE 중에서 선택해 주세요.");
        }
        if (allowedDomains(org).contains(domain)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    DomainGrantResponse.domainLabel(domain) + " 도메인은 이미 사용할 수 있습니다.");
        }
        if (evidence == null || evidence.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "증빙서류를 첨부해 주세요.");
        }

        OrgDomainGrant grant = grantRepository.findByOrgIdAndDomain(org.getOrgId(), domain)
                .orElseGet(OrgDomainGrant::new);
        if ("PENDING".equals(grant.getStatus()) && grant.getGrantId() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    DomainGrantResponse.domainLabel(domain) + " 도메인은 이미 심사 대기 중입니다.");
        }
        grant.setOrgId(org.getOrgId());
        grant.setDomain(domain);
        grant.setStatus("PENDING");
        grant.setRequestReason(trimTo(reason, 500));
        grant.setRejectReason(null);
        grant.setRequestedBy(userId);
        grant.setRequestedAt(OffsetDateTime.now());
        grant.setDecidedBy(null);
        grant.setDecidedAt(null);
        storeEvidence(grant, evidence);
        OrgDomainGrant saved = grantRepository.save(grant);

        notifyAdmins(org, domain);
        log.info("도메인 확장 신청: org_id={}, domain={}, grant_id={}", org.getOrgId(), domain, saved.getGrantId());
        return DomainGrantResponse.of(saved, org.getOrgName());
    }

    // ── 관리자 쪽 ────────────────────────────────────────────────

    /** 회원 관리 탭의 「도메인 확장 심사」 목록. */
    @Transactional(readOnly = true)
    public List<DomainGrantResponse> listForAdmin(Long adminUserId) {
        requireAdmin(adminUserId);
        // 가입 시 backfill된 주력 도메인 행(request_reason이 그 문구)은 심사 대상이 아니라
        // 목록에서 뺀다 - 관리자가 볼 것은 실제로 신청이 들어온 건뿐이다.
        return grantRepository.findAllByOrderByRequestedAtDesc().stream()
                .filter(g -> g.getRequestedBy() != null)
                .map(g -> DomainGrantResponse.of(g, orgNameOf(g.getOrgId())))
                .toList();
    }

    /** 심사 화면에서 그대로 열어볼 증빙서류 원본. */
    @Transactional(readOnly = true)
    public AdminOrgApprovalService.StoredFile loadEvidence(Long adminUserId, Long grantId) {
        requireAdmin(adminUserId);
        OrgDomainGrant grant = requireGrant(grantId);
        String uri = grant.getEvidenceUri();
        if (uri == null || uri.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "제출된 증빙서류가 없습니다.");
        }
        Path path = Path.of(uri);
        if (!Files.isReadable(path)) {
            log.warn("도메인 확장 증빙서류를 찾을 수 없음: grant={}, uri={}", grantId, uri);
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "증빙서류 원본을 찾을 수 없습니다.");
        }
        try {
            String name = grant.getEvidenceName() != null && !grant.getEvidenceName().isBlank()
                    ? grant.getEvidenceName() : path.getFileName().toString();
            String mime = grant.getEvidenceMime() != null && !grant.getEvidenceMime().isBlank()
                    ? grant.getEvidenceMime() : "application/octet-stream";
            return new AdminOrgApprovalService.StoredFile(Files.readAllBytes(path), name, mime);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "증빙서류를 읽지 못했습니다.", e);
        }
    }

    @Transactional
    public DomainGrantResponse approve(Long adminUserId, Long grantId) {
        requireAdmin(adminUserId);
        OrgDomainGrant grant = requireGrant(grantId);
        grant.setStatus("APPROVED");
        grant.setRejectReason(null);
        grant.setDecidedBy(adminUserId);
        grant.setDecidedAt(OffsetDateTime.now());
        OrgDomainGrant saved = grantRepository.save(grant);
        String label = DomainGrantResponse.domainLabel(grant.getDomain());
        notifyOrg(grant.getOrgId(), label + " 도메인 확장이 승인되었습니다",
                "이제 DPP 생성 탭에서 " + label + " 도메인을 선택해 발급할 수 있습니다.", "/steel/input");
        auditLogService.record(adminUserId, "APPROVE", "ORGANIZATION", grant.getOrgId(),
                orgNameOf(grant.getOrgId()) + " · " + label + " 도메인 확장", "성공", null);
        log.info("관리자 {} 가 조직 {} 의 {} 도메인 확장을 승인", adminUserId, grant.getOrgId(), grant.getDomain());
        return DomainGrantResponse.of(saved, orgNameOf(grant.getOrgId()));
    }

    @Transactional
    public DomainGrantResponse reject(Long adminUserId, Long grantId, String reason) {
        requireAdmin(adminUserId);
        OrgDomainGrant grant = requireGrant(grantId);
        grant.setStatus("REJECTED");
        grant.setRejectReason(trimTo(reason == null || reason.isBlank() ? "관리자 심사 결과 반려" : reason, 500));
        grant.setDecidedBy(adminUserId);
        grant.setDecidedAt(OffsetDateTime.now());
        OrgDomainGrant saved = grantRepository.save(grant);
        String label = DomainGrantResponse.domainLabel(grant.getDomain());
        notifyOrg(grant.getOrgId(), label + " 도메인 확장이 반려되었습니다",
                saved.getRejectReason(), null);
        auditLogService.record(adminUserId, "REJECT", "ORGANIZATION", grant.getOrgId(),
                orgNameOf(grant.getOrgId()) + " · " + label + " 도메인 확장", saved.getRejectReason(), null);
        return DomainGrantResponse.of(saved, orgNameOf(grant.getOrgId()));
    }

    // ── 다른 서비스가 쓰는 조회 ──────────────────────────────────

    /**
     * 이 조직이 DPP를 발급할 수 있는 도메인 전부. FieldFormService가 발급 요청의 도메인을
     * 검증할 때도 쓴다 - 화면에서 못 고르게 막는 것만으로는 부족하다.
     */
    @Transactional(readOnly = true)
    public List<String> allowedDomainsForOrg(Long orgId) {
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "조직을 찾을 수 없습니다."));
        return allowedDomains(org);
    }

    private List<String> allowedDomains(Organization org) {
        // LinkedHashSet - 주력 도메인이 항상 첫 번째로 오게(화면 기본 선택값이 된다).
        Set<String> set = new LinkedHashSet<>();
        if (org.getDomain() != null && ALLOWED_DOMAINS.contains(org.getDomain())) {
            set.add(org.getDomain());
        }
        for (OrgDomainGrant g : grantRepository.findByOrgIdAndStatus(org.getOrgId(), "APPROVED")) {
            if (ALLOWED_DOMAINS.contains(g.getDomain())) {
                set.add(g.getDomain());
            }
        }
        return new ArrayList<>(set);
    }

    // ── 내부 helper ─────────────────────────────────────────────

    private void storeEvidence(OrgDomainGrant grant, MultipartFile file) {
        String original = file.getOriginalFilename();
        String extension = ".pdf";
        if (original != null) {
            int dot = original.lastIndexOf('.');
            if (dot > 0 && dot < original.length() - 1 && original.length() - dot <= 6) {
                extension = original.substring(dot).toLowerCase();
            }
        }
        Path uploadDir = Path.of(documentProperties.getUploadDir()).resolve("domain-grants");
        Path storedPath = uploadDir.resolve(UUID.randomUUID() + extension);
        try {
            Files.createDirectories(uploadDir);
            Files.write(storedPath, file.getBytes());
        } catch (IOException e) {
            // 증빙서류가 없으면 심사가 성립하지 않으므로, 여기서는 가입과 달리 신청 자체를 막는다.
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "증빙서류 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.", e);
        }
        grant.setEvidenceUri(storedPath.toString());
        grant.setEvidenceName(original != null && !original.isBlank() ? original : storedPath.getFileName().toString());
        grant.setEvidenceMime(file.getContentType());
        grant.setEvidenceSize(file.getSize());
    }

    private void notifyAdmins(Organization org, String domain) {
        String label = DomainGrantResponse.domainLabel(domain);
        for (UserAccount admin : userAccountRepository.findByAccountType(AccountType.ADMIN)) {
            Notification n = new Notification();
            n.setRecipientUserId(admin.getUserId());
            n.setCategory(NotificationCategory.ACCOUNT);
            n.setSubType("DOMAIN_GRANT");
            n.setTitle("[도메인 확장] " + label + " 심사 요청이 접수되었습니다");
            n.setBody(org.getOrgName() + " 이(가) " + label + " 도메인 확장을 신청했습니다. "
                    + "회원 관리에서 제출 서류를 확인하고 심사해 주세요.");
            n.setLinkUrl("/admin/approvals?tab=domain");
            notificationRepository.save(n);
        }
    }

    private void notifyOrg(Long orgId, String title, String body, String linkUrl) {
        for (UserAccount member : userAccountRepository.findByOrgId(orgId)) {
            Notification n = new Notification();
            n.setRecipientUserId(member.getUserId());
            n.setCategory(NotificationCategory.SYSTEM);
            n.setSubType("DOMAIN_GRANT");
            n.setTitle(title);
            n.setBody(body);
            n.setLinkUrl(linkUrl);
            notificationRepository.save(n);
        }
    }

    private String orgNameOf(Long orgId) {
        return organizationRepository.findById(orgId).map(Organization::getOrgName).orElse("(삭제된 조직)");
    }

    private OrgDomainGrant requireGrant(Long grantId) {
        return grantRepository.findById(grantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "신청 건을 찾을 수 없습니다."));
    }

    private Organization requireOrg(Long userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 사용자입니다."));
        if (user.getOrgId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "소속 조직이 없는 계정입니다.");
        }
        return organizationRepository.findById(user.getOrgId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "조직을 찾을 수 없습니다."));
    }

    private void requireAdmin(Long userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 사용자입니다."));
        if (user.getAccountType() != AccountType.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 접근할 수 있습니다.");
        }
    }

    private static String trimTo(String v, int max) {
        if (v == null) {
            return null;
        }
        String t = v.trim();
        return t.length() <= max ? t : t.substring(0, max);
    }
}
