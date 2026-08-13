package com.dpp.dpp.service;

import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
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

    private final UserAccountRepository userAccountRepository;
    private final DppParticipantRepository participantRepository;
    private final DppQueryRepository dppRepository;
    private final ProductModelRepository productModelRepository;
    private final OrganizationRepository organizationRepository;
    private final RequirementFieldRepository requirementFieldRepository;
    private final DppFieldValueRepository fieldValueRepository;

    public ParticipationService(UserAccountRepository userAccountRepository,
                                 DppParticipantRepository participantRepository,
                                 DppQueryRepository dppRepository,
                                 ProductModelRepository productModelRepository,
                                 OrganizationRepository organizationRepository,
                                 RequirementFieldRepository requirementFieldRepository,
                                 DppFieldValueRepository fieldValueRepository) {
        this.userAccountRepository = userAccountRepository;
        this.participantRepository = participantRepository;
        this.dppRepository = dppRepository;
        this.productModelRepository = productModelRepository;
        this.organizationRepository = organizationRepository;
        this.requirementFieldRepository = requirementFieldRepository;
        this.fieldValueRepository = fieldValueRepository;
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
                    participant.getSubmitStatus(), 0, 0);
        }
        String dppLabel = productModelRepository.findById(dpp.getModelId())
                .map(ProductModel::getModelName)
                .orElse("DPP #" + dpp.getDppId());
        String ownerOrgName = organizationRepository.findById(dpp.getOwnerOrgId())
                .map(Organization::getOrgName)
                .orElse("(알 수 없음)");

        List<RequirementField> myFields = requirementFieldRepository
                .findByDomainAndFieldKindAndStorageTargetAndResponsibleRoleAndAutoFalseAndActiveTrueOrderBySortOrder(
                        DOMAIN, "DATA", "FIELD_VALUE", participant.getRoleCode());
        Map<String, String> existingValues = fieldValueRepository.findByDppId(dpp.getDppId()).stream()
                .collect(Collectors.toMap(DppFieldValue::getFieldCode, DppFieldValue::getValueText, (a, b) -> b));
        long filled = myFields.stream()
                .filter(f -> {
                    String v = existingValues.get(f.getFieldCode());
                    return v != null && !v.isBlank();
                })
                .count();

        return new ParticipationDto(dpp.getDppId(), dppLabel, ownerOrgName, participant.getRoleCode(),
                participant.getSubmitStatus(), (int) filled, myFields.size());
    }
}
