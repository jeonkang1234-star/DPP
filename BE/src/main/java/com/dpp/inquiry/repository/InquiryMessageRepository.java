package com.dpp.inquiry.repository;

import com.dpp.inquiry.entity.InquiryMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InquiryMessageRepository extends JpaRepository<InquiryMessage, Long> {

    /** 스레드 전체 메시지, 오래된 순(채팅 UI가 위→아래로 그대로 렌더링). 폴링마다
     * 이 전체를 다시 받는다 - 스레드 하나의 메시지 수가 채팅 특성상 많지 않을 거라
     * "마지막으로 받은 이후"만 증분으로 주는 최적화는 이번 라운드엔 하지 않는다. */
    List<InquiryMessage> findByInquiryIdOrderByCreatedAtAsc(Long inquiryId);

    /** 목록 화면의 "마지막 메시지 미리보기"용. */
    java.util.Optional<InquiryMessage> findFirstByInquiryIdOrderByCreatedAtDesc(Long inquiryId);
}
