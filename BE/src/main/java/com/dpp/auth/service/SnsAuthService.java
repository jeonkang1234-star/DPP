package com.dpp.auth.service;

import com.dpp.auth.config.SnsOAuthProperties;
import com.dpp.auth.dto.TokenResponse;
import com.dpp.auth.entity.SnsProvider;
import com.dpp.auth.entity.Tier;
import com.dpp.auth.entity.User;
import com.dpp.auth.entity.UserRole;
import com.dpp.auth.repository.UserRepository;
import com.dpp.auth.security.JwtTokenProvider;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

/**
 * 개인(INDIVIDUAL) 회원은 이 서비스를 통해서만 가입/로그인한다 (SNS 전용).
 * 가입과 동시에 Tier1을 자동 부여한다. (Tier 변경/역할군 신청은 mypage 패키지 담당)
 */
@Service
public class SnsAuthService {

    private final SnsOAuthProperties properties;
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final RestClient restClient = RestClient.create();

    public SnsAuthService(SnsOAuthProperties properties,
                           UserRepository userRepository,
                           JwtTokenProvider jwtTokenProvider) {
        this.properties = properties;
        this.userRepository = userRepository;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    public String buildAuthorizeUrl(SnsProvider provider, String state) {
        SnsOAuthProperties.Provider cfg = providerConfig(provider);
        String authorizeUrl = switch (provider) {
            case KAKAO -> "https://kauth.kakao.com/oauth/authorize";
            case GOOGLE -> "https://accounts.google.com/o/oauth2/v2/auth";
            case NAVER -> "https://nid.naver.com/oauth2.0/authorize";
        };

        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(authorizeUrl)
                .queryParam("client_id", cfg.getClientId())
                .queryParam("redirect_uri", cfg.getRedirectUri())
                .queryParam("response_type", "code")
                .queryParam("state", state);

        if (provider == SnsProvider.GOOGLE) {
            builder.queryParam("scope", "openid email profile");
        }
        // TODO: state는 세션/캐시에 저장해뒀다가 callback에서 검증해야 CSRF 방지됨. 지금은 발급만 함.
        return builder.build().toUriString();
    }

    public TokenResponse loginOrSignup(SnsProvider provider, String code) {
        String accessToken = exchangeCodeForToken(provider, code);
        Map<String, String> profile = fetchNormalizedProfile(provider, accessToken);

        String snsId = profile.get("snsId");
        if (snsId == null || snsId.isBlank()) {
            throw new IllegalStateException("SNS 프로필에서 고유 id를 확인할 수 없습니다.");
        }

        User user = userRepository.findBySnsProviderAndSnsId(provider, snsId)
                .orElseGet(() -> userRepository.save(
                        User.builder()
                                .role(UserRole.INDIVIDUAL)
                                .tier(Tier.TIER1) // 개인 = 가입 즉시 Tier1
                                .username(profile.getOrDefault("nickname", provider.name().toLowerCase() + "_" + snsId))
                                .email(profile.get("email"))
                                .snsProvider(provider)
                                .snsId(snsId)
                                .build()
                ));

        String access = jwtTokenProvider.createAccessToken(
                user.getId().toString(), Map.of("role", user.getRole().name()));
        String refresh = jwtTokenProvider.createRefreshToken(user.getId().toString());
        return TokenResponse.of(access, refresh);
    }

    @SuppressWarnings("unchecked")
    private String exchangeCodeForToken(SnsProvider provider, String code) {
        SnsOAuthProperties.Provider cfg = providerConfig(provider);
        String tokenUrl = switch (provider) {
            case KAKAO -> "https://kauth.kakao.com/oauth/token";
            case GOOGLE -> "https://oauth2.googleapis.com/token";
            case NAVER -> "https://nid.naver.com/oauth2.0/token";
        };

        String body = "grant_type=authorization_code"
                + "&client_id=" + cfg.getClientId()
                + "&client_secret=" + cfg.getClientSecret()
                + "&redirect_uri=" + cfg.getRedirectUri()
                + "&code=" + code;

        Map<String, Object> response = restClient.post()
                .uri(tokenUrl)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .body(body)
                .retrieve()
                .body(Map.class);

        Object token = response != null ? response.get("access_token") : null;
        if (token == null) {
            throw new IllegalStateException("SNS 제공자로부터 access_token을 받지 못했습니다.");
        }
        return token.toString();
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> fetchNormalizedProfile(SnsProvider provider, String accessToken) {
        String profileUrl = switch (provider) {
            case KAKAO -> "https://kapi.kakao.com/v2/user/me";
            case GOOGLE -> "https://openidconnect.googleapis.com/v1/userinfo";
            case NAVER -> "https://openapi.naver.com/v1/nid/me";
        };

        Map<String, Object> raw = restClient.get()
                .uri(profileUrl)
                .header("Authorization", "Bearer " + accessToken)
                .retrieve()
                .body(Map.class);

        if (raw == null) {
            throw new IllegalStateException("SNS 프로필 조회에 실패했습니다.");
        }

        return switch (provider) {
            case KAKAO -> {
                Map<String, Object> account = (Map<String, Object>) raw.getOrDefault("kakao_account", Map.of());
                Map<String, Object> kakaoProfile = (Map<String, Object>) account.getOrDefault("profile", Map.of());
                yield Map.of(
                        "snsId", orEmpty(raw.get("id")),
                        "email", orEmpty(account.get("email")),
                        "nickname", orEmpty(kakaoProfile.get("nickname"))
                );
            }
            case GOOGLE -> Map.of(
                    "snsId", orEmpty(raw.get("sub")),
                    "email", orEmpty(raw.get("email")),
                    "nickname", orEmpty(raw.get("name"))
            );
            case NAVER -> {
                Map<String, Object> response = (Map<String, Object>) raw.getOrDefault("response", Map.of());
                yield Map.of(
                        "snsId", orEmpty(response.get("id")),
                        "email", orEmpty(response.get("email")),
                        "nickname", orEmpty(response.get("nickname"))
                );
            }
        };
    }

    private static String orEmpty(Object value) {
        return value == null ? "" : value.toString();
    }

    private SnsOAuthProperties.Provider providerConfig(SnsProvider provider) {
        return switch (provider) {
            case KAKAO -> properties.getKakao();
            case GOOGLE -> properties.getGoogle();
            case NAVER -> properties.getNaver();
        };
    }
}
