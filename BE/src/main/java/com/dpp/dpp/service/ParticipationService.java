package com.dpp.dpp.service;

import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.document.entity.Document;
import com.dpp.document.entity.DocumentLink;
import com.dpp.document.repository.DocumentLinkRepository;
import com.dpp.document.repository.DocumentRepository;
import com.dpp.dpp.dto.ParticipationDto;
import com.dpp.dpp.entity.Dpp;
import com.dpp.dpp.entity.DppFieldValue;
import com.dpp.dpp.entity.DppParticipant;
import com.dpp.dpp.entity.ProductModel;
import com.dpp.dpp.entity.RequirementField;
import com.dpp.dpp.repository.DppFieldValueRepository;
import com.dpp.dpp.repository.DppParticipantRepository;
import com.dpp.dpp.repository.DppQueryRepository;
import com.dpp.dpp.repository.ProductModelRepository;
import com.dpp.dpp.repository.RequirementFieldRepository;
import com.dpp.mypage.entity.Organization;
import com.dpp.mypage.repository.OrganizationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * GET /me/participations - "협력사 초대"를 받아 가입한 조직이 자기가 참여 요청받은 DPP
 * 목록을 보는 화면(파트너 대시보드). 이 화면은 com.dpp.dpp 패키지가 지금까지 전부
 * "내 DPP를 관리하는" 소유 조직 관점으로만 만들어져 있었는데, 처음으로 참여 협력사
 * 관점의 조회를 추가한다.
 */
@Service
public class ParticipationService {

    private static final String DOMAIN = "STEEL";
    // FieldFormService.FIELD_DOMAINS와 동일한 이유로 COMMON도 같이 조회한다 - "내 담당
    // 필드 몇 개 중 몇 개 채웠는지" 집계가 STEEL 필드만 세면 실제 완성도(fn_recalc_
    // completeness는 COMMON도 포함)와 어긋난다(2026-08-14).
    private static final List<String> FIELD_DOMAINS = List.of("COMMON", DOMAIN);

    private final UserAccountRepository userAccountRepository;
    private final DppParticipantRepository participantRepository;
    private final DppQueryRepository dppRepository;
    private final ProductModelRepository productModelRepository;
    private final OrganizationRepository organizationRepository;
    private final RequirementFieldRepository requirementFieldRepository;
    private final DppFieldValueRepository fieldValueRepository;
    private final DocumentLinkRepository documentLinkRepository;
    private final DocumentRepository documentRepository;

    public ParticipationService(UserAccountRepository userAccountRepository,
                                 DppParticipantRepository participantRepository,
                                 DppQueryRepository dppRepository,
                                 ProductModelRepository productModelRepository,
                                 OrganizationRepository organizationRepository,
                                 RequirementFieldRepository requirementFieldRepository,
                                 DppFieldValueRepository fieldValueRepository,
                                 DocumentLinkRepository documentLinkRepository,
                                 DocumentRepository documentRepository) {
        this.userAccountRepository = userAccountRepository;
        this.participantRepository = participantRepository;
        this.dppRepository = dppRepository;
        this.productModelRepository = productModelRepository;
        this.organizationRepository = organizationRepository;
        this.requirementFieldRepository = requirementFieldRepository;
        this.fieldValueRepository = fieldValueRepository;
        this.documentLinkRepository = documentLinkRepository;
        this.documentRepository = documentRepository;
    }

    @Transactional(readOnly = true)
    public List<ParticipationDto> list(Long userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 사용자입니다."));
        if (user.getOrgId() == null) {
            return List.of();
        }

        List<DppParticipant> participations = participantRepository.findByOrgId(user.getOrgId());
        return participations.stream().map(this::toDto).toList();
    }

    private ParticipationDto toDto(DppParticipant participant) {
        Dpp dpp = dppRepository.findById(participant.getDppId()).orElse(null);
        if (dpp == null) {
            // dpp가 소프트/하드 삭제된 경우 등 - 참여 행은 남아있어도 조용히 건너뛴다.
            return new ParticipationDto(participant.getDppId(), "(삭제된 DPP)", "", participant.getRoleCode(),
                    participant.getSubmitStatus(), 0, 0, 0, 0);
        }
        String dppLabel = productModelRepository.findById(dpp.getModelId())
                .map(ProductModel::getModelName)
                .orElse("DPP #" + dpp.getDppId());
        String ownerOrgName = organizationRepository.findById(dpp.getOwnerOrgId())
                .map(Organization::getOrgName)
                .orElse("(알 수 없음)");

        List<RequirementField> myFields = requirementFieldRepository
                .findByDomainInAndFieldKindAndStorageTargetAndResponsibleRoleAndAutoFalseAndActiveTrueOrderBySortOrder(
                        FIELD_DOMAINS, "DATA", "FIELD_VALUE", participant.getRoleCode());
        Map<String, String> existingValues = fieldValueRepository.findByDppId(dpp.getDppId()).stream()
                .collect(Collectors.toMap(DppFieldValue::getFieldCode, DppFieldValue::getValueText, (a, b) -> b));
        long filled = myFields.stream()
                .filter(f -> {
                    String v = existingValues.get(f.getFieldCode());
                    return v != null && !v.isBlank();
                })
                .count();

        // 담당 문서(예: TEST_LAB이면 시험성적서/LCA·EPD/PCF보고서) 제출 여부도 같이 센다 -
        // "본인이 올려야 하는 사항"엔 FIELD_VALUE뿐 아니라 DOCUMENT도 포함되니(2026-08-15).
        List<RequirementField> myDocFields = requirementFieldRepository
                .findByDomainInAndFieldKindAndStorageTargetAndResponsibleRoleAndAutoFalseAndActiveTrueOrderBySortOrder(
                        FIELD_DOMAINS, "DOCUMENT", "DOCUMENT", participant.getRoleCode());
        Set<String> uploadedDocTypes = documentRepository.findAllById(
                        documentLinkRepository.findByDppId(dpp.getDppId()).stream()
                                .map(DocumentLink::getDocumentId)
                                .toList())
                .stream()
                .map(Document::getDocTypeCode)
                .collect(Collectors.toSet());
        long docsFilled = myDocFields.stream()
                .filter(f -> uploadedDocTypes.contains(f.getLinkedDocType()))
                .count();

        return new ParticipationDto(dpp.getDppId(), dppLabel, ownerOrgName, participant.getRoleCode(),
                participant.getSubmitStatus(), (int) filled, myFields.size(), (int) docsFilled, myDocFields.size());
    }
}
