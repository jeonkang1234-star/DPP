package com.dpp.customs.repository;

import com.dpp.customs.entity.CustomsClearance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    /**
     * 새로 승인된 세관 조직에게 넘겨줄 기존 케이스를 찾는다(2026-08-22 강 리포트 "방금 발급한
     * DPP가 세관 계정에 보이지 않음").
     *
     * 원인: 통관 케이스는 DPP 발급 시점에 그때 ACTIVE인 세관 조직에게만 배정된다. 세관 계정이
     * 그보다 나중에 승인되면, 이미 발급된 DPP는 그 세관의 큐에 영영 안 들어온다.
     *
     * 여기서는 "이 세관의 관할 국가/심사측과 맞는 케이스 중, 아직 이 세관 몫의 행이 없는 것"의
     * 원본 한 건씩을 뽑는다(같은 DPP·같은 side에 세관이 여럿이면 행도 여럿이므로 MIN으로 하나만).
     * 배정 대상이 없어 customs_org_id가 NULL로 남아 있던 행도 그대로 잡힌다.
     */
    @Query(value = "SELECT MIN(c.clearance_id) FROM customs_clearance c "
            + "WHERE ((c.clearance_side = 'EXPORT' AND c.export_country_code = :countryCode) "
            + "    OR (c.clearance_side = 'IMPORT' AND c.import_country_code = :countryCode)) "
            + "  AND NOT EXISTS (SELECT 1 FROM customs_clearance x "
            + "                   WHERE x.dpp_id = c.dpp_id AND x.clearance_side = c.clearance_side "
            + "                     AND x.customs_org_id = :customsOrgId) "
            + "GROUP BY c.dpp_id, c.clearance_side", nativeQuery = true)
    List<Long> findTemplateIdsForNewCustomsOrg(@Param("countryCode") String countryCode,
                                                @Param("customsOrgId") Long customsOrgId);
}
