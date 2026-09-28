package com.dpp.verify.controller;

import com.dpp.verify.dto.DppSearchResultDto;
import com.dpp.verify.dto.RegulatorDppDetailDto;
import com.dpp.verify.service.DppRegistryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** REQ-VERIFY: EU 시장감시/관세청 공용 DPP 검색. FE euVals.js(레지스트리)/customsVals.js(통관 조회)가 쓴다. */
@RestController
public class DppRegistryController {

    private final DppRegistryService dppRegistryService;

    public DppRegistryController(DppRegistryService dppRegistryService) {
        this.dppRegistryService = dppRegistryService;
    }

    /**
     * q는 여러 컬럼에 OR로 걸리는 자유 검색어, orgName/hsCode는 각각 그 컬럼만 좁히는
     * 개별 필터다(2026-08-23 강 요청 - 화면의 등록회사·HS 코드 칸이 실제로 동작해야 함).
     * 셋 다 비면 최신 발급 목록이 나온다.
     */
    @GetMapping("/verify/dpp/search")
    public ResponseEntity<List<DppSearchResultDto>> search(@RequestParam(required = false) String q,
                                                             @RequestParam(required = false) String orgName,
                                                             @RequestParam(required = false) String productName,
                                                             @RequestParam(required = false) String hsCode,
                                                             @RequestParam(required = false) String domain,
                                                             Authentication authentication) {
        Long userId = parseUserId(authentication);
        return ResponseEntity.ok(dppRegistryService.search(userId, q, orgName, productName, hsCode, domain));
    }

    /**
     * 규제기관 전용 상세 열람(2026-09-28 강 요청) - 개인 QR 조회보다 넓은 범위
     * (제조사 신원·공급망 참여자·증빙서류·ZKP·블록체인 앵커·통관 이력 + RESTRICTED 항목).
     */
    @GetMapping("/verify/dpp/{publicUuid}/detail")
    public ResponseEntity<RegulatorDppDetailDto> detail(@PathVariable String publicUuid,
                                                        Authentication authentication) {
        return ResponseEntity.ok(dppRegistryService.detail(parseUserId(authentication), publicUuid));
    }

    private Long parseUserId(Authentication authentication) {
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException | NullPointerException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 정보입니다.");
        }
    }
}
