package com.dpp.dpp.repository;

import com.dpp.dpp.entity.DppParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DppParticipantRepository extends JpaRepository<DppParticipant, Long> {

    Optional<DppParticipant> findByDppIdAndGuestEmailAndRoleCode(Long dppId, String guestEmail, String roleCode);

    /** FieldFormService가 "이 조직이 이 DPP의 참여 협력사인가, 맞다면 무슨 역할인가"를 확인할 때 쓴다. */
    Optional<DppParticipant> findByDppIdAndOrgId(Long dppId, Long orgId);

    /** BusinessSignupService가 가입 이메일로 아직 org_id가 안 붙은 초대 참여 행을 찾을 때 쓴다. */
    List<DppParticipant> findByGuestEmailAndOrgIdIsNull(String guestEmail);

    /** 파트너(협력사) 로그인 계정이 "내가 참여 요청받은 DPP 목록"을 볼 때 쓴다. */
    List<DppParticipant> findByOrgId(Long orgId);

    /**
     * 이 DPP에 붙은 참여 행 전부 - PartnerAssignmentService가 "수락한 협력사가 있는 역할"을
     * 가려낼 때 쓴다(수락 후에는 그 역할 담당 항목을 제조사가 못 건드린다).
     */
    List<DppParticipant> findByDppId(Long dppId);
}
