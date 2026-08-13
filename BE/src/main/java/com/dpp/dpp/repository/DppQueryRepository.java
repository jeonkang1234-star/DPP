package com.dpp.dpp.repository;

import com.dpp.dpp.entity.Dpp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

/**
 * 이름을 DppRepository가 아니라 DppQueryRepository로 지은 이유: com.dpp.document.repository에
 * 이미 같은 단순 클래스명(DppRepository)의 리포지토리가 있어서, 둘 다 있으면 Spring Data JPA가
 * 둘 다 빈 이름 "dppRepository"로 등록하려다가 BeanDefinitionOverrideException으로 기동
 * 자체가 죽는다(2026-08-13, 실제로 이 문제로 로그인까지 502가 났었다 - 클래스명이 같으면
 * 패키지가 달라도 충돌한다는 걸 몰랐음). com.dpp.document.entity.Dpp는 문서 업로드 전용
 * 임시 조회 엔티티라 안 건드리고, 여기 새 엔티티(com.dpp.dpp.entity.Dpp)와 리포지토리는
 * 이름을 다르게 지어서 공존시킨다.
 */
public interface DppQueryRepository extends JpaRepository<Dpp, Long> {

    List<Dpp> findByOwnerOrgIdAndDeletedAtIsNull(Long ownerOrgId);

    /**
     * V2__functions.sql의 fn_recalc_completeness(dpp_id)를 그대로 호출한다 - dpp 테이블의
     * completeness/filled_count/required_count가 이 함수 호출 시점에만 갱신되는데(트리거
     * 없음), 이걸 부르는 Java 코드가 지금까지 전혀 없었다. 이 프로젝트에서 이 함수를 처음
     * 실제로 호출하는 지점 - 조회 직전에 매번 불러서 최신 완성도를 보장한다(DPP 개수가
     * 아직 적어서 N+1 호출 비용은 무시할 만한 수준).
     */
    @Query(value = "SELECT fn_recalc_completeness(:dppId)", nativeQuery = true)
    BigDecimal recalcCompleteness(@Param("dppId") Long dppId);

    /**
     * recalcCompleteness()가 native SQL로 dpp 행을 직접 UPDATE하기 때문에, 같은 트랜잭션
     * 안에서 findByOwnerOrgIdAndDeletedAtIsNull로 이미 로드된 Dpp 엔티티(1차 캐시에 올라가
     * 있음)를 다시 조회해도 갱신된 값이 안 보인다(Hibernate가 DB 재조회 없이 관리 중인
     * 인스턴스를 그대로 반환). 그래서 completeness와 별개로, 엔티티를 거치지 않는 순수
     * 스칼라 프로젝션으로 filled_count/required_count를 직접 다시 읽는다 - Object[] 프로젝션은
     * 엔티티 식별자 기준 1차 캐시에 안 걸린다.
     */
    @Query(value = "SELECT filled_count, required_count FROM dpp WHERE dpp_id = :dppId", nativeQuery = true)
    Object[] findCompletenessCounts(@Param("dppId") Long dppId);

    /**
     * findCompletenessCounts와 같은 이유(주석 참고)로 status/completeness까지 한 번에
     * 스칼라 프로젝션으로 읽는다 - FieldFormService가 recalcCompleteness() 직후 같은
     * 트랜잭션 안에서 최신값을 돌려줘야 하는데, 이미 로드된 Dpp 엔티티를 그대로 쓰면
     * 1차 캐시에 걸려 recalc 이전 값이 보인다. Object[] 순서: status, completeness,
     * filled_count, required_count.
     */
    @Query(value = "SELECT status, completeness, filled_count, required_count FROM dpp WHERE dpp_id = :dppId",
            nativeQuery = true)
    Object[] findStatusAndCompleteness(@Param("dppId") Long dppId);

    /**
     * V2__functions.sql의 v_dpp_missing_field 뷰(필수인데 미충족인 필드 + 책임 주체) 조회.
     * "대기작업 큐"의 실제 데이터 소스 - notification 테이블은 아직 아무것도 안 쓰고 있고
     * (com.dpp.notify 조사 결과 write 경로 없음) 개념적으로도 이 큐 항목과는 다른 대상이라
     * 뷰를 직접 native query로 읽는다. Object[] 순서: dpp_id, field_code, section, label_ko,
     * responsible_role_name, sort_order.
     */
    @Query(value = "SELECT dpp_id, field_code, section, label_ko, responsible_role_name, sort_order "
            + "FROM v_dpp_missing_field WHERE dpp_id IN (:dppIds) ORDER BY sort_order LIMIT :limit",
            nativeQuery = true)
    List<Object[]> findMissingFields(@Param("dppIds") List<Long> dppIds, @Param("limit") int limit);
}
