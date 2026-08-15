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
     *
     * 반환 타입을 Object[]가 아니라 List<Object[]>로 선언하는 이유: Spring Data JPA가 네이티브
     * 다중 컬럼 쿼리를 "컬렉션 쿼리"로 인식해서(Object[]도 배열이라 이 판정에 걸림)
     * getResultList()로 실행한 뒤 그 List를 통째로 다시 Object[]로 변환해버린다 - 그 결과
     * 반환된 Object[]의 0번째 원소가 컬럼값이 아니라 "행 전체"(Object[])가 되어 버려서
     * 호출부의 (String) 캐스팅이 무조건 ClassCastException으로 죽었다(2026-08-15, 첫
     * 임시저장에서 발견 - public_uuid 버그를 고치고 나서야 이 코드 경로에 처음 도달함).
     * List<Object[]>로 받고 get(0)으로 첫 행을 꺼내면 정상적인 단일 행 Object[]가 나온다.
     */
    @Query(value = "SELECT filled_count, required_count FROM dpp WHERE dpp_id = :dppId", nativeQuery = true)
    List<Object[]> findCompletenessCounts(@Param("dppId") Long dppId);

    /**
     * findCompletenessCounts와 같은 이유(주석 참고)로 status/completeness까지 한 번에
     * 스칼라 프로젝션으로 읽는다 - FieldFormService가 recalcCompleteness() 직후 같은
     * 트랜잭션 안에서 최신값을 돌려줘야 하는데, 이미 로드된 Dpp 엔티티를 그대로 쓰면
     * 1차 캐시에 걸려 recalc 이전 값이 보인다. Object[] 순서: status, completeness,
     * filled_count, required_count. List<Object[]>로 선언하는 이유는 findCompletenessCounts
     * 주석 참고 - 단일 Object[]로 선언하면 Spring Data JPA가 결과를 잘못 감싸서 반환한다.
     */
    @Query(value = "SELECT status, completeness, filled_count, required_count FROM dpp WHERE dpp_id = :dppId",
            nativeQuery = true)
    List<Object[]> findStatusAndCompleteness(@Param("dppId") Long dppId);

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

    /**
     * V2__functions.sql의 fn_create_dpp_snapshot(dpp_id, reason, user_id, mock)을 호출한다.
     * 이 함수는 지금까지 존재만 하고 Java에서 한 번도 호출된 적이 없었다(2026-08-15 확인) -
     * 문서 업로드 시점 앵커링(DocumentIngestService.anchorDocumentHash/anchorZkpVerification,
     * target_type='DOCUMENT'/'EVENT')은 "개별 증빙 문서/검증 결과가 그 시점에 존재·검증됐다"만
     * 증명하고, dpp_field_value로 직접 입력한 값(강종·Heat No 등 문서화 안 된 필드)이나
     * "발급 시점에 DPP 전체가 정확히 이 내용이었다"는 별도로 증명되지 않는다 - 발급 후 값이
     * 조용히 바뀌어도 개별 문서 해시만으로는 감지가 안 된다는 뜻. fn_create_dpp_snapshot이
     * dpp+fields+documents+materials를 한 덩어리 JSONB로 얼려서 해시 하나로 anchor하는 게
     * 그 빈 자리를 메운다 - FieldFormService.issue()에서 호출(target_type='DPP_SNAPSHOT').
     * p_mock=true로 고정 호출해서 mock 앵커 행은 항상 즉시 생기고(로컬/체인 비활성 환경에서도
     * 스냅샷 자체는 남게), blockchain.enabled=true인 환경에서는 이후 Java 쪽에서 실제
     * 체인코드 호출 결과로 같은 anchor 행을 CONFIRMED로 덮어쓴다(anchorDppSnapshot 참고).
     */
    @Query(value = "SELECT fn_create_dpp_snapshot(:dppId, :reason, :userId, true)", nativeQuery = true)
    Long createSnapshot(@Param("dppId") Long dppId, @Param("reason") String reason, @Param("userId") Long userId);

    @Query(value = "SELECT content_hash FROM dpp_snapshot WHERE snapshot_id = :snapshotId", nativeQuery = true)
    String findSnapshotContentHash(@Param("snapshotId") Long snapshotId);
}
