package com.dpp.document.repository;

import com.dpp.document.entity.DocumentLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DocumentLinkRepository extends JpaRepository<DocumentLink, Long> {

    List<DocumentLink> findByDppId(Long dppId);
}
