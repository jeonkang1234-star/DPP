package com.dpp.collab.service;

/**
 * 협력사 초대 메일 발송 추상화. com.dpp.auth.service.SignupMailSender와 같은 패턴이지만
 * "인증코드" 전용 메서드라 그대로 재사용할 수 없어 별도 인터페이스로 둔다 - 실제 SMTP
 * 발송기(JavaMailSender) 자체는 같은 스프링 빈을 그대로 쓴다. 로컬 개발 기본값은
 * ConsoleInviteMailSender(콘솔 로그)이고, app.mail.enabled=true면 SmtpInviteMailSender가
 * 실제로 보낸다.
 */
public interface InviteMailSender {

    void sendInvite(String toEmail, String inviterOrgName, String token);
}
