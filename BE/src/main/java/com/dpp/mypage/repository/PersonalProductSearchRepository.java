package com.dpp.mypage.repository;

import com.dpp.dpp.entity.Dpp;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * 개인 회원(SNS 로그인) 전용 제품 검색 - "제품명·브랜드로 찾아서 QR 조회만"
 * (2026-08-23 강 요청).
 *
 * 규제기관용 DppRegistrySearchRepository와 일부러 분리했다. 그쪽은 public_uuid·
 * serial_number·hs_code·org_name까지 검색어로 받고 검색어가 비면 최신 50건을 그냥
 * 나열해 준다 - 시장감시/통관 업무엔 그게 맞지만, 개인 회원에게 그대로 주면
 * 레지스트리 전체를 훑을 수 있게 된다. 여기서는
 *   - 매칭 대상: product_model.model_name / product_model.brand 딱 둘
 *   - 반환 컬럼: 공개 여권(/p/{uuid})에 어차피 로그인 없이 보이는 것들만
 *   - 검색어 없이 목록을 주는 메서드 자체가 없음(서비스에서 2자 미만이면 빈 결과)
 * 로 좁힌다.
 */
public interface PersonalProductSearchRepository extends Repository<Dpp, Long> {

    /**
     * Object[] 순서: public_uuid, model_name, brand, org_name, issued_at.
     * dpp_id·serial_number·hs_code는 일부러 빼놨다 - 개인 회원 화면에서 쓸 데가 없고,
     * 내려보내면 그 자체가 조회 범위가 된다.
     */
    @Query(value = "SELECT CAST(d.public_uuid AS TEXT), m.model_name, m.brand, o.org_name, d.issued_at "
            + "FROM dpp d "
            + "JOIN product_model m ON m.model_id = d.model_id "
            + "JOIN organization o ON o.org_id = d.owner_org_id "
            + "WHERE d.deleted_at IS NULL AND d.status = 'ACTIVE' "
            + "AND (m.model_name ILIKE CONCAT('%', :q, '%') OR m.brand ILIKE CONCAT('%', :q, '%')) "
            + "ORDER BY d.issued_at DESC NULLS LAST LIMIT 20",
            nativeQuery = true)
    List<Object[]> searchByNameOrBrand(@Param("q") String query);

    /**
     * 열람 기록을 남길 때 필요한 최소 정보. Object[] 순서:
     * dpp_id, model_name, brand, updated_at.
     */
    @Query(value = "SELECT d.dpp_id, m.model_name, m.brand, d.updated_at "
            + "FROM dpp d "
            + "JOIN product_model m ON m.model_id = d.model_id "
            + "WHERE d.deleted_at IS NULL AND d.status = 'ACTIVE' "
            + "AND CAST(d.public_uuid AS TEXT) = :publicUuid",
            nativeQuery = true)
    List<Object[]> findActiveByPublicUuid(@Param("publicUuid") String publicUuid);
}
