package com.dpp.mypage.repository;

import com.dpp.mypage.entity.OrgDomainGrant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** org_domain_grant CRUD - 도메인 확장 신청/심사(DomainGrantService). */
public interface OrgDomainGrantRepository extends JpaRepository<OrgDomainGrant, Long> {

    /** 마이페이지 "보유·신청 중인 도메인" 목록. */
    List<OrgDomainGrant> findByOrgIdOrderByRequestedAtDesc(Long orgId);

    /** 같은 조직·같은 도메인은 한 행만 존재한다(ux_org_domain_grant). 재신청은 그 행을 되돌린다. */
    Optional<OrgDomainGrant> findByOrgIdAndDomain(Long orgId, String domain);

    /** 허용 도메인 계산용 - 승인된 것만. */
    List<OrgDomainGrant> findByOrgIdAndStatus(Long orgId, String status);

    /** 관리자 심사 목록 - 대기 중인 것을 먼저 보여주기 위해 상태로 거른다. */
    List<OrgDomainGrant> findByStatusOrderByRequestedAtDesc(String status);

    /** 관리자 심사 목록(전체). */
    List<OrgDomainGrant> findAllByOrderByRequestedAtDesc();
}
