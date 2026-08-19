package com.dpp.dpp.repository;

import com.dpp.dpp.entity.CodeMaster;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface CodeMasterRepository extends JpaRepository<CodeMaster, CodeMaster.Key> {

    List<CodeMaster> findByCodeGroupInAndActiveTrueOrderByCodeGroupAscSortOrderAsc(Collection<String> codeGroups);

    List<CodeMaster> findByCodeGroupAndActiveTrueOrderBySortOrder(String codeGroup);
}
