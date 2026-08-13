package com.dpp.collab.repository;

import com.dpp.collab.entity.Invitation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InvitationRepository extends JpaRepository<Invitation, Long> {

    List<Invitation> findByInviterOrgIdOrderByCreatedAtDesc(Long inviterOrgId);

    List<Invitation> findByInviterOrgIdAndDppIdOrderByCreatedAtDesc(Long inviterOrgId, Long dppId);

    /** BusinessSignupService가 가입 이메일로 대기 중인 초대를 찾아 자동 수락 처리할 때 쓴다. */
    List<Invitation> findByInviteeEmailAndStatus(String inviteeEmail, String status);
}
