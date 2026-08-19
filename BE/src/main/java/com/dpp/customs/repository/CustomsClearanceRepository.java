package com.dpp.customs.repository;

import com.dpp.customs.entity.CustomsClearance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** customs_clearance CRUD + 세관 큐 화면용 파생 조회. */
public interface CustomsClearanceRepository extends JpaRepository<CustomsClearance, Long> {

    /** 심사 대기 중(PENDING)인 케이스 - 세관 큐 기본 화면. */
    List<CustomsClearance> findByCustomsOrgIdAndDecisionOrderByCreatedAtDesc(Long customsOrgId, String decision);

    /** 이미 결정 난(APPROVE/HOLD/REJECT) 케이스 - 통관 이력(clearLog) 화면. */
    List<CustomsClearance> findByCustomsOrgIdAndDecisionNotOrderByDecidedAtDesc(Long customsOrgId, String decision);

    /** 케이스 상세 조회 시 "내 세관 소관이 맞는지"까지 한 번에 검증. */
    Optional<CustomsClearance> findByClearanceIdAndCustomsOrgId(Long clearanceId, Long customsOrgId);

    /** 같은 DPP로 이미 신청된 건이 있는지(중복 신청 안내용). */
    List<CustomsClearance> findByDppIdOrderByCreatedAtDesc(Long dppId);
}
