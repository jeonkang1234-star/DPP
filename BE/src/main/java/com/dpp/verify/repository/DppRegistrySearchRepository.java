package com.dpp.verify.repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.repository.Repository;
import com.dpp.dpp.entity.Dpp;

import java.util.List;

/**
 * EU 시장감시/관세청 조회 전용 검색 - dpp/product_model/organization 3개 테이블을
 * 조인하는 자유 검색이라 JPQL 연관관계보다 native query가 더 간단하다(이 리포지토리
 * 계층의 기존 관례 - DppQueryRepository 참고). Repository<Dpp, Long>만 상속해서
 * (JpaRepository 전체가 아니라) 여긴 이 커스텀 검색 하나만 노출한다.
 */
public interface DppRegistrySearchRepository extends Repository<Dpp, Long> {

    /**
     * 발급 완료(status='ACTIVE')된 DPP만 대상 - DRAFT/PENDING은 아직 공개 대상이 아니다.
     * public_uuid(문자열 변환)·serial_number·model_name·hs_code·org_name 중 하나라도
     * 검색어를 포함하면 매치. Object[] 순서: dpp_id, public_uuid, serial_number,
     * model_name, org_name, hs_code, domain, status, issued_at.
     */
    @Query(value = "SELECT d.dpp_id, d.public_uuid, d.serial_number, m.model_name, o.org_name, "
            + "m.hs_code, d.domain, d.status, d.issued_at "
            + "FROM dpp d "
            + "JOIN product_model m ON m.model_id = d.model_id "
            + "JOIN organization o ON o.org_id = d.owner_org_id "
            + "WHERE d.deleted_at IS NULL AND d.status = 'ACTIVE' "
            + "AND (CAST(d.public_uuid AS TEXT) ILIKE CONCAT('%', :q, '%') "
            + "     OR d.serial_number ILIKE CONCAT('%', :q, '%') "
            + "     OR m.model_name ILIKE CONCAT('%', :q, '%') "
            + "     OR m.hs_code ILIKE CONCAT('%', :q, '%') "
            + "     OR o.org_name ILIKE CONCAT('%', :q, '%')) "
            + "ORDER BY d.issued_at DESC NULLS LAST LIMIT 50",
            nativeQuery = true)
    List<Object[]> search(@Param("q") String query);

    /** 검색어 없이 최신 발급분 목록 - 화면 최초 진입 시 기본 표시용. */
    @Query(value = "SELECT d.dpp_id, d.public_uuid, d.serial_number, m.model_name, o.org_name, "
            + "m.hs_code, d.domain, d.status, d.issued_at "
            + "FROM dpp d "
            + "JOIN product_model m ON m.model_id = d.model_id "
            + "JOIN organization o ON o.org_id = d.owner_org_id "
            + "WHERE d.deleted_at IS NULL AND d.status = 'ACTIVE' "
            + "ORDER BY d.issued_at DESC NULLS LAST LIMIT 50",
            nativeQuery = true)
    List<Object[]> recent();
}
