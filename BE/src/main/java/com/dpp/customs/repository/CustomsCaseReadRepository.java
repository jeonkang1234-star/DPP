package com.dpp.customs.repository;

import com.dpp.customs.entity.CustomsClearance;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/**
 * 통관 케이스 판정(checks)에 필요한 조회 전용 native query 모음. dpp/product_model/
 * organization/dpp_snapshot/blockchain_anchor/document/material_composition을 넘나드는
 * 조인이라 com.dpp.verify.repository.DppRegistrySearchRepository와 같은 관례(연관관계
 * 대신 Repository 최소 상속 + native query)를 따른다. CustomsClearance를 앵커 타입으로만
 * 쓸 뿐 아래 쿼리들은 이 엔티티의 컬럼과 무관하다(DppRegistrySearchRepository가 Dpp를
 * 앵커 타입으로 쓰면서 정작 여러 테이블을 조인하는 것과 동일한 패턴).
 */
public interface CustomsCaseReadRepository extends Repository<CustomsClearance, Long> {

    /** product_model.hs_code/model_name, 수출 조직명·국가 - HS 코드 정합성 체크와 화면 표시에 공용으로 쓴다. */
    @Query(value = "SELECT m.hs_code, m.model_name, o.org_name, o.country_code, d.public_uuid, d.model_id "
            + "FROM dpp d "
            + "JOIN product_model m ON m.model_id = d.model_id "
            + "JOIN organization o ON o.org_id = d.owner_org_id "
            + "WHERE d.dpp_id = :dppId", nativeQuery = true)
    Optional<Object[]> findDppSummary(@Param("dppId") Long dppId);

    /** 최신 스냅샷의 앵커 상태 - "DPP 서명 검증" 체크용. 스냅샷/앵커가 없으면 empty. */
    @Query(value = "SELECT ba.status, ba.tx_id, ba.content_hash "
            + "FROM dpp_snapshot ds "
            + "JOIN blockchain_anchor ba ON ba.target_type = 'DPP_SNAPSHOT' AND ba.target_id = ds.snapshot_id "
            + "WHERE ds.dpp_id = :dppId "
            + "ORDER BY ds.version_no DESC LIMIT 1", nativeQuery = true)
    Optional<Object[]> findLatestAnchor(@Param("dppId") Long dppId);

    /** doc_type_code 하나에 대해 승인 완료(review_status=APPROVED)된 문서 건수 - MODEL 단위 문서(기술문서/DoC 등). */
    @Query(value = "SELECT COUNT(*) FROM document "
            + "WHERE owner_type = 'MODEL' AND owner_id = :modelId AND doc_type_code = :docTypeCode "
            + "AND review_status = 'APPROVED' AND deleted_at IS NULL", nativeQuery = true)
    long countApprovedDocuments(@Param("modelId") Long modelId, @Param("docTypeCode") String docTypeCode);

    /** SVHC 0.1중량% 초과 함유로 신고된 조성 건수. */
    @Query(value = "SELECT COUNT(*) FROM material_composition "
            + "WHERE dpp_id = :dppId AND svhc_flag = TRUE AND content_rate > 0.1", nativeQuery = true)
    long countSvhcOverThreshold(@Param("dppId") Long dppId);

    /** 조성 정보 자체가 한 건이라도 등록됐는지 - 없으면 SVHC 결과를 "적합"으로 단정할 근거가 없다. */
    @Query(value = "SELECT COUNT(*) FROM material_composition WHERE dpp_id = :dppId", nativeQuery = true)
    long countMaterialCompositionRows(@Param("dppId") Long dppId);
}
