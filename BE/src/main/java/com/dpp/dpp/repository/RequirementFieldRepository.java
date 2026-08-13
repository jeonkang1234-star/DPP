package com.dpp.dpp.repository;

import com.dpp.dpp.entity.RequirementField;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RequirementFieldRepository extends JpaRepository<RequirementField, String> {

    List<RequirementField> findByDomainAndFieldKindAndStorageTargetAndAutoFalseAndActiveTrueOrderBySortOrder(
            String domain, String fieldKind, String storageTarget);

    /** 협력사(참여 조직) 전용 - 자기 role_code가 담당인 필드만. */
    List<RequirementField> findByDomainAndFieldKindAndStorageTargetAndResponsibleRoleAndAutoFalseAndActiveTrueOrderBySortOrder(
            String domain, String fieldKind, String storageTarget, String responsibleRole);
}
