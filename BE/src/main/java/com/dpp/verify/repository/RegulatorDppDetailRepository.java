package com.dpp.verify.repository;

import com.dpp.dpp.entity.Dpp;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * 규제기관(EU 시장감시/세관) 전용 DPP 상세 열람 - 2026-09-28 강 요청
 * ("QR로 보는 개인보다 더 많은 정보를 볼 수 있게").
 *
 * 공개 여권(PublicPassportService)이 주는 항목 값 외에, 개인 QR 조회에는 없는
 * 제품 식별/제조사 신원/공급망 참여자/증빙서류/ZKP 증명/블록체인 앵커/통관 이력을 모은다.
 * DppRegistrySearchRepository와 같은 관례(Repository&lt;Dpp, Long&gt; + native query).
 *
 * 모든 컬럼을 SQL에서 TEXT로 캐스팅해서 내려준다 - 드라이버/Hibernate 버전에 따라
 * timestamptz가 OffsetDateTime/Timestamp/Instant 중 무엇으로 오는지 달라지는 문제를
 * 자바 쪽 instanceof 분기 없이 피하려는 것이다. 시각은 KST로 'YYYY-MM-DD HH24:MI'.
 */
public interface RegulatorDppDetailRepository extends Repository<Dpp, Long> {

    /**
     * 0 dpp_id, 1 public_uuid, 2 serial_number, 3 status, 4 lifecycle_stage(번호),
     * 5 lifecycle_stage 이름, 6 completeness, 7 issued_at, 8 internal_sku, 9 gtin,
     * 10 model_name, 11 brand, 12 hs_code, 13 origin_country, 14 domain, 15 granularity,
     * 16 org_name, 17 biz_reg_no, 18 eori_code, 19 lei_code, 20 country_code,
     * 21 주소(합침), 22 contact_name, 23 contact_email, 24 contact_phone, 25 사진 유무('Y'/'N')
     */
    @Query(value = "SELECT CAST(d.dpp_id AS TEXT), CAST(d.public_uuid AS TEXT), d.serial_number, d.status, "
            + "CAST(d.lifecycle_stage AS TEXT), sd.stage_name_ko, CAST(d.completeness AS TEXT), "
            + "to_char(d.issued_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI'), "
            + "m.internal_sku, m.gtin, m.model_name, m.brand, m.hs_code, CAST(m.origin_country AS TEXT), "
            + "d.domain, m.granularity, "
            + "o.org_name, o.biz_reg_no, o.eori_code, o.lei_code, CAST(o.country_code AS TEXT), "
            + "NULLIF(CONCAT_WS(' ', o.postal_code, o.address_line1, o.address_line2, o.city), ''), "
            + "o.contact_name, o.contact_email, o.contact_phone, "
            + "CASE WHEN d.product_photo_uri IS NULL THEN 'N' ELSE 'Y' END "
            + "FROM dpp d "
            + "JOIN product_model m ON m.model_id = d.model_id "
            + "JOIN organization o ON o.org_id = d.owner_org_id "
            + "LEFT JOIN lifecycle_stage_def sd ON sd.domain = d.domain AND sd.stage_no = d.lifecycle_stage "
            + "WHERE d.deleted_at IS NULL AND d.status = 'ACTIVE' AND CAST(d.public_uuid AS TEXT) = :publicUuid",
            nativeQuery = true)
    List<Object[]> findHeader(@Param("publicUuid") String publicUuid);

    /** 공급망 참여자: 0 참여 조직명(없으면 게스트 이메일), 1 역할명, 2 제출 상태, 3 완료 시각. */
    @Query(value = "SELECT COALESCE(o.org_name, p.guest_email), COALESCE(r.role_name_ko, p.role_code), p.submit_status, "
            + "to_char(p.completed_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') "
            + "FROM dpp_participant p "
            + "LEFT JOIN organization o ON o.org_id = p.org_id "
            + "LEFT JOIN role r ON r.role_code = p.role_code "
            + "WHERE p.dpp_id = :dppId ORDER BY p.invited_at",
            nativeQuery = true)
    List<Object[]> findParticipants(@Param("dppId") Long dppId);

    /**
     * 증빙서류: 0 서류 종류, 1 파일명, 2 발행기관, 3 발행일, 4 만료일, 5 심사 상태,
     * 6 SHA-256 해시, 7 업로드 시각, 8 제출 조직.
     * document_link로 연결된 것 + owner_type='DPP'로 직접 붙은 것 둘 다.
     */
    @Query(value = "SELECT COALESCE(t.name_ko, doc.doc_type_code), doc.file_name, doc.issuer, "
            + "to_char(doc.issued_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD'), "
            + "to_char(doc.expires_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD'), "
            + "doc.review_status, CAST(doc.content_hash AS TEXT), "
            + "to_char(doc.created_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI'), so.org_name "
            + "FROM document doc "
            + "LEFT JOIN document_type t ON t.doc_type_code = doc.doc_type_code "
            + "LEFT JOIN organization so ON so.org_id = doc.submitted_by_org "
            + "WHERE doc.deleted_at IS NULL AND ("
            + "  doc.document_id IN (SELECT dl.document_id FROM document_link dl WHERE dl.dpp_id = :dppId) "
            + "  OR (doc.owner_type = 'DPP' AND doc.owner_id = :dppId)) "
            + "ORDER BY doc.created_at DESC",
            nativeQuery = true)
    List<Object[]> findDocuments(@Param("dppId") Long dppId);

    /** ZKP 증명: 0 주장 유형, 1 회로명, 2 상태, 3 검증 시각, 4 생성 시각. */
    @Query(value = "SELECT z.claim_type, z.circuit_name, z.status, "
            + "to_char(z.verified_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI'), "
            + "to_char(z.created_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') "
            + "FROM zkp_proof z WHERE z.dpp_id = :dppId ORDER BY z.created_at DESC",
            nativeQuery = true)
    List<Object[]> findProofs(@Param("dppId") Long dppId);

    /**
     * 블록체인 앵커: 0 대상(DPP_SNAPSHOT/DOCUMENT), 1 tx_id, 2 블록 번호, 3 상태, 4 앵커 시각,
     * 5 앵커된 해시. 이 DPP의 스냅샷 앵커 + 이 DPP에 연결된 서류 앵커.
     */
    @Query(value = "SELECT ba.target_type, ba.tx_id, CAST(ba.block_no AS TEXT), ba.status, "
            + "to_char(COALESCE(ba.anchored_at, ba.created_at) AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI'), "
            + "CAST(ba.content_hash AS TEXT) "
            + "FROM blockchain_anchor ba "
            + "WHERE (ba.target_type = 'DPP_SNAPSHOT' AND ba.target_id IN "
            + "        (SELECT s.snapshot_id FROM dpp_snapshot s WHERE s.dpp_id = :dppId)) "
            + "   OR (ba.target_type = 'DOCUMENT' AND ba.target_id IN "
            + "        (SELECT dl.document_id FROM document_link dl WHERE dl.dpp_id = :dppId)) "
            + "ORDER BY ba.created_at DESC",
            nativeQuery = true)
    List<Object[]> findAnchors(@Param("dppId") Long dppId);

    /**
     * 통관 이력: 0 수출/수입 구분, 1 수출국, 2 수입국, 3 관할 세관, 4 HS 코드, 5 판정,
     * 6 무결성 대조 결과, 7 판정 시각, 8 신청 시각.
     */
    @Query(value = "SELECT c.clearance_side, CAST(c.export_country_code AS TEXT), CAST(c.import_country_code AS TEXT), "
            + "co.org_name, c.hs_code, c.decision, c.integrity_result, "
            + "to_char(c.decided_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI'), "
            + "to_char(c.created_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') "
            + "FROM customs_clearance c "
            + "LEFT JOIN organization co ON co.org_id = c.customs_org_id "
            + "WHERE c.dpp_id = :dppId ORDER BY c.created_at DESC",
            nativeQuery = true)
    List<Object[]> findClearances(@Param("dppId") Long dppId);

    /**
     * 이 도메인에서 RESTRICTED(정당한 이익 보유자·규제기관 전용) 공개범위인 항목 라벨 -
     * 화면에서 "개인 QR 조회에서는 안 보이는 항목"에 표시를 달기 위한 것.
     */
    @Query(value = "SELECT rf.label_ko FROM requirement_field rf "
            + "WHERE rf.disclosure_scope = 'RESTRICTED' AND rf.domain IN ('COMMON', :domain)",
            nativeQuery = true)
    List<String> findRestrictedLabels(@Param("domain") String domain);
}
