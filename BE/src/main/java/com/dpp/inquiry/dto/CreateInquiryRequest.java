package com.dpp.inquiry.dto;

/**
 * POST /me/inquiries 요청 본문 - 카테고리만 받는다. 첫 인사말은 서버에 실제 메시지로
 * 남기지 않는다(같은 카테고리를 다시 눌러 기존 OPEN 스레드를 이어갈 때마다 인사말이
 * 중복으로 쌓이는 걸 피하려고) - FE가 메시지 0건인 스레드에서만 안내 문구를 화면에만
 * 보여준다.
 */
public record CreateInquiryRequest(String category) {
}
