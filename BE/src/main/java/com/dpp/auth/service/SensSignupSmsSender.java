package com.dpp.auth.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * 네이버클라우드 플랫폼 SENS(Simple &amp; Easy Notification Service)로 실제 SMS 발송.
 * application.yml 의 app.sms.enabled=true 로 켜고 ncp.sens.* 값을 application-local.yml 에
 * 채워야 동작한다. 켜기 전까지는 ConsoleSignupSmsSender가 콘솔에 코드를 찍는다.
 *
 * 발신번호(ncp.sens.sender-phone)는 네이버클라우드 콘솔에서 사전등록·심사 승인된 번호여야
 * 한다(정보통신망법상 필수) - 심사 전에는 app.sms.enabled=true로 켜도 발송 자체가 거부된다.
 * (개인 계정도 등록 가능 - 통신서비스 이용증명원 서류 제출 필요, 승인까지 보통 1~2영업일.)
 *
 * API 문서: https://guide.ncloud-docs.com/docs/sens-sms-smsmessage
 */
@Component
@ConditionalOnProperty(name = "app.sms.enabled", havingValue = "true")
public class SensSignupSmsSender implements SignupSmsSender {

    private final RestClient restClient = RestClient.create();

    private final String serviceId;
    private final String accessKey;
    private final String secretKey;
    private final String senderPhone;

    public SensSignupSmsSender(@Value("${ncp.sens.service-id}") String serviceId,
                                @Value("${ncp.sens.access-key}") String accessKey,
                                @Value("${ncp.sens.secret-key}") String secretKey,
                                @Value("${ncp.sens.sender-phone}") String senderPhone) {
        this.serviceId = serviceId;
        this.accessKey = accessKey;
        this.secretKey = secretKey;
        this.senderPhone = senderPhone;
    }

    @Override
    public void sendVerificationCode(String phone, String code) {
        String path = "/sms/v2/services/" + serviceId + "/messages";
        long timestamp = System.currentTimeMillis();
        String signature = makeSignature(path, timestamp);

        Map<String, Object> body = Map.of(
                "type", "SMS",
                "contentType", "COMM",
                "countryCode", "82",
                "from", senderPhone,
                "content", "[IEUM] 인증번호 " + code + " (5분 이내 입력)",
                "messages", List.of(Map.of("to", phone.replaceAll("[^0-9]", "")))
        );

        restClient.post()
                .uri("https://sens.apigw.ntruss.com" + path)
                .header("Content-Type", "application/json; charset=utf-8")
                .header("x-ncp-apigw-timestamp", String.valueOf(timestamp))
                .header("x-ncp-iam-access-key", accessKey)
                .header("x-ncp-apigw-signature-v2", signature)
                .body(body)
                .retrieve()
                .toBodilessEntity();
    }

    /** SENS 인증 서명 - "POST \n {path} \n {timestamp} \n {accessKey}" 를 secretKey로 HMAC-SHA256. */
    private String makeSignature(String path, long timestamp) {
        try {
            String message = "POST" + " " + path + "\n" + timestamp + "\n" + accessKey;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] rawHmac = mac.doFinal(message.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(rawHmac);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("SENS 서명 생성 실패", e);
        }
    }
}
