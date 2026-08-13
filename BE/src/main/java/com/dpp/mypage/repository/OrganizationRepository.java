package com.dpp.mypage.repository;

import com.dpp.mypage.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OrganizationRepository extends JpaRepository<Organization, Long> {

    /** 기업 회원가입 시 동일 (국가, 사업자등록번호)의 조직이 이미 있으면 새로 만들지 않고 합류시키는 용도. */
    Optional<Organization> findByCountryCodeAndBizRegNoAndDeletedAtIsNull(String countryCode, String bizRegNo);
}
