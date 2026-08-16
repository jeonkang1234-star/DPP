package com.dpp.verify.controller;

import com.dpp.verify.dto.DppSearchResultDto;
import com.dpp.verify.service.DppRegistryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
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

    @GetMapping("/verify/dpp/search")
    public ResponseEntity<List<DppSearchResultDto>> search(@RequestParam(required = false) String q,
                                                             Authentication authentication) {
        Long userId = parseUserId(authentication);
        return ResponseEntity.ok(dppRegistryService.search(userId, q));
    }

    private Long parseUserId(Authentication authentication) {
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException | NullPointerException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 정보입니다.");
        }
    }
}
