package com.dpp.dpp.repository;

import com.dpp.dpp.entity.DppFieldCrossCheck;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** dpp_field_cross_check CRUD - 문서/입력값 교차검증(V36). */
public interface DppFieldCrossCheckRepository extends JpaRepository<DppFieldCrossCheck, Long> {

    List<DppFieldCrossCheck> findByDppIdOrderByUpdatedAtDesc(Long dppId);

    List<DppFieldCrossCheck> findByDppIdAndStatus(Long dppId, String status);

    /**
     * document_id 가 NULL 인 행도 있어서(파서가 문서를 특정하지 못한 경우) findBy...
     * 파생 쿼리로는 IS NULL 분기를 한 메서드로 못 쓴다 - 호출부가 둘 다 쓰지 않도록
     * documentId 는 항상 채워서 부른다.
     */
    Optional<DppFieldCrossCheck> findByDppIdAndFieldCodeAndDocumentId(Long dppId, String fieldCode, Long documentId);

    /**
     * 파생 쿼리는 파라미터가 null 이면 'document_id = null' 을 만들어 아무것도 못 찾는다
     * (SQL 에서 = NULL 은 언제나 거짓). 문서를 특정하지 못한 경우를 위한 IS NULL 버전 -
     * 이게 없으면 업로드할 때마다 같은 필드의 교차검증 행이 하나씩 새로 쌓인다
     * (document_id 가 NULL 이면 유니크 제약도 안 걸린다).
     */
    Optional<DppFieldCrossCheck> findByDppIdAndFieldCodeAndDocumentIdIsNull(Long dppId, String fieldCode);
}
