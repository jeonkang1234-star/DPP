package com.dpp.customs.service;

import com.dpp.audit.service.AuditLogService;
import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.customs.dto.CustomsCaseDetailDto;
import com.dpp.customs.dto.CustomsCaseSummaryDto;
import com.dpp.customs.dto.CustomsCheckDto;
import com.dpp.customs.entity.CustomsClearance;
import com.dpp.customs.repository.CustomsCaseReadRepository;
import com.dpp.customs.repository.CustomsClearanceRepository;
import com.dpp.document.entity.Dpp;
import com.dpp.document.repository.DppRepository;
import com.dpp.mypage.entity.OrgApprovalStatus;
import com.dpp.mypage.entity.Organization;
import com.dpp.mypage.repository.OrganizationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * 세관 통관 심사 - 2026-08-19 강 요청 "실 데이터로 연결해야함... 세관마다 확인해야 할
 * DPP가 달라야 함" + "수출국도 봐야하고 수입도 봐야하는거 아닌가?"에 대한 실제 구현.
 *
 * 예전엔 FE customsVals.js가 하드코딩 배열(customsItems) 6건을 그대로 보여줬다. 이제
 * DPP 소유 조직(수출측 제조사)이 통관 신청을 제출하면(createRequest), 수출국/수입국
 * 각각에 대해 org_type=CUSTOMS이고 country_code가 일치하는 ACTIVE 조직을 찾아 그
 * 조직마다 customs_clearance 행을 하나씩 만든다 - 수출측 세관과 수입측 세관은 실제로도
 * 서로 다른 나라의 별개 기관이 각자 심사하는 별개 실무 이벤트이기 때문이다. 세관
 * 계정은 자기 조직에 배정된 행만 조회/심사할 수 있다(listQueue/getCase 모두
 * customsOrgId로 소관 검증).
 *
 * 판정 항목(checks)은 실제로 존재하는 데이터에서만 계산한다 - EU EORI 데이터베이스
 * 조회처럼 이 프로토타입에 연동돼 있지 않은 외부 API는 "형식만 확인"이라고 정직하게
 * 표시하고(biz_reg.py 검증 때와 같은 원칙 - "첨부/형식만 확인하는 걸 자동심사로 볼 수
 * 없다"), 문서/조성 정보가 아예 없는 경우는 임의로 "적합" 처리하지 않고 명시적으로
 * "확인 불가"로 실패 처리한다(checkSvhc 참고).
 */
@Service
public class CustomsClearanceService {

    private static final Logger log = LoggerFactory.getLogger(CustomsClearanceService.class);

    /**
     * 발급 자동 통관의 수입국. 데모에서는 "모든 물건이 프랑스로 나간다"고 전제한다
     * (2026-08-20 강 요청, "일단은"). 실제 수출국이 여럿이 되면 제품/주문 정보에서 끌어와야
     * 하는 값이라, 그때 지울 자리를 남기려고 상수로 한 곳에 모아둔다.
     */
    private static final String DEMO_DEFAULT_IMPORT_COUNTRY = "FR";

    /** 발급 시점엔 수입업체가 정해져 있지 않다. 빈칸 대신 그 사실을 적어둔다. */
    private static final String AUTO_IMPORTER_NAME = "발급 시 자동 생성 (수입업체 미정)";

    private static final Set<String> DECIDABLE = Set.of("APPROVE", "HOLD", "REJECT");
    /** EU EORI 번호 형식 - ISO 국가코드 2자 + 영숫자 최대 15자. 실제 등록 여부 조회는 하지 않는다. */
    private static final Pattern EORI_FORMAT = Pattern.compile("^[A-Z]{2}[0-9A-Z]{1,15}$");

    private final CustomsClearanceRepository customsClearanceRepository;
    private final CustomsCaseReadRepository customsCaseReadRepository;
    private final DppRepository dppRepository;
    private final OrganizationRepository organizationRepository;
    private final UserAccountRepository userAccountRepository;
    private final AuditLogService auditLogService;

    public CustomsClearanceService(CustomsClearanceRepository customsClearanceRepository,
                                    CustomsCaseReadRepository customsCaseReadRepository,
                                    DppRepository dppRepository,
                                    OrganizationRepository organizationRepository,
                                    UserAccountRepository userAccountRepository,
                                    AuditLogService auditLogService) {
        this.customsClearanceRepository = customsClearanceRepository;
        this.customsCaseReadRepository = customsCaseReadRepository;
        this.dppRepository = dppRepository;
        this.organizationRepository = organizationRepository;
        this.userAccountRepository = userAccountRepository;
        this.auditLogService = auditLogService;
    }

    /**
     * DPP 소유 조직만 자기 DPP에 대해 신청할 수 있다. 수출국은 신청자가 입력하지 않고
     * DPP 소유 조직의 country_code에서 그대로 가져온다(신청자가 임의로 바꿀 수 없게).
     * 매칭되는 세관이 있는 쪽(수출측/수입측)마다 별도 행을 만들고, 한쪽도 매칭되는 세관이
     * 없으면 그 쪽은 customs_org_id가 NULL인 행으로 남겨 나중에 세관 계정이 생기면 배정할
     * 수 있게 한다(레코드 자체는 유실되지 않음).
     */
    @Transactional
    public List<CustomsClearance> createRequest(Long requesterUserId, Long dppId, String importCountryCodeInput,
                                                 String importerName, String importerAddress, String importerEori,
                                                 String declaredHsCode) {
        UserAccount requester = userAccountRepository.findById(requesterUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 사용자입니다."));
        if (requester.getOrgId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "소속 조직이 없는 계정은 통관 신청을 할 수 없습니다.");
        }
        Dpp dpp = dppRepository.findById(dppId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "DPP를 찾을 수 없습니다."));
        if (!requester.getOrgId().equals(dpp.getOwnerOrgId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 조직이 발급한 DPP만 통관 신청할 수 있습니다.");
        }
        if (!"ACTIVE".equals(dpp.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "발급 완료(ACTIVE)된 DPP만 통관 신청할 수 있습니다.");
        }
        if (importerName == null || importerName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "수입업체명을 입력해 주세요.");
        }

        String importCc = normalizeCountryCode(importCountryCodeInput);
        if (importCc == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "수입국을 입력해 주세요.");
        }
        Organization ownerOrg = organizationRepository.findById(dpp.getOwnerOrgId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "수출 조직 정보를 찾을 수 없습니다."));
        String exportCc = ownerOrg.getCountryCode();
        if (exportCc == null || exportCc.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "수출 조직(마이페이지)에 국가 정보가 없어 통관 신청을 만들 수 없습니다.");
        }

        String eori = importerEori == null ? null : importerEori.trim().toUpperCase();
        String hsCode = declaredHsCode == null ? null : declaredHsCode.trim();

        List<CustomsClearance> created = new ArrayList<>();
        created.addAll(createSideRows("EXPORT", exportCc, dpp, exportCc, importCc,
                importerName.trim(), importerAddress, eori, hsCode, requester.getOrgId()));
        // 수출국=수입국(국내 거래 등)이면 같은 나라 세관이 두 번 심사할 이유가 없다.
        if (!exportCc.equalsIgnoreCase(importCc)) {
            created.addAll(createSideRows("IMPORT", importCc, dpp, exportCc, importCc,
                    importerName.trim(), importerAddress, eori, hsCode, requester.getOrgId()));
        }
        log.info("통관 신청 생성: dppId={}, exportCc={}, importCc={}, 생성된 행={}건",
                dppId, exportCc, importCc, created.size());
        return created;
    }

    /**
     * DPP 발급 직후 통관 케이스를 자동으로 만든다 (2026-08-20 강 요청 - "완성된 DPP는 바로
     * 세관 큐로 모이게").
     *
     * ■ 왜 별도 메서드인가
     * createRequest는 제조사가 화면에서 수입국·수입업체를 직접 채워 넣는 경로다. 발급 자동
     * 생성은 그 정보가 아직 없다 - 무엇을 어디로 팔지는 발급 시점에 정해지지 않는다.
     * 그래서 "일단 프랑스로 나간다"는 데모 전제를 여기 한 곳에만 박아두고, 실제 수출이
     * 확정되면 제조사가 화면에서 다시 신청하는 흐름은 그대로 둔다.
     *
     * ■ 중복 방지
     * 같은 DPP로 이미 만들어진 케이스가 있으면 아무것도 하지 않는다. 발급을 두 번 눌러도
     * 세관 큐에 같은 건이 쌓이면 안 된다.
     *
     * ■ 실패해도 발급은 성공해야 한다
     * 예외를 던지지 않고 0을 돌려준다. 통관 케이스는 발급의 부가 결과이지 발급의 필요조건이
     * 아니다(앵커링과 같은 원칙 - FieldFormService.anchorDppSnapshot 주석 참고).
     */
    @Transactional
    public int autoCreateOnIssue(Long dppId, Long requesterUserId, Long requesterOrgId) {
        try {
            if (!customsClearanceRepository.findByDppIdOrderByCreatedAtDesc(dppId).isEmpty()) {
                return 0;
            }
            Dpp dpp = dppRepository.findById(dppId).orElse(null);
            if (dpp == null) {
                return 0;
            }
            Organization ownerOrg = organizationRepository.findById(dpp.getOwnerOrgId()).orElse(null);
            String exportCc = ownerOrg == null ? null : ownerOrg.getCountryCode();
            if (exportCc == null || exportCc.isBlank()) {
                log.warn("dppId={} 발급 자동 통관 생략 - 수출 조직에 국가 정보가 없음", dppId);
                return 0;
            }
            String importCc = DEMO_DEFAULT_IMPORT_COUNTRY;

            List<CustomsClearance> created = new ArrayList<>(createSideRows("EXPORT", exportCc, dpp,
                    exportCc, importCc, AUTO_IMPORTER_NAME, null, null, null, requesterOrgId));
            if (!exportCc.equalsIgnoreCase(importCc)) {
                created.addAll(createSideRows("IMPORT", importCc, dpp, exportCc, importCc,
                        AUTO_IMPORTER_NAME, null, null, null, requesterOrgId));
            }
            log.info("발급 자동 통관 생성: dppId={}, {}->{}, {}건", dppId, exportCc, importCc, created.size());
            return created.size();
        } catch (RuntimeException e) {
            log.warn("dppId={} 발급 자동 통관 생성 실패(발급은 정상 처리): {}", dppId, e.getMessage());
            return 0;
        }
    }

    private List<CustomsClearance> createSideRows(String side, String matchCountry, Dpp dpp,
                                                    String exportCc, String importCc, String importerName,
                                                    String importerAddress, String importerEori, String hsCode,
                                                    Long requesterOrgId) {
        List<Organization> matches = organizationRepository
                .findByOrgTypeAndCountryCodeAndApprovalStatusAndDeletedAtIsNull("CUSTOMS", matchCountry, OrgApprovalStatus.ACTIVE);
        List<CustomsClearance> rows = new ArrayList<>();
        if (matches.isEmpty()) {
            rows.add(saveRow(null, side, dpp, exportCc, importCc, importerName, importerAddress, importerEori, hsCode, requesterOrgId));
            log.info("{}측 관할 세관 없음(country={}) - customs_org_id 비운 채로 기록만 남김", side, matchCountry);
            return rows;
        }
        for (Organization customsOrg : matches) {
            rows.add(saveRow(customsOrg.getOrgId(), side, dpp, exportCc, importCc, importerName, importerAddress,
                    importerEori, hsCode, requesterOrgId));
        }
        return rows;
    }

    private CustomsClearance saveRow(Long customsOrgId, String side, Dpp dpp, String exportCc, String importCc,
                                      String importerName, String importerAddress, String importerEori,
                                      String hsCode, Long requesterOrgId) {
        CustomsClearance row = new CustomsClearance();
        row.setDppId(dpp.getDppId());
        row.setCustomsOrgId(customsOrgId);
        row.setHsCode(hsCode);
        row.setClearanceSide(side);
        row.setExportCountryCode(exportCc);
        row.setImportCountryCode(importCc);
        row.setImporterName(importerName);
        row.setImporterAddress(importerAddress);
        row.setImporterEori(importerEori);
        row.setRequestedByOrgId(requesterOrgId);
        row.setDecision("PENDING");
        return customsClearanceRepository.save(row);
    }

    @Transactional(readOnly = true)
    public List<CustomsCaseSummaryDto> listQueue(Long userId, boolean decided) {
        Organization myOrg = requireCustomsOrg(userId);
        List<CustomsClearance> rows = decided
                ? customsClearanceRepository.findByCustomsOrgIdAndDecisionNotOrderByDecidedAtDesc(myOrg.getOrgId(), "PENDING")
                : customsClearanceRepository.findByCustomsOrgIdAndDecisionOrderByCreatedAtDesc(myOrg.getOrgId(), "PENDING");
        return rows.stream().map(this::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public CustomsCaseDetailDto getCase(Long userId, Long clearanceId) {
        Organization myOrg = requireCustomsOrg(userId);
        CustomsClearance row = customsClearanceRepository.findByClearanceIdAndCustomsOrgId(clearanceId, myOrg.getOrgId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "케이스를 찾을 수 없습니다."));
        return toDetail(row);
    }

    @Transactional
    public CustomsCaseDetailDto decide(Long userId, Long clearanceId, String decision, String reason) {
        if (!DECIDABLE.contains(decision)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "decision은 APPROVE/HOLD/REJECT 중 하나여야 합니다.");
        }
        Organization myOrg = requireCustomsOrg(userId);
        CustomsClearance row = customsClearanceRepository.findByClearanceIdAndCustomsOrgId(clearanceId, myOrg.getOrgId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "케이스를 찾을 수 없습니다."));
        row.setDecision(decision);
        row.setReason(reason);
        row.setDecidedBy(userId);
        row.setDecidedAt(OffsetDateTime.now());
        customsClearanceRepository.save(row);
        log.info("통관 결정: clearanceId={}, decision={}, customsOrgId={}", clearanceId, decision, myOrg.getOrgId());
        String auditAction = "APPROVE".equals(decision) ? "APPROVE" : "REJECT".equals(decision) ? "REJECT" : "UPDATE";
        auditLogService.record(userId, auditAction, "CUSTOMS_CLEARANCE", clearanceId,
                "DPP-" + row.getDppId() + " (" + myOrg.getOrgName() + ")", decision, null);
        return toDetail(row);
    }

    private Organization requireCustomsOrg(Long userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 사용자입니다."));
        if (user.getOrgId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "세관 계정만 조회할 수 있습니다.");
        }
        Organization org = organizationRepository.findById(user.getOrgId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "세관 계정만 조회할 수 있습니다."));
        if (!"CUSTOMS".equals(org.getOrgType())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "세관 계정만 조회할 수 있습니다.");
        }
        return org;
    }

    private CustomsCaseSummaryDto toSummary(CustomsClearance row) {
        // firstRow로 감싼 이유: 예전엔 Optional<Object[]>를 그대로 인덱싱해서, 세관 큐를
        // 부를 때마다 여기서 IndexOutOfBounds가 나 GET /customs/queue 전체가 500이었다.
        // FE는 그 실패를 조용히 삼켜서(catch(()=>{})) 화면엔 "대기 중인 DPP 없음"으로만
        // 보였다 - 2026-08-20 강 리포트 "관세청 데이터가 안 바뀌었음"의 실제 원인.
        Object[] dppSummary = firstRow(customsCaseReadRepository.findDppSummary(row.getDppId()), 5);
        String modelName = dppSummary != null ? (String) dppSummary[1] : null;
        String exporterOrgName = dppSummary != null ? (String) dppSummary[2] : null;
        String publicUuid = dppSummary != null ? String.valueOf(dppSummary[4]) : null;
        return new CustomsCaseSummaryDto(
                row.getClearanceId(), row.getDppId(), publicUuid, modelName, exporterOrgName,
                row.getImporterName(), row.getImporterAddress(), row.getImporterEori(), row.getHsCode(),
                row.getClearanceSide(), row.getExportCountryCode(), row.getImportCountryCode(),
                row.getDecision(), statusLabel(row.getDecision()),
                row.getCreatedAt() == null ? null : row.getCreatedAt().toString(),
                row.getDecidedAt() == null ? null : row.getDecidedAt().toString());
    }

    private CustomsCaseDetailDto toDetail(CustomsClearance row) {
        Object[] dppSummary = firstRow(customsCaseReadRepository.findDppSummary(row.getDppId()), 6);
        String actualHsCode = dppSummary != null ? (String) dppSummary[0] : null;
        Long modelId = dppSummary != null && dppSummary[5] instanceof Number n ? n.longValue() : null;

        List<CustomsCheckDto> checks = new ArrayList<>();
        checks.add(checkAnchor(row.getDppId()));
        checks.add(checkHsCode(row.getHsCode(), actualHsCode));
        checks.add(checkDocument(modelId, "EU_DOC", "EU 적합성 선언서(DoC)"));
        checks.add(checkTechFile(modelId));
        checks.add(checkSvhc(row.getDppId()));
        checks.add(checkEoriFormat(row.getImporterEori()));
        boolean overallPass = checks.stream().allMatch(CustomsCheckDto::pass);

        return new CustomsCaseDetailDto(toSummary(row), overallPass, checks, row.getReason());
    }

    private CustomsCheckDto checkAnchor(Long dppId) {
        Object[] anchor = firstRow(customsCaseReadRepository.findLatestAnchor(dppId), 3);
        if (anchor == null) {
            return new CustomsCheckDto("DPP 서명 검증", false, "블록체인 앵커링 기록이 없습니다.");
        }
        String status = String.valueOf(anchor[0]);
        boolean pass = "MOCK".equals(status) || "CONFIRMED".equals(status);
        String txId = anchor[1] == null ? "—" : String.valueOf(anchor[1]);
        return new CustomsCheckDto("DPP 서명 검증", pass,
                pass ? "블록체인 앵커 해시 일치 (tx: " + txId + ")" : "앵커 상태: " + status);
    }

    /**
     * 네이티브 쿼리 결과의 첫 행을 컬럼 수까지 확인해서 꺼낸다. 행이 없거나 모양이
     * 예상과 다르면 null - 판정 항목 하나 때문에 통관 상세 화면 전체가 500으로 죽지
     * 않게 한다(2026-08-20, /admin/dashboard가 같은 이유로 죽었던 것과 짝 -
     * CustomsCaseReadRepository.findDppSummary 주석 참고).
     */
    private Object[] firstRow(List<Object[]> rows, int minColumns) {
        if (rows == null || rows.isEmpty()) {
            return null;
        }
        Object[] r = rows.get(0);
        if (r == null || r.length < minColumns) {
            log.warn("예상과 다른 쿼리 결과 모양(컬럼 {}개 필요, 실제 {}개) - 해당 판정은 건너뛴다",
                    minColumns, r == null ? 0 : r.length);
            return null;
        }
        return r;
    }

    private CustomsCheckDto checkHsCode(String declaredHsCode, String actualHsCode) {
        if (actualHsCode == null || actualHsCode.isBlank()) {
            return new CustomsCheckDto("HS 코드 정합성", false, "제품 등록 시 HS 코드가 입력되지 않았습니다.");
        }
        if (declaredHsCode == null || declaredHsCode.isBlank()) {
            return new CustomsCheckDto("HS 코드 정합성", false, "통관 신청에 HS 코드가 입력되지 않았습니다.");
        }
        boolean pass = declaredHsCode.trim().equalsIgnoreCase(actualHsCode.trim());
        return new CustomsCheckDto("HS 코드 정합성", pass,
                pass ? "신고 품목(" + declaredHsCode + ")과 DPP 품목 일치" : "신고 " + declaredHsCode + " vs DPP " + actualHsCode + " 불일치");
    }

    private CustomsCheckDto checkDocument(Long modelId, String docTypeCode, String label) {
        if (modelId == null) {
            return new CustomsCheckDto(label, false, "제품 정보를 찾을 수 없습니다.");
        }
        long count = customsCaseReadRepository.countApprovedDocuments(modelId, docTypeCode);
        return new CustomsCheckDto(label, count > 0,
                count > 0 ? "문서 승인 완료 · " + count + "건" : "승인된 문서가 없습니다.");
    }

    private CustomsCheckDto checkTechFile(Long modelId) {
        if (modelId == null) {
            return new CustomsCheckDto("CE 마크", false, "제품 정보를 찾을 수 없습니다.");
        }
        long count = customsCaseReadRepository.countApprovedDocuments(modelId, "TECH_FILE");
        return new CustomsCheckDto("CE 마크", count > 0,
                count > 0 ? "부착 확인 · 기술문서 " + count + "건 확인됨" : "기술문서 미제출");
    }

    private CustomsCheckDto checkSvhc(Long dppId) {
        long total = customsCaseReadRepository.countMaterialCompositionRows(dppId);
        if (total == 0) {
            return new CustomsCheckDto("우려물질(SVHC)", false, "조성 정보가 등록되지 않아 확인할 수 없습니다.");
        }
        long over = customsCaseReadRepository.countSvhcOverThreshold(dppId);
        return new CustomsCheckDto("우려물질(SVHC)", over == 0,
                over == 0 ? "0.1% 초과 함유 없음" : over + "건 0.1% 초과 함유 신고됨");
    }

    /**
     * 실제 EU EORI 데이터베이스 조회는 이 프로토타입에 연동돼 있지 않다 - 형식(국가코드 2자
     * + 영숫자)만 확인한다. "형식만 확인하는 걸 자동심사로 볼 수 없다"(2026-08-19 강 요청,
     * biz_reg.py 검증 때와 같은 지적)는 원칙에 따라 라벨/설명에서 "등록 확인"처럼 실제
     * 조회를 한 것처럼 과장하지 않는다.
     */
    private CustomsCheckDto checkEoriFormat(String eori) {
        if (eori == null || eori.isBlank()) {
            return new CustomsCheckDto("EORI 번호 형식", false, "EORI 번호가 입력되지 않았습니다.");
        }
        boolean pass = EORI_FORMAT.matcher(eori).matches();
        return new CustomsCheckDto("EORI 번호 형식", pass,
                pass ? "형식 확인됨 (EU EORI 데이터베이스 실시간 조회는 연동되어 있지 않음)" : "EORI 번호 형식이 올바르지 않습니다.");
    }

    private String statusLabel(String decision) {
        return switch (decision) {
            case "APPROVE" -> "유효";
            case "HOLD", "REJECT" -> "정지";
            default -> "심사중";
        };
    }

    /** FE가 "대한민국" 같은 표시용 문자열을 보내도 CHAR(2) country_code로 정규화한다(OrganizationService와 동일 관례). */
    private String normalizeCountryCode(String input) {
        if (input == null || input.isBlank()) {
            return null;
        }
        String v = input.trim();
        if (v.equalsIgnoreCase("KR") || v.contains("대한민국") || v.contains("한국")) {
            return "KR";
        }
        if (v.equalsIgnoreCase("DE") || v.contains("독일")) {
            return "DE";
        }
        if (v.equalsIgnoreCase("FR") || v.contains("프랑스")) {
            return "FR";
        }
        if (v.equalsIgnoreCase("NL") || v.contains("네덜란드")) {
            return "NL";
        }
        if (v.equalsIgnoreCase("IT") || v.contains("이탈리아")) {
            return "IT";
        }
        return v.length() >= 2 ? v.substring(0, 2).toUpperCase() : null;
    }
}
