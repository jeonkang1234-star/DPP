package com.dpp.customs.repository;

import com.dpp.customs.entity.CustomsClearance;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * 통관 케이스 판정(checks)에 필요한 조회 전용 native query 모음. dpp/product_model/
 * organization/dpp_snapshot/blockchain_anchor/document/material_composition을 넘나드는
 * 조인이라 com.dpp.verify.repository.DppRegistrySearchRepository와 같은 관례(연관관계
 * 대신 Repository 최소 상속 + native query)를 따른다. CustomsClearance를 앵커 타입으로만
 * 쓸 뿐 아래 쿼리들은 이 엔티티의 컬럼과 무관하다(DppRegistrySearchRepository가 Dpp를
 * 앵커 타입으로 쓰면서 정작 여러 테이블을 조인하는 것과 동일한 패턴).
 */
public interface CustomsCaseReadRepository extends Repository<CustomsClearance, Long> {

    /**
     * product_model.hs_code/model_name, 수출 조직명·국가 - HS 코드 정합성 체크와 화면 표시에 공용.
     * 행이 있으면 크기 1인 리스트, 없으면 빈 리스트.
     *
     * Optional&lt;Object[]&gt;가 아니라 List&lt;Object[]&gt;인 이유: Spring Data JPA는 배열
     * 반환 타입을 "행 하나"가 아니라 "행들의 모음"으로 해석해서, 다중 컬럼 결과를
     * Object[]{행} 형태로 한 겹 더 감싸 돌려준다. row[1]을 읽는 순간 500이 난다
     * (2026-08-20 /admin/dashboard에서 실제로 터졌다 - AdminStatsRepository 주석 참고.
     * DppQueryRepository도 같은 함정을 이미 겪고 스칼라 프로젝션으로 우회해 뒀다).
     */
    @Query(value = "SELECT m.hs_code, m.model_name, o.org_name, o.country_code, d.public_uuid, d.model_id "
            + "FROM dpp d "
            + "JOIN product_model m ON m.model_id = d.model_id "
            + "JOIN organization o ON o.org_id = d.owner_org_id "
            + "WHERE d.dpp_id = :dppId", nativeQuery = true)
    List<Object[]> findDppSummary(@Param("dppId") Long dppId);

    /** 최신 스냅샷의 앵커 상태 - "DPP 서명 검증" 체크용. 스냅샷/앵커가 없으면 빈 리스트(위 주석 참고). */
    @Query(value = "SELECT ba.status, ba.tx_id, ba.content_hash "
            + "FROM dpp_snapshot ds "
            + "JOIN blockchain_anchor ba ON ba.target_type = 'DPP_SNAPSHOT' AND ba.target_id = ds.snapshot_id "
            + "WHERE ds.dpp_id = :dppId "
            + "ORDER BY ds.version_no DESC LIMIT 1", nativeQuery = true)
    List<Object[]> findLatestAnchor(@Param("dppId") Long dppId);

    /**
     * doc_type_code 하나에 대해 승인 완료(review_status='APPROVED')된 문서 건수.
     *
     * 2026-08-23 강 리포트("문서를 올렸는데도 세관에서 '승인된 문서가 없습니다'로 뜬다").
     * 원인은 owner_type 불일치였다. 이 쿼리는 owner_type='MODEL'만 봤는데, 실제 업로드
     * 경로는 전부 owner_type='DPP', owner_id=dpp_id로 저장한다(DocumentIngestService와
     * DocumentSlotService 둘 다). 그래서 이 카운트는 구조적으로 항상 0이었고, 적합성
     * 판정은 무엇을 올리든 실패했다.
     *
     * 세 가지를 모두 센다:
     *   - MODEL 단위 문서(모델 전체에 걸리는 기술문서/DoC 등, 향후 경로)
     *   - 이 DPP에 직접 올린 문서(현재 모든 업로드가 여기로 들어온다)
     *   - 같은 모델의 다른 DPP에 올린 문서(document.owner_type 코멘트의 "배치 단위 문서
     *     1건이 DPP 다수에 상속됨"을 실제로 구현하는 부분)
     */
    @Query(value = "SELECT COUNT(*) FROM document d "
            + "WHERE d.doc_type_code = :docTypeCode "
            + "AND d.review_status = 'APPROVED' AND d.deleted_at IS NULL "
            + "AND ( (d.owner_type = 'MODEL' AND d.owner_id = :modelId) "
            + "   OR (d.owner_type = 'DPP' AND d.owner_id = :dppId) "
            + "   OR (d.owner_type = 'DPP' AND d.owner_id IN "
            + "        (SELECT dp.dpp_id FROM dpp dp WHERE dp.model_id = :modelId AND dp.deleted_at IS NULL)) )",
            nativeQuery = true)
    long countApprovedDocuments(@Param("modelId") Long modelId,
                                 @Param("dppId") Long dppId,
                                 @Param("docTypeCode") String docTypeCode);

    /** SVHC 0.1중량% 초과 함유로 신고된 조성 건수. */
    @Query(value = "SELECT COUNT(*) FROM material_composition "
            + "WHERE dpp_id = :dppId AND svhc_flag = TRUE AND content_rate > 0.1", nativeQuery = true)
    long countSvhcOverThreshold(@Param("dppId") Long dppId);

    /** 조성 정보 자체가 한 건이라도 등록됐는지 - 없으면 SVHC 결과를 "적합"으로 단정할 근거가 없다. */
    @Query(value = "SELECT COUNT(*) FROM material_composition WHERE dpp_id = :dppId", nativeQuery = true)
    long countMaterialCompositionRows(@Param("dppId") Long dppId);
}
