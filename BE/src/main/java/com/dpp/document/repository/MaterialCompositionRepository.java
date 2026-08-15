package com.dpp.document.repository;

import com.dpp.document.entity.MaterialComposition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MaterialCompositionRepository extends JpaRepository<MaterialComposition, Long> {

    /**
     * Mill Sheet 재업로드 시 이전 화학조성 행을 지우고 새로 채우기 위한 조회 - deleteAll로
     * 넘겨서 지운다(파생 delete 쿼리 대신 findAll+deleteAll을 쓰는 이유는 이 리포지토리의
     * 다른 파생 메서드들과 스타일을 맞추기 위함 - @Modifying 네이티브 delete 없이도 충분히
     * 단순함).
     */
    List<MaterialComposition> findByDppIdAndEntryKind(Long dppId, String entryKind);
}
