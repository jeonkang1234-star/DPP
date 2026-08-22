package com.dpp.collab.dto;

/**
 * 초대 이력 목록/응답 1건. status는 SENT/ACCEPTED/EXPIRED/REVOKED/REJECTED 원문 그대로 -
 * 한글 라벨/색상은 FE에서 매핑한다(scan_history와 같은 방식). roleCode도 마찬가지로
 * 원문(RAW_SUPPLIER/TEST_LAB) - FE가 한글 라벨을 입힌다.
 *
 * mailSent / mailError - 2026-08-21 강 리포트 "초대할 때 메일이 발송되는지 확인이 안 된다".
 * 예전엔 화면이 무조건 "N건의 초대 메일을 발송했습니다"라고만 했다. SMTP가 인증 실패로
 * 거절해도 같은 문구가 나와서, 메일이 실제로 나갔는지 알 방법이 서버 로그뿐이었다.
 * 이제 발송 결과를 그대로 실어 보낸다. 목록 조회(list)에서는 발송을 다시 하지 않으므로
 * mailSent=null(=알 수 없음)이다.
 */
public record InvitationDto(
        Long invitationId,
        String orgName,
        String email,
        String status,
        String sentAt,
        boolean canResend,
        Long dppId,
        String roleCode,
        /** 이번 요청에서 메일이 실제로 나갔는가. 목록 조회 응답에서는 null. */
        Boolean mailSent,
        /** 발송에 실패했을 때 원인 한 줄. 성공이거나 목록 조회면 null. */
        String mailError
) {
}
