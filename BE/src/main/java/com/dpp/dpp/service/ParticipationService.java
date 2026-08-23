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
import com.dpp.collab.service.InvitationService;
import com.dpp.notify.entity.Notification;
import com.dpp.notify.entity.NotificationCategory;
import com.dpp.notify.repository.NotificationRepository;
import com.dpp.mypage.entity.Organization;
import com.dpp.mypage.repository.OrganizationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
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

    // FieldFormService.fieldDomains()와 동일한 이유로 COMMON도 같이 조회한다 - "내 담당
    // 필드 몇 개 중 몇 개 채웠는지" 집계가 도메인 전용 필드만 세면 실제 완성도(fn_recalc_
    // completeness는 COMMON도 포함)와 어긋난다(2026-08-14). 2026-08-16: 섬유 도메인 추가하며
    // dpp.getDomain()을 그대로 써서 STEEL 하드코딩을 제거 - 참여 DPP는 이미 존재하는 dpp
    // 행 기준이라 도메인을 항상 안전하게 읽을 수 있다(FieldFormService의 dppId!=null 분기와
    // 동일한 근거).
    private static List<String> fieldDomains(String domain) {
        return List.of("COMMON", domain);
    }

    private final UserAccountRepository userAccountRepository;
    private final DppParticipantRepository participantRepository;
    private final DppQueryRepository dppRepository;
    private final ProductModelRepository productModelRepository;
    private final OrganizationRepository organizationRepository;
    private final RequirementFieldRepository requirementFieldRepository;
    private final DppFieldValueRepository fieldValueRepository;
    private final DocumentLinkRepository documentLinkRepository;
    private final DocumentRepository documentRepository;
    private final InvitationService invitationService;
    private final NotificationRepository notificationRepository;

    public ParticipationService(UserAccountRepository userAccountRepository,
                                 DppParticipantRepository participantRepository,
                                 DppQueryRepository dppRepository,
                                 ProductModelRepository productModelRepository,
                                 OrganizationRepository organizationRepository,
                                 RequirementFieldRepository requirementFieldRepository,
                                 DppFieldValueRepository fieldValueRepository,
                                 DocumentLinkRepository documentLinkRepository,
                                 DocumentRepository documentRepository,
                                 InvitationService invitationService,
                                 NotificationRepository notificationRepository) {
        this.userAccountRepository = userAccountRepository;
        this.participantRepository = participantRepository;
        this.dppRepository = dppRepository;
        this.productModelRepository = productModelRepository;
        this.organizationRepository = organizationRepository;
        this.requirementFieldRepository = requirementFieldRepository;
        this.fieldValueRepository = fieldValueRepository;
        this.documentLinkRepository = documentLinkRepository;
        this.documentRepository = documentRepository;
        this.invitationService = invitationService;
        this.notificationRepository = notificationRepository;
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

    /**
     * 협력사가 참여 요청을 수락한다(2026-08-23 강 요청 - "협력사가 초대를 수락하면 그때부터
     * 걔가 입력하는 데이터만 걔만 입력할 수 있게").
     *
     * 이 순간부터 이 협력사 role_code가 담당인 데이터 항목·문서는 제조사 화면에서 읽기
     * 전용이 되고, 값을 채우는 것도 문서를 올리는 것도 이 협력사만 할 수 있다
     * (PartnerAssignmentService). 그 전까지는 제조사가 혼자 다 채울 수 있다 - 협력사를
     * 부르지 않고 DPP를 완성하는 흐름을 막지 않기 위해서다.
     *
     * 이미 수락한 참여 행을 다시 수락해도 아무 일도 일어나지 않는다(멱등) - 수락 시각을
     * 뒤로 미루면 그 사이 판정이 흔들린다.
     */
    @Transactional
    public List<ParticipationDto> accept(Long userId, Long dppId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 사용자입니다."));
        if (user.getOrgId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "소속된 조직이 없어 참여를 수락할 수 없습니다.");
        }
        DppParticipant participant = participantRepository.findByDppIdAndOrgId(dppId, user.getOrgId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "참여 요청을 찾을 수 없습니다."));

        if (participant.getAcceptedAt() == null) {
            participant.setAcceptedAt(OffsetDateTime.now());
            participantRepository.save(participant);
            // 초대 행 상태도 같이 넘긴다 - 제조사 "협력사 초대" 화면이 읽는 건 그쪽이다.
            invitationService.markAcceptedOnSubmit(dppId, user.getOrgId());
            notifyOwner(dppId, user.getOrgId(), participant.getRoleCode());
        }
        return list(userId);
    }

    /**
     * 제조사(소유 조직)에게 "협력사가 수락했다"를 알린다. 수락과 동시에 제조사 화면에서
     * 그 항목들이 잠기므로, 알리지 않으면 제조사는 칸이 왜 갑자기 회색이 됐는지 알 수 없다.
     */
    private void notifyOwner(Long dppId, Long partnerOrgId, String roleCode) {
        Dpp dpp = dppRepository.findById(dppId).orElse(null);
        if (dpp == null) {
            return;
        }
        String partnerName = organizationRepository.findById(partnerOrgId)
                .map(Organization::getOrgName).orElse("협력사");
        String dppLabel = productModelRepository.findById(dpp.getModelId())
                .map(ProductModel::getModelName).orElse("DPP #" + dppId);
        for (UserAccount member : userAccountRepository.findByOrgId(dpp.getOwnerOrgId())) {
            Notification notification = new Notification();
            notification.setRecipientUserId(member.getUserId());
            notification.setCategory(NotificationCategory.SYSTEM);
            notification.setSubType("PARTNER_ACCEPTED");
            notification.setTitle("협력사가 참여를 수락했습니다");
            notification.setBody(partnerName + "이(가) '" + dppLabel + "'의 "
                    + PartnerAssignmentService.roleLabel(roleCode)
                    + " 담당 제출을 맡았습니다. 해당 항목·문서는 이제 협력사가 직접 제출합니다.");
            notification.setLinkUrl("/maker/partners");
            notificationRepository.save(notification);
        }
    }

    private ParticipationDto toDto(DppParticipant participant) {
        Dpp dpp = dppRepository.findById(participant.getDppId()).orElse(null);
        if (dpp == null) {
            // dpp가 소프트/하드 삭제된 경우 등 - 참여 행은 남아있어도 조용히 건너뛴다.
            return new ParticipationDto(participant.getDppId(), "(삭제된 DPP)", "", participant.getRoleCode(),
                    participant.getSubmitStatus(), 0, 0, 0, 0, participant.getAcceptedAt() != null);
        }
        String dppLabel = productModelRepository.findById(dpp.getModelId())
                .map(ProductModel::getModelName)
                .orElse("DPP #" + dpp.getDppId());
        String ownerOrgName = organizationRepository.findById(dpp.getOwnerOrgId())
                .map(Organization::getOrgName)
                .orElse("(알 수 없음)");

        List<String> fieldDomains = fieldDomains(dpp.getDomain());
        List<RequirementField> myFields = requirementFieldRepository
                .findByDomainInAndFieldKindAndStorageTargetAndResponsibleRoleAndAutoFalseAndActiveTrueOrderBySortOrder(
                        fieldDomains, "DATA", "FIELD_VALUE", participant.getRoleCode());
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
                        fieldDomains, "DOCUMENT", "DOCUMENT", participant.getRoleCode());
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
                participant.getSubmitStatus(), (int) filled, myFields.size(), (int) docsFilled, myDocFields.size(),
                participant.getAcceptedAt() != null);
    }
}
