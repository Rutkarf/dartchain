package io.dartchain.backend.auth.oauth;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.auth.store.UserAccountStore;
import io.dartchain.backend.auth.oauth.store.InMemoryOAuthIdentityStore;
import io.dartchain.backend.auth.oauth.store.OAuthIdentityStore;
import io.dartchain.backend.auth.oauth.dto.OAuthProviderInfo;
import io.dartchain.backend.config.OAuthProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.net.URI;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class OAuthServiceTest {

    private OAuthService oauthService;
    private OAuthProperties oauthProperties;

    @BeforeEach
    void setUp() {
        oauthProperties = new OAuthProperties();
        oauthProperties.getGoogle().setEnabled(true);
        oauthProperties.getGoogle().setClientId("google-client");
        oauthProperties.getGoogle().setClientSecret("google-secret");
        oauthProperties.getMeta().setEnabled(false);

        UserAccountStore userAccountStore = mock(UserAccountStore.class);
        OAuthIdentityStore oauthIdentityStore = new InMemoryOAuthIdentityStore();

        oauthService = new OAuthService(
                oauthProperties,
                userAccountStore,
                oauthIdentityStore,
                new InMemoryOAuthStateStore(),
                new InMemoryOAuthExchangeCodeStore(),
                new ObjectMapper()
        );
    }

    @Test
    void listProvidersReflectsConfiguration() {
        var response = oauthService.listProviders();

        assertThat(response.providers()).hasSize(7);
        assertThat(response.providers().getFirst().id()).isEqualTo("google");
        assertThat(response.providers().getFirst().enabled()).isTrue();
        assertThat(response.providers().get(1).id()).isEqualTo("meta");
        assertThat(response.providers().get(1).enabled()).isFalse();
    }

    @Test
    void buildAuthorizationRedirectContainsGoogleClient() {
        URI uri = oauthService.buildAuthorizationRedirect(OAuthProvider.GOOGLE, "http://localhost:4200/");

        assertThat(uri.toString()).contains("accounts.google.com");
        assertThat(uri.toString()).contains("google-client");
    }

    @Test
    void buildAuthorizationRedirectUsesPkceForXWhenConfigured() {
        oauthProperties.getX().setEnabled(true);
        oauthProperties.getX().setClientId("x-client");
        oauthProperties.getX().setClientSecret("x-secret");

        URI uri = oauthService.buildAuthorizationRedirect(OAuthProvider.X, "http://localhost:4200/");

        assertThat(uri.toString()).contains("twitter.com/i/oauth2/authorize");
        assertThat(uri.toString()).contains("code_challenge=");
    }

    @Test
    void devMockEnablesProvidersWithoutCredentials() {
        oauthProperties.setDevMockEnabled(true);
        for (OAuthProvider provider : OAuthProvider.values()) {
            disableRealProvider(provider);
        }

        var response = oauthService.listProviders();

        assertThat(response.providers()).hasSize(7);
        assertThat(response.providers()).allMatch(OAuthProviderInfo::enabled);

        URI uri = oauthService.buildAuthorizationRedirect(OAuthProvider.GOOGLE, "http://localhost:4200/");
        assertThat(uri.toString()).contains("/oauth/connect/google/callback");
        assertThat(uri.toString()).contains("dev-mock:google");
    }

    private void disableRealProvider(OAuthProvider provider) {
        switch (provider) {
            case GOOGLE -> {
                oauthProperties.getGoogle().setEnabled(false);
                oauthProperties.getGoogle().setClientId("");
                oauthProperties.getGoogle().setClientSecret("");
            }
            case META -> {
                oauthProperties.getMeta().setEnabled(false);
                oauthProperties.getMeta().setClientId("");
                oauthProperties.getMeta().setClientSecret("");
            }
            case APPLE -> {
                oauthProperties.getApple().setEnabled(false);
                oauthProperties.getApple().setClientId("");
                oauthProperties.getApple().setTeamId("");
                oauthProperties.getApple().setKeyId("");
                oauthProperties.getApple().setPrivateKey("");
            }
            case MICROSOFT -> {
                oauthProperties.getMicrosoft().setEnabled(false);
                oauthProperties.getMicrosoft().setClientId("");
                oauthProperties.getMicrosoft().setClientSecret("");
            }
            case GITHUB -> {
                oauthProperties.getGithub().setEnabled(false);
                oauthProperties.getGithub().setClientId("");
                oauthProperties.getGithub().setClientSecret("");
            }
            case X -> {
                oauthProperties.getX().setEnabled(false);
                oauthProperties.getX().setClientId("");
                oauthProperties.getX().setClientSecret("");
            }
            case DISCORD -> {
                oauthProperties.getDiscord().setEnabled(false);
                oauthProperties.getDiscord().setClientId("");
                oauthProperties.getDiscord().setClientSecret("");
            }
        }
    }
}
