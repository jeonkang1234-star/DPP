package com.dpp.dpp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * dpp_participant 테이블 매핑 - "이 DPP의 이 항목은 이 협력사가 채운다"를 실제로 연결하는
 * 행. v_dpp_missing_field(V2__functions.sql)가 이미 이 테이블을 role_code로 조인해서
 * responsible_org_id/responsible_email을 채워주고 있었는데, 지금까지 이 테이블에 실제로
 * INSERT하는 Java 코드가 없어서 항상 비어 있었다(대시보드 "미충족 필드"에 책임자 정보가
 * 한 번도 안 뜬 이유).
 *
 * 초대 발송 시점엔 협력사가 아직 가입 전이라 org_id가 없다 - guest_email만 채워서 만들고,
 * 초대받은 이메일로 실제 회원가입이 완료되면(BusinessSignupService) org_id를 채워준다.
 */
@Entity
@Table(name = "dpp_participant")
@Getter
@Setter
public class DppParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "participant_id")
    private Long participantId;

    @Column(name = "dpp_id", nullable = false)
    private Long dppId;

    @Column(name = "org_id")
    private Long orgId;

    @Column(name = "guest_email", length = 200)
    private String guestEmail;

    @Column(name = "role_code", nullable = false, length = 30)
    private String roleCode;

    @Column(name = "submit_status", nullable = false, length = 20)
    private String submitStatus = "INVITED";

    @Column(name = "invited_at", nullable = false)
    private OffsetDateTime invitedAt = OffsetDateTime.now();

    /**
     * 협력사가 참여를 수락한 시각(V32). null이면 아직 미수락 - 이 역할이 담당인 데이터
     * 항목·문서는 소유 조직(제조사)이 그대로 입력·업로드한다. 값이 차는 순간부터 그
     * 항목들은 이 협력사 전용이 되고 제조사 화면에서는 읽기 전용이 된다
     * (PartnerAssignmentService 참고).
     */
    @Column(name = "accepted_at")
    private OffsetDateTime acceptedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;
}
