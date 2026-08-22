package com.dpp.audit.repository;

import com.dpp.audit.entity.AuditLog;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * audit_log 쓰기/읽기 전용 native query 모음(com.dpp.audit.entity.AuditLog의 클래스
 * 주석 참고 - log_id/created_at 복합 PK라 JPA save()로 다루기 번거로워서, 이 세션
 * 내내 써 온 관례(Repository 최소 상속 + native query)를 그대로 따른다).
 *
 * before_value/after_value는 jsonb 컬럼인데, 이 로그가 필요로 하는 값(대상 표시 문자열/
 * 결과/블록체인 tx id)은 구조화된 스키마 diff가 아니라 화면 표시용 소품이라 after_value에
 * {"targetLabel":..,"result":..,"txId":..} 하나만 담고, 읽을 땐 SQL에서 ->> 로 바로
 * 꺼낸다(자바 쪽 JSON 파싱 없이).
 */
public interface AuditLogRepository extends Repository<AuditLog, Long> {

    @Modifying
    @Query(value = "INSERT INTO audit_log (actor_user_id, actor_org_id, action, target_type, target_id, after_value) "
            + "VALUES (:actorUserId, :actorOrgId, :action, :targetType, :targetId, CAST(:afterValueJson AS jsonb))",
            nativeQuery = true)
    void insert(@Param("actorUserId") Long actorUserId,
                @Param("actorOrgId") Long actorOrgId,
                @Param("action") String action,
                @Param("targetType") String targetType,
                @Param("targetId") Long targetId,
                @Param("afterValueJson") String afterValueJson);

    /**
     * 최신순 최근 200건 - AdminOrgApprovalService.list()와 동일한 이유로 페이지네이션은
     * 아직 안 둔다(테스트 데이터 규모상 불필요, 코멘트 참고). Object[]: [created_at, action,
     * target_type, target_id, target_label, result_label, tx_id, actor_display_name,
     * actor_email, actor_org_name].
     *
     * target_type을 DPP/ZKP_PROOF/DOCUMENT로 제한한다(2026-08-22 강 요청 "감사 로그에
     * 로그인 관련 로그가 왜 뜨는지 모르겠음 - 무조건 DPP 관련한 zkp나 dpp등록 정도만").
     * 로그인은 아예 기록하지 않도록 바꿨지만(PasswordAuthService), 이미 쌓인 USER_ACCOUNT/
     * ORGANIZATION 행이 남아 있으므로 조회 쪽에서도 같이 거른다 - 감사 로그 행을 지우는
     * 것보다 감독기관에게 보여줄 범위를 좁히는 쪽이 옳다.
     */
    @Query(value = "SELECT a.created_at, a.action, a.target_type, a.target_id, "
            + "a.after_value->>'targetLabel' AS target_label, "
            + "a.after_value->>'result' AS result_label, "
            + "a.after_value->>'txId' AS tx_id, "
            + "ua.display_name, ua.email, o.org_name "
            + "FROM audit_log a "
            + "LEFT JOIN user_account ua ON ua.user_id = a.actor_user_id "
            + "LEFT JOIN organization o ON o.org_id = a.actor_org_id "
            + "WHERE a.target_type IN ('DPP', 'ZKP_PROOF', 'DOCUMENT') "
            + "ORDER BY a.created_at DESC LIMIT 200", nativeQuery = true)
    List<Object[]> findRecent();
}
