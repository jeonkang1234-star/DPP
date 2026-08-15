package com.dpp.document.repository;

import com.dpp.document.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DocumentRepository extends JpaRepository<Document, Long> {

    /**
     * ux_document_dedup(owner_type, owner_id, doc_type_code, content_hash) 유니크 제약과
     * 동일한 키로 조회 - DocumentIngestService가 save() 직전이 아니라 파싱 직후에 미리 걸러서,
     * DataIntegrityViolationException이 그대로 500으로 새는 것과 ZKP 재생성 낭비를 막는다.
     */
    Optional<Document> findByOwnerTypeAndOwnerIdAndDocTypeCodeAndContentHash(
            String ownerType, Long ownerId, String docTypeCode, String contentHash);
}
