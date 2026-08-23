package com.dpp.collab.repository;

import com.dpp.collab.entity.Invitation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InvitationRepository extends JpaRepository<Invitation, Long> {

    List<Invitation> findByInviterOrgIdOrderByCreatedAtDesc(Long inviterOrgId);

    List<Invitation> findByInviterOrgIdAndDppIdOrderByCreatedAtDesc(Long inviterOrgId, Long dppId);

    /** BusinessSignupService가 가입 이메일로 대기 중인 초대를 찾아 자동 수락 처리할 때 쓴다. */
    List<Invitation> findByInviteeEmailAndStatus(String inviteeEmail, String status);

    /**
     * 이미 가입된 협력사가 그 DPP에 자료를 제출했을 때 해당 초대를 수락으로 넘기기 위한 조회
     * (2026-08-23, InvitationService.markAcceptedOnSubmit).
     */
    List<Invitation> findByDppIdAndInviteeEmail(Long dppId, String inviteeEmail);
}
