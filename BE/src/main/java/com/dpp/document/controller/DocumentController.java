package com.dpp.document.controller;

import com.dpp.document.dto.BatteryCarbonUploadResponse;
import com.dpp.document.dto.CareLabelUploadResponse;
import com.dpp.document.dto.CbamUploadResponse;
import com.dpp.document.dto.OekotexUploadResponse;
import com.dpp.document.dto.RecyclingUploadResponse;
import com.dpp.document.dto.SteelMillUploadResponse;
import com.dpp.document.service.BatteryCarbonIngestService;
import com.dpp.document.service.CareLabelIngestService;
import com.dpp.document.service.CbamIngestService;
import com.dpp.document.service.DocumentIngestService;
import com.dpp.document.service.OekotexIngestService;
import com.dpp.document.service.RecyclingIngestService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * REQ-DOCUMENT: 제조사(BUSINESS) 회원의 문서 업로드 -> 파싱 -> ZKP 증명 연동.
 * 철강(Q2_05 제강성적서/Q2_06 CBAM), 섬유(Q1_04 섬유케어라벨/Q3_10 OEKO-TEX), 배터리(Q2_07
 * 배터리 탄소발자국 선언/Q4_15 재활용 처리 결과 보고서) 6개 유형 지원 - 나머지 2개 회로
 * (circuits.mjs의 RohsCheck/CeMarkingCheck)도 같은 패턴(ParserClient -> *ZkpMapper ->
 * ZkpClient)으로 확장하면 된다.
 */
@RestController
public class DocumentController {

    private final DocumentIngestService documentIngestService;
    private final CbamIngestService cbamIngestService;
    private final CareLabelIngestService careLabelIngestService;
    private final OekotexIngestService oekotexIngestService;
    private final BatteryCarbonIngestService batteryCarbonIngestService;
    private final RecyclingIngestService recyclingIngestService;

    public DocumentController(DocumentIngestService documentIngestService,
                               CbamIngestService cbamIngestService,
                               CareLabelIngestService careLabelIngestService,
                               OekotexIngestService oekotexIngestService,
                               BatteryCarbonIngestService batteryCarbonIngestService,
                               RecyclingIngestService recyclingIngestService) {
        this.documentIngestService = documentIngestService;
        this.cbamIngestService = cbamIngestService;
        this.careLabelIngestService = careLabelIngestService;
        this.oekotexIngestService = oekotexIngestService;
        this.batteryCarbonIngestService = batteryCarbonIngestService;
        this.recyclingIngestService = recyclingIngestService;
    }

    @PostMapping(value = "/document/upload/steel-mill", consumes = "multipart/form-data")
    public ResponseEntity<SteelMillUploadResponse> uploadSteelMillSheet(
            @RequestParam("file") MultipartFile file,
            @RequestParam("dppId") Long dppId,
            Authentication authentication) {
        Long userId = parseUserId(authentication);
        return ResponseEntity.ok(documentIngestService.ingestSteelMillSheet(userId, dppId, file));
    }

    @PostMapping(value = "/document/upload/cbam", consumes = "multipart/form-data")
    public ResponseEntity<CbamUploadResponse> uploadCbamReport(
            @RequestParam("file") MultipartFile file,
            @RequestParam("dppId") Long dppId,
            Authentication authentication) {
        Long userId = parseUserId(authentication);
        return ResponseEntity.ok(cbamIngestService.ingestCbamReport(userId, dppId, file));
    }

    @PostMapping(value = "/document/upload/textile-care-label", consumes = "multipart/form-data")
    public ResponseEntity<CareLabelUploadResponse> uploadCareLabel(
            @RequestParam("file") MultipartFile file,
            @RequestParam("dppId") Long dppId,
            Authentication authentication) {
        Long userId = parseUserId(authentication);
        return ResponseEntity.ok(careLabelIngestService.ingestCareLabel(userId, dppId, file));
    }

    @PostMapping(value = "/document/upload/oekotex", consumes = "multipart/form-data")
    public ResponseEntity<OekotexUploadResponse> uploadOekotexLabel(
            @RequestParam("file") MultipartFile file,
            @RequestParam("dppId") Long dppId,
            Authentication authentication) {
        Long userId = parseUserId(authentication);
        return ResponseEntity.ok(oekotexIngestService.ingestOekotexLabel(userId, dppId, file));
    }

    @PostMapping(value = "/document/upload/battery-carbon", consumes = "multipart/form-data")
    public ResponseEntity<BatteryCarbonUploadResponse> uploadBatteryCarbonReport(
            @RequestParam("file") MultipartFile file,
            @RequestParam("dppId") Long dppId,
            Authentication authentication) {
        Long userId = parseUserId(authentication);
        return ResponseEntity.ok(batteryCarbonIngestService.ingestBatteryCarbonReport(userId, dppId, file));
    }

    @PostMapping(value = "/document/upload/recycling-report", consumes = "multipart/form-data")
    public ResponseEntity<RecyclingUploadResponse> uploadRecyclingReport(
            @RequestParam("file") MultipartFile file,
            @RequestParam("dppId") Long dppId,
            Authentication authentication) {
        Long userId = parseUserId(authentication);
        return ResponseEntity.ok(recyclingIngestService.ingestRecyclingReport(userId, dppId, file));
    }

    private Long parseUserId(Authentication authentication) {
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 정보입니다.");
        }
    }
}
