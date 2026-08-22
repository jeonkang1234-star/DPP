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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(SnsAuthService.class);

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

    /**
     * state를 발급하고 oauth_state에 저장한 뒤, 인증 페이지 URL을 반환한다.
     *
     * @param requestBaseUrl 사용자가 실제로 접속한 주소의 앞부분(예: http://localhost,
     *                       http://15.134.9.240). 콜백 주소를 여기서 만든다 - 설정에 박아 두면
     *                       퍼블릭 IP로 접속해도 SNS 인증 후 localhost로 돌아가 버린다
     *                       (2026-08-22 강 리포트). null이면 설정값을 그대로 쓴다.
     */
    @Transactional
    public String buildAuthorizeUrl(SnsProvider provider, String requestBaseUrl) {
        SnsOAuthProperties.Provider cfg = providerConfig(provider);
        String redirectUri = resolveRedirectUri(provider, requestBaseUrl, cfg.getRedirectUri());

        OAuthState state = new OAuthState();
        state.setState(UUID.randomUUID().toString());
        state.setProvider(provider);
        state.setPurpose(OAuthStatePurpose.LOGIN);
        // 토큰 교환 때 "인가 때 보낸 것과 똑같은" redirect_uri를 다시 보내야 하므로
        // 여기서 정한 값을 state 행에 남긴다(exchangeCodeForToken이 이 값을 쓴다).
        state.setRedirectUri(redirectUri);
        state.setExpiresAt(OffsetDateTime.now().plusMinutes(STATE_TTL_MINUTES));
        oAuthStateRepository.save(state);

        String authorizeUrl = switch (provider) {
            case KAKAO -> "https://kauth.kakao.com/oauth/authorize";
            case GOOGLE -> "https://accounts.google.com/o/oauth2/v2/auth";
            case NAVER -> "https://nid.naver.com/oauth2.0/authorize";
        };

        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(authorizeUrl)
                .queryParam("client_id", cfg.getClientId())
                .queryParam("redirect_uri", redirectUri)
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

        String accessToken = exchangeCodeForToken(provider, code, oAuthState.getRedirectUri());
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

    /**
     * 실제로 SNS에 보낼 콜백 주소를 정한다.
     *
     * 사용자가 접속한 주소(requestBaseUrl)를 그대로 쓰는 것이 기본이다 - localhost로 들어왔으면
     * localhost 콜백, 퍼블릭 IP로 들어왔으면 퍼블릭 IP 콜백. 그래야 한 벌의 설정으로 로컬과
     * 배포 환경이 모두 동작한다.
     *
     * 다만 요청 호스트는 클라이언트가 조작할 수 있으므로, oauth.allowed-redirect-hosts가
     * 채워져 있으면 그 목록에 있는 호스트만 인정하고 아니면 설정값으로 되돌린다. 목록이
     * 비어 있으면(기본값) 요청 호스트를 그대로 쓴다 - 조작된 주소로 인가를 시도해도 각 SNS
     * 콘솔에 등록되지 않은 redirect_uri는 제공자가 거부하므로 토큰이 새어나가지 않는다.
     */
    private String resolveRedirectUri(SnsProvider provider, String requestBaseUrl, String configured) {
        if (requestBaseUrl == null || requestBaseUrl.isBlank()) {
            return configured;
        }
        String base = requestBaseUrl.endsWith("/")
                ? requestBaseUrl.substring(0, requestBaseUrl.length() - 1) : requestBaseUrl;
        String allowList = properties.getAllowedRedirectHosts();
        if (allowList != null && !allowList.isBlank() && !hostAllowed(base, allowList)) {
            log.warn("허용되지 않은 콜백 호스트({}) - 설정된 redirect-uri로 대체합니다.", base);
            return configured;
        }
        return base + "/auth/sns/" + provider.name().toLowerCase() + "/callback";
    }

    /** base(scheme://host[:port])의 호스트가 쉼표로 구분된 허용 목록에 있는지. 포트는 무시한다. */
    private boolean hostAllowed(String base, String allowList) {
        String hostPort = base.replaceFirst("^https?://", "");
        int slash = hostPort.indexOf('/');
        if (slash >= 0) {
            hostPort = hostPort.substring(0, slash);
        }
        int colon = hostPort.lastIndexOf(':');
        String host = colon > 0 ? hostPort.substring(0, colon) : hostPort;
        for (String allowed : allowList.split(",")) {
            if (host.equalsIgnoreCase(allowed.trim())) {
                return true;
            }
        }
        return false;
    }

    private UserSnsLink createUserWithSnsLink(SnsProvider provider, String subject, Map<String, String> profile) {
        String email = profile.get("email");
        String normalizedEmail = (email == null || email.isBlank()) ? null : email;
        // SNS 프로필 이메일이 이미 다른 계정(주로 기업 이메일/비밀번호 계정)에 쓰이고 있으면
        // user_account.email 유니크 제약에 걸려 500이 난다. 미리 확인해서 이해 가능한 메시지로 막는다.
        // (계정 연동은 아직 지원하지 않음 - TODO)
        if (normalizedEmail != null && userAccountRepository.existsByEmail(normalizedEmail)) {
            throw new IllegalStateException(
                    "이미 다른 방식으로 가입된 이메일(" + normalizedEmail + ")입니다. 기업 계정이라면 이메일/비밀번호로 로그인해 주세요.");
        }

        UserAccount user = new UserAccount();
        user.setAccountType(AccountType.PERSONAL);
        user.setCredentialType(CredentialType.SNS);
        user.setOnboardingStep(OnboardingStep.SIGNED_UP);
        user.setStatus(AccountStatus.ACTIVE);
        user.setEmail(normalizedEmail);
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

    /**
     * @param redirectUri 인가 요청 때 보냈던 값 그대로(oauth_state.redirect_uri). 제공자는
     *                    이 둘이 완전히 같은지 대조하므로 설정값을 다시 읽어 쓰면 안 된다 -
     *                    접속 주소에 따라 콜백이 달라지기 때문이다.
     */
    @SuppressWarnings("unchecked")
    private String exchangeCodeForToken(SnsProvider provider, String code, String redirectUri) {
        SnsOAuthProperties.Provider cfg = providerConfig(provider);
        String effectiveRedirectUri = (redirectUri == null || redirectUri.isBlank())
                ? cfg.getRedirectUri() : redirectUri;
        String tokenUrl = switch (provider) {
            case KAKAO -> "https://kauth.kakao.com/oauth/token";
            case GOOGLE -> "https://oauth2.googleapis.com/token";
            case NAVER -> "https://nid.naver.com/oauth2.0/token";
        };

        String body = "grant_type=authorization_code"
                + "&client_id=" + cfg.getClientId()
                + "&client_secret=" + cfg.getClientSecret()
                + "&redirect_uri=" + effectiveRedirectUri
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