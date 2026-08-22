package com.dpp.mypage.controller;

import com.dpp.mypage.dto.DomainGrantResponse;
import com.dpp.mypage.dto.MyDomainsResponse;
import com.dpp.mypage.dto.OrgRejectRequest;
import com.dpp.mypage.service.AdminOrgApprovalService;
import com.dpp.mypage.service.DomainGrantService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * 제조사 도메인 확장 - 신청(제조사) / 심사(관리자) API (2026-08-22 강 요청).
 *
 * 경로를 /me/domains* 와 /admin/domain-grants* 로 나눈 이유: nginx가 이미 /me/ 와 /admin/ 을
 * 백엔드로 프록시하고 있어서 설정을 건드리지 않아도 된다(FE/nginx.conf).
 */
@RestController
public class DomainGrantController {

    private final DomainGrantService domainGrantService;

    public DomainGrantController(DomainGrantService domainGrantService) {
        this.domainGrantService = domainGrantService;
    }

    /** DPP 생성 탭 도메인 선택기 + 마이페이지 도메인 카드. */
    @GetMapping("/me/domains")
    public ResponseEntity<MyDomainsResponse> myDomains(Authentication authentication) {
        return ResponseEntity.ok(domainGrantService.myDomains(userId(authentication)));
    }

    /**
     * 도메인 확장 신청. 증빙서류가 같이 와야 하므로 multipart로 받는다
     * (JSON 필드 + 파일을 같이 보내는 가입 API와 달리 필드가 2개뿐이라 form field로 충분).
     */
    @PostMapping(value = "/me/domains/requests", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DomainGrantResponse> request(@RequestParam("domain") String domain,
                                                        @RequestParam(value = "reason", required = false) String reason,
                                                        @RequestParam("evidence") MultipartFile evidence,
                                                        Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(domainGrantService.request(userId(authentication), domain, reason, evidence));
    }

    /** 관리자 회원 관리 탭의 「도메인 확장 심사」 목록. */
    @GetMapping("/admin/domain-grants")
    public ResponseEntity<List<DomainGrantResponse>> list(Authentication authentication) {
        return ResponseEntity.ok(domainGrantService.listForAdmin(userId(authentication)));
    }

    /** 제출된 증빙서류 원본 - 관리자 화면이 blob으로 받아 그대로 띄운다(가입 심사와 동일). */
    @GetMapping("/admin/domain-grants/{grantId}/evidence")
    public ResponseEntity<byte[]> evidence(@PathVariable Long grantId, Authentication authentication) {
        AdminOrgApprovalService.StoredFile file =
                domainGrantService.loadEvidence(userId(authentication), grantId);
        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(file.contentType());
        } catch (org.springframework.http.InvalidMediaTypeException e) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename(file.fileName(), StandardCharsets.UTF_8).toString())
                .body(file.content());
    }

    @PostMapping("/admin/domain-grants/{grantId}/approve")
    public ResponseEntity<DomainGrantResponse> approve(@PathVariable Long grantId, Authentication authentication) {
        return ResponseEntity.ok(domainGrantService.approve(userId(authentication), grantId));
    }

    @PostMapping("/admin/domain-grants/{grantId}/reject")
    public ResponseEntity<DomainGrantResponse> reject(@PathVariable Long grantId,
                                                        @RequestBody(required = false) OrgRejectRequest request,
                                                        Authentication authentication) {
        String reason = request == null ? null : request.reason();
        return ResponseEntity.ok(domainGrantService.reject(userId(authentication), grantId, reason));
    }

    private Long userId(Authentication authentication) {
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException | NullPointerException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 정보입니다.");
        }
    }
}
