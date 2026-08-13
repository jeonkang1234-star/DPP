package com.dpp.dpp.repository;

import com.dpp.dpp.entity.DppFieldValue;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DppFieldValueRepository extends JpaRepository<DppFieldValue, Long> {

    List<DppFieldValue> findByDppId(Long dppId);

    Optional<DppFieldValue> findByDppIdAndFieldCode(Long dppId, String fieldCode);
}
