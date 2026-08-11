package com.dpp.auth.service;

/**
 * 회원가입 인증코드 발송 추상화.
 * 로컬 개발 기본값은 ConsoleSignupMailSender(콘솔 로그)이고,
 * application.yml 의 app.mail.enabled=true + spring.mail.* 값을 채우면
 * SmtpSignupMailSender가 실제 SMTP로 발송한다. 호출하는 쪽(EmailVerificationService)은
 * 어떤 구현체가 붙었는지 몰라도 되게 인터페이스로 분리했다.
 */
public interface SignupMailSender {

    void sendVerificationCode(String email, String code);
}
