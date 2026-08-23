package com.dpp.dpp.service;

import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.document.entity.Document;
import com.dpp.document.entity.DocumentLink;
import com.dpp.document.repository.DocumentLinkRepository;
import com.dpp.document.repository.DocumentRepository;
import com.dpp.dpp.entity.Dpp;
import com.dpp.dpp.entity.DppFieldValue;
import com.dpp.dpp.entity.DppParticipant;
import com.dpp.dpp.entity.RequirementField;
import com.dpp.dpp.repository.DppFieldValueRepository;
import com.dpp.dpp.repository.DppParticipantRepository;
import com.dpp.dpp.repository.RequirementFieldRepository;
import com.dpp.mypage.entity.Organization;
import com.dpp.mypage.repository.OrganizationRepository;
import com.dpp.notify.entity.Notification;
import com.dpp.notify.entity.NotificationCategory;
import com.dpp.notify.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 참여 협력사(dpp_participant)의 submit_status(INVITED/IN_PROGRESS/SUBMITTED)를 다시
 * 계산한다. FieldFormService(값 저장)와 DocumentSlotService(문서 업로드) 양쪽에서 참여
 * 협력사가 뭔가를 제출할 때마다 호출한다 - 원래는 FieldFormService 안에 FIELD_VALUE
 * 항목만 보고 판단하는 로직으로만 있었는데(updateParticipantStatus), TEST_LAB처럼
 * 담당이 거의 DOCUMENT뿐인 역할은(시험성적서/LCA·EPD/PCF보고서 3종, FIELD_VALUE는
 * PCF_VALUE 등 3개뿐) 문서를 다 올려도 이 로직이 전혀 몰라서 계속 IN_PROGRESS로 남는
 * 문제가 있었다(2026-08-15, "협력사 역할 세분화" 이후 발견 - RAW_SUPPLIER도 스크랩증빙/
 * SDS 2개 문서가 있어서 원래부터 있던 문제였는데 TEST_LAB이 생기면서 더 두드러짐).
 * 그래서 FIELD_VALUE + DOCUMENT 두 종류 담당 항목을 모두 채웠을 때만 SUBMITTED로 본다.
 */
@Service
public class ParticipantSubmitStatusService {

    // 2026-08-16: 섬유 도메인 추가하며 STEEL 하드코딩 제거 - refresh()가 항상 실제 dpp 행을
    // 받으므로 dpp.getDomain()을 그대로 신뢰할 수 있다(FieldFormService/ParticipationService와
    // 동일한 근거).
    private static List<String> fieldDomains(String domain) {
        return List.of("COMMON", domain);
    }

    private final DppParticipantRepository participantRepository;
    private final RequirementFieldRepository requirementFieldRepository;
    private final DppFieldValueRepository fieldValueRepository;
    private final DocumentLinkRepository documentLinkRepository;
    private final DocumentRepository documentRepository;
    private final UserAccountRepository userAccountRepository;
    private final OrganizationRepository organizationRepository;
    private final NotificationRepository notificationRepository;
    private final com.dpp.collab.service.InvitationService invitationService;

    public ParticipantSubmitStatusService(DppParticipantRepository participantRepository,
                                           RequirementFieldRepository requirementFieldRepository,
                                           DppFieldValueRepository fieldValueRepository,
                                           DocumentLinkRepository documentLinkRepository,
                                           DocumentRepository documentRepository,
                                           UserAccountRepository userAccountRepository,
                                           OrganizationRepository organizationRepository,
                                           NotificationRepository notificationRepository,
                                           com.dpp.collab.service.InvitationService invitationService) {
        this.participantRepository = participantRepository;
        this.requirementFieldRepository = requirementFieldRepository;
        this.fieldValueRepository = fieldValueRepository;
        this.documentLinkRepository = documentLinkRepository;
        this.documentRepository = documentRepository;
        this.userAccountRepository = userAccountRepository;
        this.organizationRepository = organizationRepository;
        this.notificationRepository = notificationRepository;
        this.invitationService = invitationService;
    }

    /**
     * dpp, 참여 조직(orgId), 그 조직의 role_code를 받아 submit_status를 다시 계산해
     * 저장한다. 참여 행 자체가 없으면(초대 없이 접근한 예외 상황) 조용히 아무것도
     * 안 한다 - 호출부(FieldFormService/DocumentSlotService)가 이미 owner가 아닌
     * 경우에만 부르므로 정상 흐름에서는 항상 참여 행이 있어야 맞다.
     */
    @Transactional
    public void refresh(Dpp dpp, Long orgId, String roleCode) {
        DppParticipant participant = participantRepository.findByDppIdAndOrgId(dpp.getDppId(), orgId).orElse(null);
        if (participant == null) {
            return;
        }
        // 협력사가 이 DPP에 실제로 뭔가를 올렸다는 뜻이므로, 이 시점에 초대를 수락으로 넘긴다
        // (2026-08-23 강 리포트 "초대를 보내자마자 수락 상태로 바뀐다"). 초대 -> 대기 ->
        // (협력사가 자료 제출) -> 수락 순서가 실제로 일어난 일과 일치한다.
        invitationService.markAcceptedOnSubmit(dpp.getDppId(), orgId);
        // 수락 버튼을 누르지 않고 바로 자료를 올린 경우에도 참여 행의 수락 시각을 채운다
        // (2026-08-23). 이 값이 비어 있으면 제조사 쪽 잠금이 안 걸려서, 협력사가 방금 채운
        // 값을 제조사가 그대로 덮어쓸 수 있다 - 초대 상태만 ACCEPTED로 넘기고 참여 행은
        // 미수락으로 두면 두 곳이 서로 다른 말을 하게 된다.
        if (participant.getAcceptedAt() == null) {
            participant.setAcceptedAt(OffsetDateTime.now());
        }
        boolean wasSubmitted = "SUBMITTED".equals(participant.getSubmitStatus())
                || "COMPLETED".equals(participant.getSubmitStatus());

        List<String> fieldDomains = fieldDomains(dpp.getDomain());
        List<RequirementField> myFieldValueFields = requirementFieldRepository
                .findByDomainInAndFieldKindAndStorageTargetAndResponsibleRoleAndAutoFalseAndActiveTrueOrderBySortOrder(
                        fieldDomains, "DATA", "FIELD_VALUE", roleCode);
        Map<String, String> existingValues = fieldValueRepository.findByDppId(dpp.getDppId()).stream()
                .collect(Collectors.toMap(DppFieldValue::getFieldCode, DppFieldValue::getValueText, (a, b) -> b));
        boolean fieldsFilled = myFieldValueFields.stream().allMatch(f -> {
            String v = existingValues.get(f.getFieldCode());
            return v != null && !v.isBlank();
        });

        List<RequirementField> myDocFields = requirementFieldRepository
                .findByDomainInAndFieldKindAndStorageTargetAndResponsibleRoleAndAutoFalseAndActiveTrueOrderBySortOrder(
                        fieldDomains, "DOCUMENT", "DOCUMENT", roleCode);
        Set<String> uploadedDocTypes = documentRepository.findAllById(
                        documentLinkRepository.findByDppId(dpp.getDppId()).stream()
                                .map(DocumentLink::getDocumentId)
                                .toList())
                .stream()
                .map(Document::getDocTypeCode)
                .collect(Collectors.toSet());
        boolean docsFilled = myDocFields.stream().allMatch(f -> uploadedDocTypes.contains(f.getLinkedDocType()));

        // 담당 항목이 FIELD_VALUE/DOCUMENT 둘 다 하나도 없으면(잘못 배정된 role_code 등)
        // "다 채웠다"고 잘못 판정하지 않도록 방어 - 최소 하나는 있어야 SUBMITTED 후보.
        boolean hasAnyResponsibility = !myFieldValueFields.isEmpty() || !myDocFields.isEmpty();
        boolean allFilled = hasAnyResponsibility && fieldsFilled && docsFilled;

        if (allFilled) {
            participant.setSubmitStatus("SUBMITTED");
            participant.setCompletedAt(OffsetDateTime.now());
        } else {
            participant.setSubmitStatus("IN_PROGRESS");
        }
        participantRepository.save(participant);

        if (allFilled && !wasSubmitted) {
            notifyOwnerOfSubmission(dpp, orgId);
        }
    }

    private void notifyOwnerOfSubmission(Dpp dpp, Long participantOrgId) {
        String partnerOrgName = organizationRepository.findById(participantOrgId)
                .map(Organization::getOrgName)
                .orElse("협력사");
        List<UserAccount> ownerUsers = userAccountRepository.findByOrgId(dpp.getOwnerOrgId());
        for (UserAccount owner : ownerUsers) {
            Notification notification = new Notification();
            notification.setRecipientUserId(owner.getUserId());
            notification.setCategory(NotificationCategory.SYSTEM);
            notification.setTitle("협력사 제출 완료");
            notification.setBody(partnerOrgName + "에서 담당 항목 제출을 완료했습니다.");
            notificationRepository.save(notification);
        }
    }
}
