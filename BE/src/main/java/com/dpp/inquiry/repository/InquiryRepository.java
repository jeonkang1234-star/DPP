package com.dpp.inquiry.repository;

import com.dpp.inquiry.entity.Inquiry;
import com.dpp.inquiry.entity.InquiryCategory;
import com.dpp.inquiry.entity.InquiryStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InquiryRepository extends JpaRepository<Inquiry, Long> {

    /** 제조사 문의 위젯 목록 - 자기 조직 전체(같은 팀이면 서로 다른 로그인이어도 같은
     * 스레드를 본다) 최신순. */
    List<Inquiry> findByOrgIdOrderByUpdatedAtDesc(Long orgId);

    /** 카테고리를 고르면 그 조직의 같은 카테고리 미답변(OPEN) 스레드가 있는지 먼저 본다 -
     * 있으면 새로 만들지 않고 이어서 쓴다(2026-09-17 강 요청 "카톡처럼" - 매번 새 방을
     * 만들면 대화가 흩어진다). ANSWERED까지 이어쓰게 하면 이미 끝난 문의에 계속 답이
     * 쌓이므로, OPEN인 것만 재사용 대상으로 본다.
     */
    Optional<Inquiry> findFirstByOrgIdAndCategoryAndStatusOrderByCreatedAtDesc(
            Long orgId, InquiryCategory category, InquiryStatus status);

    /** 관리자 문의함 목록 - 전체 최신순. */
    List<Inquiry> findAllByOrderByUpdatedAtDesc();
}
