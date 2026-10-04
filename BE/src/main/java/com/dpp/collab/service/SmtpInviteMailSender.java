package com.dpp.collab.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

/**
 * 실제 SMTP 발송기 - com.dpp.auth.service.SmtpSignupMailSender와 같은 패턴(같은 JavaMailSender
 * 빈을 그대로 재사용). app.mail.enabled=true + spring.mail.* 설정이 있어야 활성화된다.
 * 2026-10-04부터 본문에 초대 링크(/invite/{token})를 넣고, HTML 버튼 + 텍스트 대체본으로 보낸다.
 *
 * 제목·본문 문구는 InviteMailSender.Invite에 두어 콘솔 발송기와 완전히 같은 걸 쓴다.
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
    public void sendInvite(Invite invite) {
        // 링크가 있으면 HTML(버튼) + 텍스트 대체본을 같이 보낸다(2026-10-04). 메일 앱이 HTML을
        // 못 보여주면 텍스트 본문의 주소가 그대로 보인다.
        String html = invite.htmlBody();
        if (html != null) {
            try {
                MimeMessage mime = javaMailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");
                helper.setFrom(fromAddress);
                helper.setTo(invite.toEmail());
                helper.setSubject(invite.subject());
                helper.setText(invite.body(), html);
                javaMailSender.send(mime);
                return;
            } catch (jakarta.mail.MessagingException e) {
                throw new IllegalStateException("초대 메일 작성 실패: " + e.getMessage(), e);
            }
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(invite.toEmail());
        message.setSubject(invite.subject());
        message.setText(invite.body());
        javaMailSender.send(message);
    }
}
