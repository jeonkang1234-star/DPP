package com.dpp.document.repository;

import com.dpp.document.entity.ZkpProof;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ZkpProofRepository extends JpaRepository<ZkpProof, Long> {

    /**
     * 대시보드 "ZKP 증명 상태" 카드 집계용 - com.dpp.dpp.service.DashboardService에서 사용.
     *
     * 문서 유형(doc_type_code)별로 "가장 마지막 증명"만 세고, 그 이전 증명은 무시한다.
     *
     * 예전엔 countByDppIdInAndStatus로 zkp_proof 행을 전부 셌다. 그런데 업로드는 재제출할
     * 때마다 document 행과 zkp_proof 행을 새로 만든다(기존 행을 고치지 않는다). 그래서
     * 규격 미달로 한 번 반려(REJECTED)된 성적서를 고쳐서 다시 올려 검증에 통과(VERIFIED)해도
     * 예전 REJECTED 행이 그대로 남아 "조건 미달 반려 1"이 영원히 사라지지 않았다
     * (2026-08-23 강 지적). 실제 화면의 문서함(DocumentSlotService.getForm)은 이미 같은
     * 유형 중 document_id가 가장 큰 것 하나만 보여주고 있어서, 문서함은 "통과"인데 카드만
     * "반려 1"로 어긋나 있었다.
     *
     * 그래서 문서함과 같은 규칙(유형별 최신 1건)으로 맞춘다. document_id가 없는 증명
     * (target_type='FIELD'/'DPP')은 field_code, 그것도 없으면 claim_type을 묶음 키로 쓴다.
     *
     * 네이티브 쿼리인 이유: "그룹별 최신 1행"은 Postgres DISTINCT ON이 가장 정확하고,
     * 파생 쿼리(derived query)로는 표현할 수 없다.
     *
     * 주의: dppIds가 비면 IN () 가 되어 SQL 문법 오류가 난다 - 호출부에서 먼저 막는다
     * (DashboardService).
     */
    @Query(value = """
            SELECT COUNT(*) FROM (
                SELECT DISTINCT ON (z.dpp_id, COALESCE(d.doc_type_code, z.field_code, z.claim_type))
                       z.status AS status
                FROM zkp_proof z
                LEFT JOIN document d ON d.document_id = z.document_id
                WHERE z.dpp_id IN (:dppIds)
                ORDER BY z.dpp_id,
                         COALESCE(d.doc_type_code, z.field_code, z.claim_type),
                         z.created_at DESC,
                         z.proof_id DESC
            ) latest
            WHERE latest.status = :status
            """, nativeQuery = true)
    long countLatestByDppIdInAndStatus(@Param("dppIds") List<Long> dppIds, @Param("status") String status);

    /**
     * 공개 QR 페이지가 영업비밀 항목을 "값 대신 충족 사실"로 바꿔 보여줄 때 쓴다
     * (PublicPassportService). 이 DPP에 VERIFIED 증명이 하나라도 있으면 그 문서가 규격을
     * 통과했다는 뜻이고, 그때만 "한계값 충족(검증됨)"이라고 말할 수 있다 - 증명이 없는데
     * 충족했다고 쓰면 그게 제일 나쁜 거짓말이다.
     */
    List<ZkpProof> findByDppIdAndStatus(Long dppId, String status);
}
