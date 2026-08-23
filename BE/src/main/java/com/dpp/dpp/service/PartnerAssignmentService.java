package com.dpp.dpp.service;

import com.dpp.dpp.entity.DppParticipant;
import com.dpp.dpp.repository.DppParticipantRepository;
import com.dpp.mypage.entity.Organization;
import com.dpp.mypage.repository.OrganizationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * "이 DPP에서 어떤 역할이 이미 협력사에게 넘어갔는가"를 한 군데서 판정한다
 * (2026-08-23 강 요청).
 *
 * 규칙은 하나다 - dpp_participant.accepted_at 이 채워진 역할은 그 협력사 전용이다.
 *   수락 전 : 담당 역할과 상관없이 소유 조직(제조사)이 전부 입력·업로드한다.
 *             혼자 DPP를 완성하는 흐름을 막지 않는다.
 *   수락 후 : 그 역할이 담당인 requirement_field(데이터 항목·문서)는 협력사만 쓸 수 있고,
 *             제조사 화면에서는 읽기 전용이 된다.
 *
 * 예전에는 requirement_field.responsible_role 값만 보고 FE가 무조건 "협력사 담당"으로
 * 그렸다. 그래서 협력사를 초대한 적도 없는 DPP에서 제조사가 스크랩 매입증빙·시험성적서를
 * 영영 올릴 수 없었고(2026-08-23 강 리포트), 반대로 서버는 협력사가 붙은 뒤에도 소유
 * 조직의 쓰기를 전부 허용해서 협력사가 채운 값을 제조사가 덮어쓸 수 있었다. 판정 기준을
 * 여기 하나로 모아서 FieldFormService(데이터 항목)와 DocumentSlotService(문서)가 같은
 * 답을 보게 한다.
 */
@Service
public class PartnerAssignmentService {

    private static final Map<String, String> ROLE_LABEL = Map.of(
            "RAW_SUPPLIER", "원자재·화학 공급사",
            "TEST_LAB", "시험·인증기관",
            "RECYCLER", "재활용 처리업체",
            "LOGISTICS", "물류사",
            "DISTRIBUTOR", "유통사");

    private final DppParticipantRepository participantRepository;
    private final OrganizationRepository organizationRepository;

    public PartnerAssignmentService(DppParticipantRepository participantRepository,
                                     OrganizationRepository organizationRepository) {
        this.participantRepository = participantRepository;
        this.organizationRepository = organizationRepository;
    }

    /**
     * 수락 완료된 역할 -> 화면에 그대로 쓸 잠금 사유 라벨.
     *
     * 라벨에 조직명을 넣는 이유: 제조사가 "왜 이 칸이 잠겼지"를 묻지 않아도 되게, 그리고
     * 누구를 재촉해야 하는지 바로 알 수 있게. 조직명을 못 찾으면(초대 직후 등) 역할명만
     * 쓴다 - 잠긴 이유 자체는 언제나 밝힌다.
     *
     * dppId가 null이면(아직 임시저장 전이라 dpp 행이 없음) 빈 map - 잠글 대상이 없다.
     */
    @Transactional(readOnly = true)
    public Map<String, String> lockedRoleLabels(Long dppId) {
        if (dppId == null) {
            return Map.of();
        }
        List<DppParticipant> participants = participantRepository.findByDppId(dppId);
        Map<String, String> locked = new LinkedHashMap<>();
        for (DppParticipant p : participants) {
            if (p.getAcceptedAt() == null || p.getRoleCode() == null) {
                continue;
            }
            String orgName = p.getOrgId() == null ? null
                    : organizationRepository.findById(p.getOrgId()).map(Organization::getOrgName).orElse(null);
            String roleLabel = roleLabel(p.getRoleCode());
            // 같은 역할에 두 협력사가 붙는 경우는 ux_participant 제약상 조직이 다를 때뿐이다.
            // 먼저 수락한 쪽 라벨을 유지한다 - 나중 것으로 덮으면 화면 문구가 왔다갔다 한다.
            locked.putIfAbsent(p.getRoleCode(),
                    orgName == null ? roleLabel + " 제출 대기" : orgName + "(" + roleLabel + ") 제출 대기");
        }
        return locked;
    }

    /** role_code의 한글 라벨. 매핑이 없으면 코드를 그대로 쓴다. */
    public static String roleLabel(String roleCode) {
        return roleCode == null ? "" : ROLE_LABEL.getOrDefault(roleCode, roleCode);
    }

    /** responsible_role이 잠긴 역할이면 그 사유 라벨, 아니면 null(= 소유 조직이 입력 가능). */
    public String lockLabelFor(Map<String, String> lockedRoleLabels, String responsibleRole) {
        if (responsibleRole == null || lockedRoleLabels.isEmpty()) {
            return null;
        }
        return lockedRoleLabels.get(responsibleRole);
    }
}
