package com.dpp.document.repository;

import com.dpp.document.entity.DocumentType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentTypeRepository extends JpaRepository<DocumentType, String> {
}
