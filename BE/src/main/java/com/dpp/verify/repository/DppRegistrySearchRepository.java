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
     *
     * 2026-08-23 강 요청("등록회사·HS 코드를 각각 개별로 검색해도 결과가 나오게").
     * 예전엔 검색어 하나(q)를 5개 컬럼에 OR로 던지는 search()와, 검색어 없이 최신 50건을
     * 주는 recent() 두 개였다. 그래서 화면의 '등록회사'·'HS 코드' 칸은 실제 필터가 아니라
     * 첫 칸 값을 그대로 비추는 읽기전용 표시였고, "HS 코드만으로 좁히기"가 불가능했다.
     *
     * 이제 세 조건을 AND로 겹친다. 각 조건은 비어 있으면(빈 문자열) 통과하므로,
     * 셋 다 비면 예전 recent()와 같은 "최신 목록"이 된다 - 메서드 하나로 합쳐진다.
     * q 안에서는 여전히 OR 매칭(식별자/시리얼/모델명/HS/회사명 중 아무거나).
     *
     * Object[] 순서: dpp_id, public_uuid, serial_number, model_name, org_name,
     * hs_code, domain, status, issued_at.
     */
    @Query(value = "SELECT d.dpp_id, d.public_uuid, d.serial_number, m.model_name, o.org_name, "
            + "m.hs_code, d.domain, d.status, d.issued_at "
            + "FROM dpp d "
            + "JOIN product_model m ON m.model_id = d.model_id "
            + "JOIN organization o ON o.org_id = d.owner_org_id "
            + "WHERE d.deleted_at IS NULL AND d.status = 'ACTIVE' "
            + "AND (CAST(:q AS TEXT) = '' "
            + "     OR CAST(d.public_uuid AS TEXT) ILIKE CONCAT('%', :q, '%') "
            + "     OR d.serial_number ILIKE CONCAT('%', :q, '%') "
            + "     OR m.model_name ILIKE CONCAT('%', :q, '%') "
            + "     OR m.hs_code ILIKE CONCAT('%', :q, '%') "
            + "     OR o.org_name ILIKE CONCAT('%', :q, '%')) "
            + "AND (CAST(:orgName AS TEXT) = '' OR o.org_name ILIKE CONCAT('%', :orgName, '%')) "
            + "AND (CAST(:hsCode AS TEXT) = '' OR m.hs_code ILIKE CONCAT('%', :hsCode, '%')) "
            + "ORDER BY d.issued_at DESC NULLS LAST LIMIT 50",
            nativeQuery = true)
    List<Object[]> search(@Param("q") String query,
                          @Param("orgName") String orgName,
                          @Param("hsCode") String hsCode);
}
