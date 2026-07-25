package com.dpp.auth.service;

import com.dpp.auth.config.SnsOAuthProperties;
import com.dpp.auth.dto.TokenResponse;
import com.dpp.auth.entity.AccountStatus;
import com.dpp.auth.entity.AccountType;
import com.dpp.auth.entity.CredentialType;
import com.dpp.auth.entity.OAuthState;
import com.dpp.auth.entity.OAuthStatePurpose;
import com.dpp.auth.entity.OnboardingStep;
import com.dpp.auth.entity.SnsProvider;
import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.entity.UserSnsLink;
import com.dpp.auth.repository.OAuthStateRepository;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.auth.repository.UserSnsLinkRepository;
import com.dpp.auth.security.JwtTokenProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * 개인(PERSONAL) 회원은 이 서비스를 통해서만 가입/로그인한다 (SNS 전용).
 * oauth_state 테이블로 state를 실제 저장·검증해서 CSRF를 방어한다 (팀원 ERD 05번 마이그레이션 기준).
 */
@Service
public class SnsAuthService {

    private static final int STATE_TTL_MINUTES = 10;

    private final SnsOAuthProperties properties;
    private final UserAccountRepository userAccountRepository;
    private final UserSnsLinkRepository userSnsLinkRepository;
    private final OAuthStateRepository oAuthStateRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final RestClient restClient = RestClient.create();

    public SnsAuthService(SnsOAuthProperties properties,
                          UserAccountRepository userAccountRepository,
                          UserSnsLinkRepository userSnsLinkRepository,
                          OAuthStateRepository oAuthStateRepository,
                          JwtTokenProvider jwtTokenProvider) {
        this.properties = properties;
        this.userAccountRepository = userAccountRepository;
        this.userSnsLinkRepository = userSnsLinkRepository;
        this.oAuthStateRepository = oAuthStateRepository;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    /** state를 발급하고 oauth_state에 저장한 뒤, 인증 페이지 URL을 반환한다. */
    @Transactional
    public String buildAuthorizeUrl(SnsProvider provider) {
        SnsOAuthProperties.Provider cfg = providerConfig(provider);

        OAuthState state = new OAuthState();
        state.setState(UUID.randomUUID().toString());
        state.setProvider(provider);
        state.setPurpose(OAuthStatePurpose.LOGIN);
        state.setRedirectUri(cfg.getRedirectUri());
        state.setExpiresAt(OffsetDateTime.now().plusMinutes(STATE_TTL_MINUTES));
        oAuthStateRepository.save(state);

        String authorizeUrl = switch (provider) {
            case KAKAO -> "https://kauth.kakao.com/oauth/authorize";
            case GOOGLE -> "https://accounts.google.com/o/oauth2/v2/auth";
            case NAVER -> "https://nid.naver.com/oauth2.0/authorize";
        };

        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(authorizeUrl)
                .queryParam("client_id", cfg.getClientId())
                .queryParam("redirect_uri", cfg.getRedirectUri())
                .queryParam("response_type", "code")
                .queryParam("state", state.getState());

        if (provider == SnsProvider.GOOGLE) {
            builder.queryParam("scope", "openid email profile");
        }
        // encode() 필수: scope 값의 공백 등을 퍼센트 인코딩하지 않으면
        // 컨트롤러의 URI.create()에서 "Illegal character in query" 예외가 난다.
        return builder.build().encode().toUriString();
    }

    @Transactional
    public TokenResponse loginOrSignup(SnsProvider provider, String code, String state) {
        OAuthState oAuthState = oAuthStateRepository.findByStateAndUsedAtIsNull(state)
                .orElseThrow(() -> new IllegalStateException("유효하지 않거나 이미 사용된 state 입니다."));

        if (oAuthState.getProvider() != provider) {
            throw new IllegalStateException("state의 제공자가 요청과 일치하지 않습니다.");
        }
        if (oAuthState.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new IllegalStateException("만료된 로그인 요청입니다. 다시 시도해 주세요.");
        }
        oAuthState.setUsedAt(OffsetDateTime.now());
        oAuthStateRepository.save(oAuthState);

        String accessToken = exchangeCodeForToken(provider, code);
        Map<String, String> profile = fetchNormalizedProfile(provider, accessToken);

        String subject = profile.get("snsId");
        if (subject == null || subject.isBlank()) {
            throw new IllegalStateException("SNS 프로필에서 고유 id를 확인할 수 없습니다.");
        }

        UserSnsLink link = userSnsLinkRepository
                .findByProviderAndSubjectAndUnlinkedAtIsNull(provider, subject)
                .orElseGet(() -> createUserWithSnsLink(provider, subject, profile));

        link.setLastLoginAt(OffsetDateTime.now());
        userSnsLinkRepository.save(link);

        UserAccount user = link.getUserAccount();
        user.setLastLoginAt(OffsetDateTime.now());
        userAccountRepository.save(user);

        String access = jwtTokenProvider.createAccessToken(
                user.getUserId().toString(), Map.of("accountType", user.getAccountType().name()));
        String refresh = jwtTokenProvider.createRefreshToken(user.getUserId().toString());
        return TokenResponse.of(access, refresh);
    }

    private UserSnsLink createUserWithSnsLink(SnsProvider provider, String subject, Map<String, String> profile) {
        UserAccount user = new UserAccount();
        user.setAccountType(AccountType.PERSONAL);
        user.setCredentialType(CredentialType.SNS);
        user.setOnboardingStep(OnboardingStep.SIGNED_UP);
        user.setStatus(AccountStatus.ACTIVE);
        String email = profile.get("email");
        user.setEmail((email == null || email.isBlank()) ? null : email);
        String nickname = profile.get("nickname");
        user.setDisplayName((nickname == null || nickname.isBlank())
                ? provider.name().toLowerCase() + "_" + subject : nickname);
        userAccountRepository.save(user);

        UserSnsLink link = new UserSnsLink();
        link.setUserAccount(user);
        link.setProvider(provider);
        link.setSubject(subject);
        link.setProviderEmail(email);
        link.setProviderNickname(nickname);
        link.setPrimary(true);
        userSnsLinkRepository.save(link);
        return link;
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