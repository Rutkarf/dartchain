package io.dartchain.backend.auth.oauth;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.auth.application.AuthException;
import io.dartchain.backend.auth.model.UserAccount;
import io.dartchain.backend.auth.oauth.dto.OAuthProviderInfo;
import io.dartchain.backend.auth.oauth.dto.OAuthProvidersResponse;
import io.dartchain.backend.config.ApiRoutes;
import io.dartchain.backend.config.OAuthProperties;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class OAuthService {

    private static final String DEV_MOCK_CODE_PREFIX = "dev-mock:";

    private final OAuthProperties oauthProperties;
    private final OAuthUserProvisioner userProvisioner;
    private final InMemoryOAuthStateStore stateStore;
    private final InMemoryOAuthExchangeCodeStore exchangeCodeStore;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public OAuthService(
            OAuthProperties oauthProperties,
            OAuthUserProvisioner userProvisioner,
            InMemoryOAuthStateStore stateStore,
            InMemoryOAuthExchangeCodeStore exchangeCodeStore,
            ObjectMapper objectMapper
    ) {
        this.oauthProperties = oauthProperties;
        this.userProvisioner = userProvisioner;
        this.stateStore = stateStore;
        this.exchangeCodeStore = exchangeCodeStore;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.create();
    }

    public OAuthProvidersResponse listProviders() {
        List<OAuthProviderInfo> providers = new ArrayList<>();
        for (OAuthProvider provider : OAuthProvider.values()) {
            providers.add(new OAuthProviderInfo(
                    provider.id(),
                    provider.label(),
                    isProviderAvailable(provider)
            ));
        }
        return new OAuthProvidersResponse(providers);
    }

    public URI buildAuthorizationRedirect(OAuthProvider provider, String redirectUri) {
        if (isRealProviderConfigured(provider)) {
            ensureRealProviderEnabled(provider);
            String frontendRedirect = normalizeFrontendRedirect(redirectUri);
            String backendCallback = backendCallbackUrl(provider);

            return switch (provider) {
                case GOOGLE -> authorizeUrl(
                        frontendRedirect,
                        UriComponentsBuilder.fromUriString("https://accounts.google.com/o/oauth2/v2/auth")
                                .queryParam("client_id", oauthProperties.getGoogle().getClientId())
                                .queryParam("redirect_uri", backendCallback)
                                .queryParam("response_type", "code")
                                .queryParam("scope", "openid email profile")
                                .queryParam("access_type", "online")
                                .queryParam("prompt", "select_account")
                );
                case META -> authorizeUrl(
                        frontendRedirect,
                        UriComponentsBuilder.fromUriString("https://www.facebook.com/v21.0/dialog/oauth")
                                .queryParam("client_id", oauthProperties.getMeta().getClientId())
                                .queryParam("redirect_uri", backendCallback)
                                .queryParam("scope", "email,public_profile")
                );
                case APPLE -> authorizeUrl(
                        frontendRedirect,
                        UriComponentsBuilder.fromUriString("https://appleid.apple.com/auth/authorize")
                                .queryParam("client_id", oauthProperties.getApple().getClientId())
                                .queryParam("redirect_uri", backendCallback)
                                .queryParam("response_type", "code")
                                .queryParam("response_mode", "form_post")
                                .queryParam("scope", "name email")
                );
                case MICROSOFT -> authorizeUrl(
                        frontendRedirect,
                        UriComponentsBuilder.fromUriString("https://login.microsoftonline.com/common/oauth2/v2.0/authorize")
                                .queryParam("client_id", oauthProperties.getMicrosoft().getClientId())
                                .queryParam("redirect_uri", backendCallback)
                                .queryParam("response_type", "code")
                                .queryParam("scope", "openid profile email User.Read offline_access")
                                .queryParam("response_mode", "query")
                );
                case GITHUB -> authorizeUrl(
                        frontendRedirect,
                        UriComponentsBuilder.fromUriString("https://github.com/login/oauth/authorize")
                                .queryParam("client_id", oauthProperties.getGithub().getClientId())
                                .queryParam("redirect_uri", backendCallback)
                                .queryParam("scope", "read:user user:email")
                );
                case X -> authorizeWithPkce(
                        frontendRedirect,
                        UriComponentsBuilder.fromUriString("https://twitter.com/i/oauth2/authorize")
                                .queryParam("client_id", oauthProperties.getX().getClientId())
                                .queryParam("redirect_uri", backendCallback)
                                .queryParam("response_type", "code")
                                .queryParam("scope", "users.read tweet.read offline.access")
                );
                case DISCORD -> authorizeUrl(
                        frontendRedirect,
                        UriComponentsBuilder.fromUriString("https://discord.com/api/oauth2/authorize")
                                .queryParam("client_id", oauthProperties.getDiscord().getClientId())
                                .queryParam("redirect_uri", backendCallback)
                                .queryParam("response_type", "code")
                                .queryParam("scope", "identify email")
                );
            };
        }

        if (oauthProperties.isDevMockEnabled()) {
            return buildDevMockCallbackRedirect(provider, redirectUri);
        }

        throw unavailableProviderException(provider);
    }

    public URI completeAuthorization(OAuthProvider provider, String code, String state) {
        if (code != null && code.startsWith(DEV_MOCK_CODE_PREFIX)) {
            if (!oauthProperties.isDevMockEnabled()) {
                throw new AuthException(403, "OAuth mock désactivé");
            }

            String frontendRedirect = stateStore.consumeRedirectUri(state)
                    .orElse(normalizeFrontendRedirect(null));
            UserAccount account = userProvisioner.resolveOrCreate(
                    provider,
                    "dev-mock-" + provider.id(),
                    "oauth." + provider.id() + "@dartchain.local",
                    "OAuth " + provider.id()
            );
            return redirectWithExchangeCode(frontendRedirect, account);
        }

        ensureRealProviderEnabled(provider);
        InMemoryOAuthStateStore.OAuthStateSnapshot snapshot = stateStore.consumeState(state)
                .orElse(new InMemoryOAuthStateStore.OAuthStateSnapshot(normalizeFrontendRedirect(null), null));
        String frontendRedirect = snapshot.redirectUri() == null || snapshot.redirectUri().isBlank()
                ? normalizeFrontendRedirect(null)
                : snapshot.redirectUri();

        UserAccount account = switch (provider) {
            case GOOGLE -> resolveGoogleAccount(code);
            case META -> resolveMetaAccount(code);
            case APPLE -> resolveAppleAccount(code);
            case MICROSOFT -> resolveMicrosoftAccount(code);
            case GITHUB -> resolveGitHubAccount(code);
            case X -> resolveXAccount(code, snapshot.codeVerifier());
            case DISCORD -> resolveDiscordAccount(code);
        };

        return redirectWithExchangeCode(frontendRedirect, account);
    }

    public UserAccount consumeExchangeCode(String code) {
        return exchangeCodeStore.consume(code)
                .orElseThrow(() -> new AuthException(401, "Code OAuth invalide ou expiré"));
    }

    private URI redirectWithExchangeCode(String frontendRedirect, UserAccount account) {
        String exchangeCode = exchangeCodeStore.issue(account);
        return appendQueryParam(frontendRedirect, "oauth_code", exchangeCode);
    }

    private URI authorizeUrl(String frontendRedirect, UriComponentsBuilder builder) {
        String state = stateStore.createState(frontendRedirect);
        return builder.queryParam("state", state).encode().build().toUri();
    }

    private URI authorizeWithPkce(String frontendRedirect, UriComponentsBuilder builder) {
        String codeVerifier = generateCodeVerifier();
        String codeChallenge = codeChallengeS256(codeVerifier);
        String state = stateStore.createState(frontendRedirect, codeVerifier);
        return builder
                .queryParam("state", state)
                .queryParam("code_challenge", codeChallenge)
                .queryParam("code_challenge_method", "S256")
                .encode()
                .build()
                .toUri();
    }

    private UserAccount resolveGoogleAccount(String code) {
        OAuthProperties.Provider google = oauthProperties.getGoogle();
        GoogleTokenResponse token = restClient.post()
                .uri("https://oauth2.googleapis.com/token")
                .header("Content-Type", "application/x-www-form-urlencoded")
                .body(formBody(
                        "code", code,
                        "client_id", google.getClientId(),
                        "client_secret", google.getClientSecret(),
                        "redirect_uri", backendCallbackUrl(OAuthProvider.GOOGLE),
                        "grant_type", "authorization_code"
                ))
                .retrieve()
                .body(GoogleTokenResponse.class);

        if (token == null || token.accessToken() == null || token.accessToken().isBlank()) {
            throw new AuthException(502, "Impossible d'échanger le code Google");
        }

        GoogleUserInfo profile = restClient.get()
                .uri("https://openidconnect.googleapis.com/v1/userinfo")
                .header("Authorization", "Bearer " + token.accessToken())
                .retrieve()
                .body(GoogleUserInfo.class);

        if (profile == null || profile.sub() == null || profile.sub().isBlank()) {
            throw new AuthException(502, "Profil Google incomplet");
        }

        return userProvisioner.resolveOrCreate(
                OAuthProvider.GOOGLE,
                profile.sub(),
                requireEmail(profile.email(), "Google"),
                profile.name()
        );
    }

    private UserAccount resolveMetaAccount(String code) {
        OAuthProperties.Provider meta = oauthProperties.getMeta();
        String callback = backendCallbackUrl(OAuthProvider.META);
        MetaTokenResponse token = restClient.get()
                .uri(UriComponentsBuilder
                        .fromUriString("https://graph.facebook.com/v21.0/oauth/access_token")
                        .queryParam("client_id", meta.getClientId())
                        .queryParam("client_secret", meta.getClientSecret())
                        .queryParam("redirect_uri", callback)
                        .queryParam("code", code)
                        .build(true)
                        .toUri())
                .retrieve()
                .body(MetaTokenResponse.class);

        if (token == null || token.accessToken() == null || token.accessToken().isBlank()) {
            throw new AuthException(502, "Impossible d'échanger le code Meta");
        }

        MetaUserInfo profile = restClient.get()
                .uri(UriComponentsBuilder
                        .fromUriString("https://graph.facebook.com/me")
                        .queryParam("fields", "id,name,email")
                        .queryParam("access_token", token.accessToken())
                        .build(true)
                        .toUri())
                .retrieve()
                .body(MetaUserInfo.class);

        if (profile == null || profile.id() == null || profile.id().isBlank()) {
            throw new AuthException(502, "Profil Meta incomplet");
        }

        return userProvisioner.resolveOrCreate(
                OAuthProvider.META,
                profile.id(),
                requireEmail(profile.email(), "Meta"),
                profile.name()
        );
    }

    private UserAccount resolveAppleAccount(String code) {
        OAuthProperties.AppleProvider apple = oauthProperties.getApple();
        String clientSecret = AppleClientSecretGenerator.generate(apple);
        AppleTokenResponse token = restClient.post()
                .uri("https://appleid.apple.com/auth/token")
                .header("Content-Type", "application/x-www-form-urlencoded")
                .body(formBody(
                        "code", code,
                        "client_id", apple.getClientId(),
                        "client_secret", clientSecret,
                        "redirect_uri", backendCallbackUrl(OAuthProvider.APPLE),
                        "grant_type", "authorization_code"
                ))
                .retrieve()
                .body(AppleTokenResponse.class);

        if (token == null || token.idToken() == null || token.idToken().isBlank()) {
            throw new AuthException(502, "Impossible d'échanger le code Apple");
        }

        AppleIdTokenClaims claims = parseAppleIdToken(token.idToken());
        if (claims.sub() == null || claims.sub().isBlank()) {
            throw new AuthException(502, "Profil Apple incomplet");
        }

        String email = claims.email();
        if (email == null || email.isBlank()) {
            email = "apple." + claims.sub() + "@oauth.dartchain.local";
        }

        return userProvisioner.resolveOrCreate(
                OAuthProvider.APPLE,
                claims.sub(),
                email,
                claims.email() == null ? "Apple User" : claims.email()
        );
    }

    private UserAccount resolveMicrosoftAccount(String code) {
        OAuthProperties.Provider microsoft = oauthProperties.getMicrosoft();
        StandardTokenResponse token = restClient.post()
                .uri("https://login.microsoftonline.com/common/oauth2/v2.0/token")
                .header("Content-Type", "application/x-www-form-urlencoded")
                .body(formBody(
                        "code", code,
                        "client_id", microsoft.getClientId(),
                        "client_secret", microsoft.getClientSecret(),
                        "redirect_uri", backendCallbackUrl(OAuthProvider.MICROSOFT),
                        "grant_type", "authorization_code"
                ))
                .retrieve()
                .body(StandardTokenResponse.class);

        if (token == null || token.accessToken() == null || token.accessToken().isBlank()) {
            throw new AuthException(502, "Impossible d'échanger le code Microsoft");
        }

        MicrosoftUserInfo profile = restClient.get()
                .uri("https://graph.microsoft.com/v1.0/me")
                .header("Authorization", "Bearer " + token.accessToken())
                .retrieve()
                .body(MicrosoftUserInfo.class);

        if (profile == null || profile.id() == null || profile.id().isBlank()) {
            throw new AuthException(502, "Profil Microsoft incomplet");
        }

        String email = profile.mail();
        if (email == null || email.isBlank()) {
            email = profile.userPrincipalName();
        }
        if (email == null || email.isBlank()) {
            email = "microsoft." + profile.id() + "@oauth.dartchain.local";
        }

        return userProvisioner.resolveOrCreate(
                OAuthProvider.MICROSOFT,
                profile.id(),
                email,
                profile.displayName()
        );
    }

    private UserAccount resolveGitHubAccount(String code) {
        OAuthProperties.Provider github = oauthProperties.getGithub();
        StandardTokenResponse token = restClient.post()
                .uri("https://github.com/login/oauth/access_token")
                .header("Accept", "application/json")
                .header("Content-Type", "application/x-www-form-urlencoded")
                .body(formBody(
                        "code", code,
                        "client_id", github.getClientId(),
                        "client_secret", github.getClientSecret(),
                        "redirect_uri", backendCallbackUrl(OAuthProvider.GITHUB)
                ))
                .retrieve()
                .body(StandardTokenResponse.class);

        if (token == null || token.accessToken() == null || token.accessToken().isBlank()) {
            throw new AuthException(502, "Impossible d'échanger le code GitHub");
        }

        GitHubUserInfo profile = restClient.get()
                .uri("https://api.github.com/user")
                .header("Authorization", "Bearer " + token.accessToken())
                .header("Accept", "application/vnd.github+json")
                .retrieve()
                .body(GitHubUserInfo.class);

        if (profile == null || profile.id() == null || profile.id().isBlank()) {
            throw new AuthException(502, "Profil GitHub incomplet");
        }

        String email = profile.email();
        if (email == null || email.isBlank()) {
            email = resolveGitHubPrimaryEmail(token.accessToken());
        }
        if (email == null || email.isBlank()) {
            email = "github." + profile.id() + "@oauth.dartchain.local";
        }

        return userProvisioner.resolveOrCreate(
                OAuthProvider.GITHUB,
                profile.id(),
                email,
                profile.name() == null || profile.name().isBlank() ? profile.login() : profile.name()
        );
    }

    private UserAccount resolveXAccount(String code, String codeVerifier) {
        if (codeVerifier == null || codeVerifier.isBlank()) {
            throw new AuthException(400, "Code verifier PKCE manquant pour X");
        }

        OAuthProperties.Provider x = oauthProperties.getX();
        StandardTokenResponse token = restClient.post()
                .uri("https://api.twitter.com/2/oauth2/token")
                .header("Content-Type", "application/x-www-form-urlencoded")
                .headers(headers -> headers.setBasicAuth(x.getClientId(), x.getClientSecret()))
                .body(formBody(
                        "code", code,
                        "redirect_uri", backendCallbackUrl(OAuthProvider.X),
                        "grant_type", "authorization_code",
                        "code_verifier", codeVerifier
                ))
                .retrieve()
                .body(StandardTokenResponse.class);

        if (token == null || token.accessToken() == null || token.accessToken().isBlank()) {
            throw new AuthException(502, "Impossible d'échanger le code X");
        }

        XUserResponse profile = restClient.get()
                .uri("https://api.twitter.com/2/users/me?user.fields=profile_image_url")
                .header("Authorization", "Bearer " + token.accessToken())
                .retrieve()
                .body(XUserResponse.class);

        if (profile == null || profile.data() == null || profile.data().id() == null || profile.data().id().isBlank()) {
            throw new AuthException(502, "Profil X incomplet");
        }

        String email = "x." + profile.data().id() + "@oauth.dartchain.local";

        return userProvisioner.resolveOrCreate(
                OAuthProvider.X,
                profile.data().id(),
                email,
                profile.data().name() == null || profile.data().name().isBlank()
                        ? profile.data().username()
                        : profile.data().name()
        );
    }

    private UserAccount resolveDiscordAccount(String code) {
        OAuthProperties.Provider discord = oauthProperties.getDiscord();
        StandardTokenResponse token = restClient.post()
                .uri("https://discord.com/api/oauth2/token")
                .header("Content-Type", "application/x-www-form-urlencoded")
                .body(formBody(
                        "code", code,
                        "client_id", discord.getClientId(),
                        "client_secret", discord.getClientSecret(),
                        "redirect_uri", backendCallbackUrl(OAuthProvider.DISCORD),
                        "grant_type", "authorization_code"
                ))
                .retrieve()
                .body(StandardTokenResponse.class);

        if (token == null || token.accessToken() == null || token.accessToken().isBlank()) {
            throw new AuthException(502, "Impossible d'échanger le code Discord");
        }

        DiscordUserInfo profile = restClient.get()
                .uri("https://discord.com/api/users/@me")
                .header("Authorization", "Bearer " + token.accessToken())
                .retrieve()
                .body(DiscordUserInfo.class);

        if (profile == null || profile.id() == null || profile.id().isBlank()) {
            throw new AuthException(502, "Profil Discord incomplet");
        }

        String email = profile.email();
        if (email == null || email.isBlank()) {
            email = "discord." + profile.id() + "@oauth.dartchain.local";
        }

        String displayName = profile.globalName();
        if (displayName == null || displayName.isBlank()) {
            displayName = profile.username();
        }

        return userProvisioner.resolveOrCreate(
                OAuthProvider.DISCORD,
                profile.id(),
                email,
                displayName
        );
    }

    private String resolveGitHubPrimaryEmail(String accessToken) {
        GitHubEmailInfo[] emails = restClient.get()
                .uri("https://api.github.com/user/emails")
                .header("Authorization", "Bearer " + accessToken)
                .header("Accept", "application/vnd.github+json")
                .retrieve()
                .body(GitHubEmailInfo[].class);

        if (emails == null || emails.length == 0) {
            return "";
        }

        return Arrays.stream(emails)
                .filter(entry -> entry.primary() && entry.verified())
                .map(GitHubEmailInfo::email)
                .findFirst()
                .orElseGet(() -> Arrays.stream(emails)
                        .map(GitHubEmailInfo::email)
                        .filter(value -> value != null && !value.isBlank())
                        .findFirst()
                        .orElse(""));
    }

    private AppleIdTokenClaims parseAppleIdToken(String idToken) {
        try {
            String[] parts = idToken.split("\\.");
            if (parts.length < 2) {
                throw new AuthException(502, "Jeton Apple invalide");
            }

            String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            return objectMapper.readValue(payloadJson, AppleIdTokenClaims.class);
        } catch (AuthException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new AuthException(502, "Impossible de lire le jeton Apple");
        }
    }

    private String requireEmail(String email, String providerLabel) {
        if (email == null || email.isBlank()) {
            throw new AuthException(400, providerLabel + " n'a pas fourni d'adresse email");
        }

        return email.trim();
    }

    private void ensureRealProviderEnabled(OAuthProvider provider) {
        if (provider == OAuthProvider.APPLE) {
            if (!oauthProperties.getApple().isEnabled()) {
                throw unavailableProviderException(provider);
            }
            return;
        }

        OAuthProperties.Provider config = standardProviderConfig(provider);
        if (!config.isEnabled()) {
            throw unavailableProviderException(provider);
        }
    }

    private boolean isProviderAvailable(OAuthProvider provider) {
        if (isRealProviderConfigured(provider)) {
            if (provider == OAuthProvider.APPLE) {
                return oauthProperties.getApple().isEnabled();
            }
            return standardProviderConfig(provider).isEnabled();
        }

        return oauthProperties.isDevMockEnabled();
    }

    private boolean isRealProviderConfigured(OAuthProvider provider) {
        if (provider == OAuthProvider.APPLE) {
            return oauthProperties.getApple().hasCredentials();
        }

        return standardProviderConfig(provider).hasCredentials();
    }

    private OAuthProperties.Provider standardProviderConfig(OAuthProvider provider) {
        return switch (provider) {
            case GOOGLE -> oauthProperties.getGoogle();
            case META -> oauthProperties.getMeta();
            case MICROSOFT -> oauthProperties.getMicrosoft();
            case GITHUB -> oauthProperties.getGithub();
            case X -> oauthProperties.getX();
            case DISCORD -> oauthProperties.getDiscord();
            case APPLE -> throw new IllegalArgumentException("Apple utilise une configuration dédiée");
        };
    }

    private URI buildDevMockCallbackRedirect(OAuthProvider provider, String redirectUri) {
        String frontendRedirect = normalizeFrontendRedirect(redirectUri);
        String state = stateStore.createState(frontendRedirect);

        return UriComponentsBuilder
                .fromUriString(backendCallbackUrl(provider))
                .queryParam("code", DEV_MOCK_CODE_PREFIX + provider.id())
                .queryParam("state", state)
                .encode()
                .build()
                .toUri();
    }

    private AuthException unavailableProviderException(OAuthProvider provider) {
        return new AuthException(503, "Connexion " + provider.id() + " non configurée");
    }

    private String backendCallbackUrl(OAuthProvider provider) {
        String base = oauthProperties.getBackendBaseUrl().replaceAll("/+$", "");
        return base + ApiRoutes.AUTH_V1_PREFIX + "/oauth/connect/" + provider.id() + "/callback";
    }

    private String normalizeFrontendRedirect(String redirectUri) {
        if (redirectUri != null && !redirectUri.isBlank()) {
            return redirectUri.trim();
        }
        return oauthProperties.getFrontendCallbackUrl();
    }

    private static String generateCodeVerifier() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String codeChallengeS256(String codeVerifier) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(codeVerifier.getBytes(StandardCharsets.US_ASCII));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (Exception exception) {
            throw new AuthException(500, "Impossible de générer le challenge PKCE");
        }
    }

    private static URI appendQueryParam(String baseUrl, String key, String value) {
        String separator = baseUrl.contains("?") ? "&" : "?";
        return URI.create(baseUrl + separator + key + "=" + URLEncoder.encode(value, StandardCharsets.UTF_8));
    }

    private static String formBody(String... pairs) {
        if (pairs.length % 2 != 0) {
            throw new IllegalArgumentException("formBody requires key/value pairs");
        }

        StringBuilder builder = new StringBuilder();
        for (int index = 0; index < pairs.length; index += 2) {
            if (index > 0) {
                builder.append('&');
            }
            builder.append(URLEncoder.encode(pairs[index], StandardCharsets.UTF_8));
            builder.append('=');
            builder.append(URLEncoder.encode(pairs[index + 1], StandardCharsets.UTF_8));
        }
        return builder.toString();
    }
}
