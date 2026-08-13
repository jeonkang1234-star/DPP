package com.dpp.dpp.repository;

import com.dpp.dpp.entity.RequirementField;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RequirementFieldRepository extends JpaRepository<RequirementField, String> {

    List<RequirementField> findByDomainAndFieldKindAndStorageTargetAndAutoFalseAndActiveTrueOrderBySortOrder(
            String domain, String fieldKind, String storageTarget);
}
