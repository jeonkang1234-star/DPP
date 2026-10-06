package com.dpp.document.repository;

import com.dpp.document.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface DocumentRepository extends JpaRepository<Document, Long> {

    /**
     * ux_document_dedup(owner_type, owner_id, doc_type_code, content_hash) 유니크 제약과
     * 동일한 키로 조회 - DocumentIngestService가 save() 직전이 아니라 파싱 직후에 미리 걸러서,
     * DataIntegrityViolationException이 그대로 500으로 새는 것과 ZKP 재생성 낭비를 막는다.
     */
    Optional<Document> findByOwnerTypeAndOwnerIdAndDocTypeCodeAndContentHash(
            String ownerType, Long ownerId, String docTypeCode, String contentHash);

    /**
     * 위와 같은 키지만 삭제되지 않은 행만, 최대 1건. ux_document_dedup 은 deleted_at IS NULL
     * 부분 인덱스라 삭제된 같은 파일이 여러 건 있을 수 있고, 그걸 Optional 단건 조회로 받으면
     * IncorrectResultSize 로 터진다. Document 엔티티에 deleted_at 매핑이 없어서 네이티브로 쓴다.
     * 같은 파일 재업로드 처리(DocumentSlotService.upload, 2026-10-06)에 쓴다.
     */
    @Query(value = "SELECT * FROM document WHERE owner_type = :ownerType AND owner_id = :ownerId"
            + " AND doc_type_code = :docTypeCode AND content_hash = :contentHash AND deleted_at IS NULL"
            + " ORDER BY document_id DESC LIMIT 1", nativeQuery = true)
    Optional<Document> findActiveDuplicate(@Param("ownerType") String ownerType, @Param("ownerId") Long ownerId,
                                           @Param("docTypeCode") String docTypeCode, @Param("contentHash") String contentHash);
}
