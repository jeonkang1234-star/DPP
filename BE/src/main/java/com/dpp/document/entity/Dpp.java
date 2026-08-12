package com.dpp.document.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;

import java.util.UUID;

/**
 * dpp 테이블의 최소 읽기 전용 매핑. product/dpp 발급 도메인 자체가 아직 없어서
 * (com.dpp.dpp 패키지는 package-info.java뿐) 문서 업로드가 어느 DPP에 붙는지 조회하는
 * 용도로만 쓴다 - 이 엔티티로 dpp를 생성/수정하지 않는다.
 */
@Entity
@Table(name = "dpp")
@Getter
public class Dpp {

    @Id
    @Column(name = "dpp_id")
    private Long dppId;

    @Column(name = "public_uuid", nullable = false)
    private UUID publicUuid;

    @Column(name = "owner_org_id", nullable = false)
    private Long ownerOrgId;

    @Column(name = "model_id", nullable = false)
    private Long modelId;

    @Column(name = "domain", nullable = false, length = 20)
    private String domain;

    @Column(name = "status", nullable = false, length = 20)
    private String status;
}
