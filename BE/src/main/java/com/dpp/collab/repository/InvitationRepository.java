package com.dpp.collab.repository;

import com.dpp.collab.entity.Invitation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InvitationRepository extends JpaRepository<Invitation, Long> {

    List<Invitation> findByInviterOrgIdOrderByCreatedAtDesc(Long inviterOrgId);
}
