package com.dpp.mypage.repository;

import com.dpp.mypage.entity.Organization;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * 관리자 대시보드(FE 회원관리 탭 - 예전엔 data.json의 members/anchors/inquiries 목데이터
 * 였다, 2026-08-19 강 요청 "현재 전부 다 목데이터인데 전부 실데이터로 변경") 집계 전용
 * native query 모음. user_account/organization/dpp/blockchain_anchor를 넘나드는 집계라
 * com.dpp.verify.repository.DppRegistrySearchRepository와 같은 관례(Repository 최소
 * 상속 + native query)를 따른다.
 */
public interface AdminStatsRepository extends Repository<Organization, Long> {

    /** account_type별 가입자 수 - Object[]: [account_type, count]. */
    @Query(value = "SELECT account_type, COUNT(*) FROM user_account "
            + "WHERE deleted_at IS NULL GROUP BY account_type", nativeQuery = true)
    List<Object[]> countUsersByAccountType();

    /** domain별 DPP 등록 수(삭제 제외) - Object[]: [domain, count]. */
    @Query(value = "SELECT domain, COUNT(*) FROM dpp WHERE deleted_at IS NULL GROUP BY domain", nativeQuery = true)
    List<Object[]> countDppsByDomain();

    @Query(value = "SELECT COUNT(*) FROM organization WHERE deleted_at IS NULL AND approval_status = 'PENDING'",
            nativeQuery = true)
    long countPendingApprovals();

    /**
     * 가장 최근 앵커링 기록 - 행이 있으면 크기 1인 리스트, 없으면 빈 리스트.
     * 각 행은 Object[]: [anchored_at 또는 created_at, block_no].
     *
     * 반환 타입이 왜 List인가(2026-08-20): 원래 Optional&lt;Object[]&gt;와 Object[]였는데,
     * Spring Data JPA는 배열 반환 타입을 "행 하나"가 아니라 "행들의 모음"으로 해석한다.
     * 그래서 2컬럼 1행짜리 결과가 Object[]{행} 즉 길이 1짜리 배열로 넘어왔고,
     * row[1]을 읽는 순간 GET /admin/dashboard가 통째로 500으로 죽었다
     * ("Index 1 out of bounds for length 1" - 앵커 행이 하나라도 생기면 재현된다.
     * 그래서 화면에는 전체 가입자 수·등록 DPP 수까지 전부 '—'로 보였다).
     * List&lt;Object[]&gt;는 해석의 여지가 없으므로 이 함정을 아예 없앤다.
     */
    @Query(value = "SELECT COALESCE(anchored_at, created_at) AS at, block_no FROM blockchain_anchor "
            + "ORDER BY COALESCE(anchored_at, created_at) DESC LIMIT 1", nativeQuery = true)
    List<Object[]> findLatestAnchor();

    /** 최근 30일 앵커링 성공률 계산용 - 항상 1행. 각 행은 Object[]: [총 건수, 성공(MOCK/CONFIRMED) 건수]. */
    @Query(value = "SELECT COUNT(*), COUNT(*) FILTER (WHERE status IN ('MOCK', 'CONFIRMED')) "
            + "FROM blockchain_anchor WHERE created_at >= now() - INTERVAL '30 days'", nativeQuery = true)
    List<Object[]> countAnchorSuccessRate30d();

    /** 최근 14일 일별 앵커링 건수 - 스파크라인용. Object[]: [일자, 건수], 데이터 없는 날은 행 자체가 없음(서비스에서 0으로 채움). */
    @Query(value = "SELECT CAST(created_at AS date) AS d, COUNT(*) FROM blockchain_anchor "
            + "WHERE created_at >= now() - INTERVAL '14 days' "
            + "GROUP BY CAST(created_at AS date) ORDER BY d", nativeQuery = true)
    List<Object[]> dailyAnchorCounts14d();

    /**
     * 최근 30일 문의 유형별 건수 - Object[]: [sub_type, count]. 문의는 별도 테이블 없이
     * notification(category='INQUIRY')로만 남는다. 문의 접수 기능이 아직 없어서 지금은
     * 늘 0행이 나오고, 화면은 그걸 그대로 "접수된 문의가 없습니다"로 보여준다 - 예전엔
     * data.json의 고정 배열(계정·인증 140건 / Tier 심사 78건 ...)을 그리고 있었다
     * (2026-08-20 강 요청 "유형별 문의 역시 일단 실데이터로 전환, Tier 심사 항목 삭제").
     * TIER는 문의 유형에서 제외한다.
     */
    @Query(value = "SELECT COALESCE(NULLIF(sub_type, ''), 'ETC') AS t, COUNT(*) "
            + "FROM notification "
            + "WHERE category = 'INQUIRY' AND created_at >= now() - INTERVAL '30 days' "
            + "AND COALESCE(sub_type, '') <> 'TIER' "
            + "GROUP BY 1 ORDER BY 2 DESC, 1", nativeQuery = true)
    List<Object[]> countInquiriesByType30d();

    /**
     * 회원(조직) 목록 + 보유/발행 DPP 수 - "보유"는 삭제되지 않은 전체 DPP, "발행"은
     * status='ACTIVE'(공개 발급 완료)만. LEFT JOIN이라 DPP가 하나도 없는 조직도 0건으로
     * 나온다(가짜 숫자를 채우지 않는 게 이 코드베이스 관례 - DashboardService 주석 참고).
     */
    @Query(value = "SELECT o.org_id, o.org_name, o.biz_reg_no, o.created_at, o.country_code, o.domain, "
            + "COUNT(d.dpp_id) FILTER (WHERE d.deleted_at IS NULL) AS held, "
            + "COUNT(d.dpp_id) FILTER (WHERE d.deleted_at IS NULL AND d.status = 'ACTIVE') AS issued "
            + "FROM organization o "
            + "LEFT JOIN dpp d ON d.owner_org_id = o.org_id "
            + "WHERE o.deleted_at IS NULL AND o.approval_status = 'ACTIVE' "
            + "GROUP BY o.org_id, o.org_name, o.biz_reg_no, o.created_at, o.country_code, o.domain "
            + "ORDER BY o.created_at DESC", nativeQuery = true)
    List<Object[]> findMembersWithDppCounts();
}
