package com.dpp.mypage.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * role 테이블 매핑. 지금은 OrganizationService가 org_type 값이 실제 존재하는 role_code인지
 * 확인하는 용도로만 쓰므로, 필요한 컬럼만 최소로 매핑한다(ddl-auto: validate는 매핑 안 한
 * 나머지 컬럼엔 관여하지 않는다).
 */
@Entity
@Table(name = "role")
@Getter
@Setter
public class Role {

    @Id
    @Column(name = "role_code", length = 30)
    private String roleCode;

    @Column(name = "role_name_ko", nullable = false, length = 100)
    private String roleNameKo;
}
