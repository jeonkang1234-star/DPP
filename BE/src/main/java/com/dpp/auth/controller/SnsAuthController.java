package com.dpp.auth.controller;

import com.dpp.auth.dto.TokenResponse;
import com.dpp.auth.entity.SnsProvider;
import com.dpp.auth.service.SnsAuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;

@RestController
@RequestMapping("/auth/sns")
public class SnsAuthController {

    private final SnsAuthService snsAuthService;

    public SnsAuthController(SnsAuthService snsAuthService) {
        this.snsAuthService = snsAuthService;
    }

    /**
     * 카카오/구글/네이버 인증 페이지로 리다이렉트. state는 서비스가 발급해서 oauth_state에 저장한다.
     *
     * 콜백 주소는 지금 사용자가 접속한 주소에서 만든다 - localhost로 들어왔으면 localhost 콜백,
     * 퍼블릭 IP로 들어왔으면 퍼블릭 IP 콜백. 설정에 박아 두면 한쪽에서만 동작한다
     * (2026-08-22 강 리포트 "퍼블릭 IP로 접근할 때는 SNS 로그인이 안 됨").
     */
    @GetMapping("/{provider}/login")
    public ResponseEntity<Void> login(@PathVariable String provider, HttpServletRequest request) {
        String url = snsAuthService.buildAuthorizeUrl(parseProvider(provider), requestBaseUrl(request));
        return ResponseEntity.status(302).location(URI.create(url)).build();
    }

    /**
     * 사용자가 실제로 접속한 주소의 scheme + host[:port].
     *
     * nginx가 Host와 X-Forwarded-Proto를 그대로 넘겨주므로(FE/nginx.conf), 그 두 값이면
     * 브라우저 주소창과 같은 origin을 복원할 수 있다. 헤더가 없으면(직접 호출 등) null을
     * 돌려주고 서비스가 설정값으로 폴백한다.
     */
    private String requestBaseUrl(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        String host = request.getHeader("X-Forwarded-Host");
        if (host == null || host.isBlank()) {
            host = request.getHeader("Host");
        }
        if (host == null || host.isBlank()) {
            return null;
        }
        String proto = request.getHeader("X-Forwarded-Proto");
        if (proto == null || proto.isBlank()) {
            proto = "http";
        }
        // 프록시가 여러 값을 콤마로 이어 붙이는 경우가 있어 첫 값만 쓴다.
        proto = proto.split(",")[0].trim();
        host = host.split(",")[0].trim();
        return proto + "://" + host;
    }

    /**
     * SNS 제공자가 인증 후 돌아오는 콜백. state를 oauth_state와 대조해 검증한 뒤 토큰을 발급한다.
     *
     * 브라우저가 이 URL로 직접 이동해오는 흐름이라(=AJAX 아님) JSON을 그대로 내려주면
     * 화면에 텍스트만 뜨고 끝난다. 그래서 토큰을 쿼리 파라미터에 실어 FE로 다시 리다이렉트한다.
     * FE(useAppLogic.js)가 시작 시 이 파라미터를 읽어서 세션에 저장하고 URL에서 지운다.
     * 상대경로("/")로 리다이렉트하므로 로컬(vite 프록시)·운영(nginx 동일 출처) 둘 다 그대로 동작한다.
     *
     * 실패 시에도 500 백엔드 에러 페이지를 그대로 보여주지 않고, sns_error 쿼리파라미터에
     * 이유를 담아 프론트로 돌려보낸다 (이메일 중복 등 사용자가 이해할 수 있는 상황이 많아서).
     */
    @GetMapping("/{provider}/callback")
    public ResponseEntity<Void> callback(@PathVariable String provider,
                                          @RequestParam String code,
                                          @RequestParam String state) {
        UriComponentsBuilder redirect = UriComponentsBuilder.fromUriString("/");
        try {
            TokenResponse token = snsAuthService.loginOrSignup(parseProvider(provider), code, state);
            redirect.queryParam("sns_access", token.accessToken())
                    .queryParam("sns_refresh", token.refreshToken());
        } catch (Exception e) {
            String message = e.getMessage() == null || e.getMessage().isBlank()
                    ? "SNS 로그인에 실패했습니다." : e.getMessage();
            redirect.queryParam("sns_error", message);
        }
        String redirectUrl = redirect.build().encode().toUriString();
        return ResponseEntity.status(302).location(URI.create(redirectUrl)).build();
    }

    /** URL은 소문자(kakao/google/naver)로 받고, enum은 대문자라 여기서 변환한다. */
    private SnsProvider parseProvider(String provider) {
        try {
            return SnsProvider.valueOf(provider.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "지원하지 않는 SNS 제공자입니다: " + provider);
        }
    }
}
