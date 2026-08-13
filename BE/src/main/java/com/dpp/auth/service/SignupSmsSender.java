package com.dpp.auth.service;

/**
 * 회원가입 전화번호 인증코드 발송 추상화. SignupMailSender와 같은 패턴.
 * 로컬 개발 기본값은 ConsoleSignupSmsSender(콘솔 로그)이고,
 * application.yml 의 app.sms.enabled=true + ncp.sens.* 값을 채우면
 * SensSignupSmsSender가 네이버클라우드 SENS로 실제 SMS를 발송한다.
 */
public interface SignupSmsSender {

    void sendVerificationCode(String phone, String code);
}
