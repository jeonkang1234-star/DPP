package com.dpp.customs.controller;

import com.dpp.customs.dto.CustomsCaseDetailDto;
import com.dpp.customs.dto.CustomsCaseSummaryDto;
import com.dpp.customs.dto.CustomsClearanceRequestDto;
import com.dpp.customs.dto.CustomsDecisionRequestDto;
import com.dpp.customs.entity.CustomsClearance;
import com.dpp.customs.service.CustomsClearanceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

/**
 * 세관 통관 심사 API - 2026-08-19 강 요청. /customs/clearance-requests는 제조사(DPP
 * 소유 조직)가 호출하고, /customs/queue* 는 세관(org_type=CUSTOMS) 계정이 호출한다 -
 * 권한 검증은 CustomsClearanceService가 소속 조직 기준으로 한다(컨트롤러는 인증 주체
 * 파싱만).
 */
@RestController
@RequestMapping("/customs")
public class CustomsClearanceController {

    private final CustomsClearanceService customsClearanceService;

    public CustomsClearanceController(CustomsClearanceService customsClearanceService) {
        this.customsClearanceService = customsClearanceService;
    }

    /** DPP 소유 조직이 통관 신청 제출 - 수출/수입 양쪽에서 관할이 맞는 세관마다 케이스가 생성된다. */
    @PostMapping("/clearance-requests")
    public ResponseEntity<Map<String, Object>> createRequest(@Valid @RequestBody CustomsClearanceRequestDto request,
                                                               Authentication authentication) {
        Long userId = parseUserId(authentication);
        List<CustomsClearance> created = customsClearanceService.createRequest(
                userId, request.dppId(), request.importCountryCode(), request.importerName(),
                request.importerAddress(), request.importerEori(), request.declaredHsCode());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("createdCount", created.size()));
    }

    /** 세관 큐 - 기본은 심사 대기(PENDING). ?decided=true면 이미 결정 난 이력(clearLog). */
    @GetMapping("/queue")
    public ResponseEntity<List<CustomsCaseSummaryDto>> listQueue(
            @RequestParam(required = false, defaultValue = "false") boolean decided,
            Authentication authentication) {
        Long userId = parseUserId(authentication);
        return ResponseEntity.ok(customsClearanceService.listQueue(userId, decided));
    }

    @GetMapping("/queue/{clearanceId}")
    public ResponseEntity<CustomsCaseDetailDto> getCase(@PathVariable Long clearanceId, Authentication authentication) {
        Long userId = parseUserId(authentication);
        return ResponseEntity.ok(customsClearanceService.getCase(userId, clearanceId));
    }

    @PostMapping("/queue/{clearanceId}/decision")
    public ResponseEntity<CustomsCaseDetailDto> decide(@PathVariable Long clearanceId,
                                                         @Valid @RequestBody CustomsDecisionRequestDto request,
                                                         Authentication authentication) {
        Long userId = parseUserId(authentication);
        return ResponseEntity.ok(customsClearanceService.decide(userId, clearanceId, request.decision(), request.reason()));
    }

    private Long parseUserId(Authentication authentication) {
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException | NullPointerException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 정보입니다.");
        }
    }
}
