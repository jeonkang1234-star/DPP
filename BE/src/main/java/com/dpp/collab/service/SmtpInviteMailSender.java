package com.dpp.collab.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/**
 * 실제 SMTP 발송기 - com.dpp.auth.service.SmtpSignupMailSender와 같은 패턴(같은 JavaMailSender
 * 빈을 그대로 재사용). app.mail.enabled=true + spring.mail.* 설정이 있어야 활성화된다.
 * 메일 본문의 token은 아직 "초대 수락" 화면/API가 없어서 클릭 가능한 링크가 아니라 값
 * 그대로 노출한다 - 그 화면이 생기면 링크로 바꿀 것.
 */
@Component
@ConditionalOnProperty(name = "app.mail.enabled", havingValue = "true")
public class SmtpInviteMailSender implements InviteMailSender {

    private final JavaMailSender javaMailSender;
    private final String fromAddress;

    public SmtpInviteMailSender(JavaMailSender javaMailSender,
                                 @Value("${app.mail.from}") String fromAddress) {
        this.javaMailSender = javaMailSender;
        this.fromAddress = fromAddress;
    }

    @Override
    public void sendInvite(String toEmail, String inviterOrgName, String token) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(toEmail);
        message.setSubject("[DPP Platform] " + inviterOrgName + "님의 협력사 초대");
        message.setText(inviterOrgName + "에서 DPP Platform 협력사로 초대했습니다.\n초대 코드: " + token
                + "\n유효기간 7일 이내에 담당자에게 문의해 주세요.");
        javaMailSender.send(message);
    }
}
