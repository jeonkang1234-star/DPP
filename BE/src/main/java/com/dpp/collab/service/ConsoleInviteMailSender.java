package com.dpp.collab.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 로컬 개발 기본 발송기 - com.dpp.auth.service.ConsoleSignupMailSender와 같은 패턴.
 * app.mail.enabled가 false(기본값)이거나 없을 때 활성화된다.
 */
@Component
@ConditionalOnProperty(name = "app.mail.enabled", havingValue = "false", matchIfMissing = true)
public class ConsoleInviteMailSender implements InviteMailSender {

    private static final Logger log = LoggerFactory.getLogger(ConsoleInviteMailSender.class);

    @Override
    public void sendInvite(String toEmail, String inviterOrgName, String token) {
        log.info("[개발용 콘솔 발송 - 실제 메일 아님] {} 협력사 초대 (발신: {}) 토큰: {} (app.mail.enabled=true 로 바꾸면 SMTP로 실제 발송됨)",
                toEmail, inviterOrgName, token);
    }
}
