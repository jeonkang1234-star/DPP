package com.dpp.auth.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/**
 * 실제 SMTP 발송기. application.yml 에서 app.mail.enabled=true 로 켜고
 * spring.mail.* (host/username/password 등)을 application-local.yml 에 채워야 동작한다.
 * 켜기 전까지는 ConsoleSignupMailSender가 대신 콘솔에 코드를 찍는다.
 */
@Component
@ConditionalOnProperty(name = "app.mail.enabled", havingValue = "true")
public class SmtpSignupMailSender implements SignupMailSender {

    private final JavaMailSender javaMailSender;
    private final String fromAddress;

    public SmtpSignupMailSender(JavaMailSender javaMailSender,
                                 @Value("${app.mail.from}") String fromAddress) {
        this.javaMailSender = javaMailSender;
        this.fromAddress = fromAddress;
    }

    @Override
    public void sendVerificationCode(String email, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(email);
        message.setSubject("[IEUM] 인증번호 " + code);
        // 2026-08-21 강 요청: 본문은 "인증번호: 123456" 수준으로 짧게.
        // 제목에도 코드를 넣어 메일함 목록에서 바로 보이게 한다.
        message.setText("인증번호: " + code + "\n\n5분 이내에 입력해 주세요.");
        javaMailSender.send(message);
    }
}
