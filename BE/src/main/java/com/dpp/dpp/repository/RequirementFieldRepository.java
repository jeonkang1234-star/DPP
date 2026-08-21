package com.dpp.dpp.repository;

import com.dpp.dpp.entity.RequirementField;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface RequirementFieldRepository extends JpaRepository<RequirementField, String> {

    /**
     * domain을 리스트로 받는다 - "강재 기본 정보" 화면이 원래는 domain='STEEL'만 다뤘는데
     * (2026-08-13), COMMON 도메인 FIELD_VALUE 항목(식별자/경제운영자/탄소/순환 정보)이
     * 화면 자체가 없어서 완성도 분모에는 들어가면서도 입력할 방법이 없었다. sort_order가
     * 이미 COMMON/STEEL을 구분 없이 섹션 단위(IDENTIFIER 101~/OPERATOR 201~/SPEC 301~/
     * MATERIAL 401~/CARBON 501~/CIRCULAR 601~/DOCUMENT 701~)로 설계돼 있어서, 두 도메인을
     * 같이 조회해 sort_order로만 정렬해도 자연스럽게 섹션별로 묶인다(2026-08-14).
     */
    List<RequirementField> findByDomainInAndFieldKindAndStorageTargetAndAutoFalseAndActiveTrueOrderBySortOrder(
            List<String> domains, String fieldKind, String storageTarget);

    /**
     * 파서가 돌려준 field_code 뭉치를 검증할 때 쓴다(SpecFieldAutoFillService).
     * dpp_field_value.field_code에는 FK가 걸려 있어서, 존재하지 않는 코드를 그대로 쓰면
     * 업로드가 FK 위반으로 죽는다 - 쓰기 전에 반드시 이걸로 걸러야 한다.
     */
    List<RequirementField> findByFieldCodeInAndActiveTrue(Collection<String> fieldCodes);

    /** 협력사(참여 조직) 전용 - 자기 role_code가 담당인 필드만. */
    List<RequirementField> findByDomainInAndFieldKindAndStorageTargetAndResponsibleRoleAndAutoFalseAndActiveTrueOrderBySortOrder(
            List<String> domains, String fieldKind, String storageTarget, String responsibleRole);
}
