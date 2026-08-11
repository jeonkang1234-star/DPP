package com.dpp.auth.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 로컬 개발 기본 발송기. 실제 문자를 보내지 않고 콘솔에 코드만 찍는다.
 * SENS 계정/발신번호 등록 없이도 회원가입 플로우 전체를 테스트할 수 있게 하기 위함.
 * application.yml 의 app.sms.enabled 가 false(기본값)이거나 없을 때 이 빈이 활성화된다.
 */
@Component
@ConditionalOnProperty(name = "app.sms.enabled", havingValue = "false", matchIfMissing = true)
public class ConsoleSignupSmsSender implements SignupSmsSender {

    private static final Logger log = LoggerFactory.getLogger(ConsoleSignupSmsSender.class);

    @Override
    public void sendVerificationCode(String phone, String code) {
        log.info("[개발용 콘솔 발송 - 실제 문자 아님] {} 인증코드: {} (app.sms.enabled=true 로 바꾸면 SENS로 실제 발송됨)",
                phone, code);
    }
}
