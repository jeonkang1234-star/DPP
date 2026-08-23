package com.dpp.mypage.controller;

import com.dpp.mypage.dto.PersonalProductDto;
import com.dpp.mypage.dto.RecordScanRequest;
import com.dpp.mypage.dto.ScanSummaryDto;
import com.dpp.mypage.service.ScanHistoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * REQ-MYPAGE(개인): GET /me/scans, GET /me/scans/search, POST /me/scans,
 * DELETE /me/scans/{id}. openapi.yaml Personal 태그 참고.
 *
 * 검색을 규제기관용 /verify/dpp/search가 아니라 여기에 둔 이유(2026-08-23): 개인 회원이
 * 볼 수 있는 범위가 완전히 다르다. 자세한 건 PersonalProductSearchRepository 주석 참고.
 */
@RestController
@RequestMapping("/me/scans")
public class ScanHistoryController {

    private final ScanHistoryService scanHistoryService;

    public ScanHistoryController(ScanHistoryService scanHistoryService) {
        this.scanHistoryService = scanHistoryService;
    }

    /** 최근 조회 기록(최대 5건). */
    @GetMapping
    public ResponseEntity<List<ScanSummaryDto>> list(Authentication authentication) {
        return ResponseEntity.ok(scanHistoryService.getScans(parseUserId(authentication)));
    }

    /** 제품명·브랜드 검색. 검색어가 2자 미만이면 빈 배열(에러가 아니다 - 입력 중인 상태). */
    @GetMapping("/search")
    public ResponseEntity<List<PersonalProductDto>> search(Authentication authentication,
                                                            @RequestParam(required = false) String q) {
        return ResponseEntity.ok(scanHistoryService.searchProducts(parseUserId(authentication), q));
    }

    /** 공개 여권 열람 기록 남기기 - 같은 제품이면 새 행 대신 열람 일시만 갱신된다. */
    @PostMapping
    public ResponseEntity<ScanSummaryDto> record(Authentication authentication,
                                                   @Valid @RequestBody RecordScanRequest request) {
        return ResponseEntity.ok(scanHistoryService.recordScan(parseUserId(authentication), request.publicUuid()));
    }

    @DeleteMapping("/{scanId}")
    public ResponseEntity<Void> remove(Authentication authentication, @PathVariable Long scanId) {
        scanHistoryService.removeScan(parseUserId(authentication), scanId);
        return ResponseEntity.noContent().build();
    }

    private Long parseUserId(Authentication authentication) {
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException | NullPointerException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 정보입니다.");
        }
    }
}
