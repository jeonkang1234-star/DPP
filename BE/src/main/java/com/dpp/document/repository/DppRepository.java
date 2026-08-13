package com.dpp.document.repository;

import com.dpp.document.entity.Dpp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DppRepository extends JpaRepository<Dpp, Long> {

    /** 지금은 조직당 DPP가 (테스트 시드로) 1건뿐이라고 가정 - 실제 제품 도메인이 생기면 대체될 임시 조회. */
    Optional<Dpp> findFirstByOwnerOrgId(Long ownerOrgId);
}
