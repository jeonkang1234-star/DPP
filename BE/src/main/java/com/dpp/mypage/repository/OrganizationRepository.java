package com.dpp.mypage.repository;

import com.dpp.mypage.entity.OrgApprovalStatus;
import com.dpp.mypage.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrganizationRepository extends JpaRepository<Organization, Long> {

    /** 기업 회원가입 시 동일 (국가, 사업자등록번호)의 조직이 이미 있으면 새로 만들지 않고 합류시키는 용도. */
    Optional<Organization> findByCountryCodeAndBizRegNoAndDeletedAtIsNull(String countryCode, String bizRegNo);

    /** 관리자 가입승인 화면(AdminOrgApprovalService) - 삭제되지 않은 조직을 최신 신청순으로. */
    List<Organization> findByDeletedAtIsNullOrderByCreatedAtDesc();

    /** 세관 관할 매칭(CustomsClearanceService) - 특정 국가에서 활성화된 세관 조직을 전부 찾는다.
     * 한 나라에 세관 계정이 여럿 등록돼 있으면(예: 항구별) 전부 대상이 된다. */
    List<Organization> findByOrgTypeAndCountryCodeAndApprovalStatusAndDeletedAtIsNull(
            String orgType, String countryCode, OrgApprovalStatus approvalStatus);
}
