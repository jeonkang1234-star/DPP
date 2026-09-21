package com.dpp.inquiry.entity;

/** inquiry.status CHECK 제약(V34__inquiry.sql)과 1:1로 맞춘다. */
public enum InquiryStatus {
    /** 아직 관리자가 한 번도 답하지 않은 상태(기본값). */
    OPEN,
    /** 관리자가 최소 한 번 답한 상태 - 제조사가 다시 메시지를 보내도 OPEN으로 되돌리지
     * 않는다(이 라운드는 "재문의 시 다시 대기열로" 같은 상태 전환까지는 다루지 않음 -
     * 필요해지면 추가). */
    ANSWERED
}
