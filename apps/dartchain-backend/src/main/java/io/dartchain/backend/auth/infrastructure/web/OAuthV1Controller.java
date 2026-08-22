package io.dartchain.backend.auth.infrastructure.web;

import io.dartchain.backend.auth.AuthService;
import io.dartchain.backend.auth.dto.AuthResponse;
import io.dartchain.backend.auth.oauth.OAuthProvider;
import io.dartchain.backend.auth.oauth.OAuthService;
import io.dartchain.backend.auth.oauth.dto.OAuthExchangeRequest;
import io.dartchain.backend.auth.oauth.dto.OAuthProvidersResponse;
import io.dartchain.backend.config.ApiRoutes;
import io.dartchain.backend.web.RequestClientInfo;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.net.URI;

@RestController
@RequestMapping(ApiRoutes.AUTH_V1_PREFIX + "/oauth")
public class OAuthV1Controller {

    private final OAuthService oauthService;
    private final AuthService authService;

    public OAuthV1Controller(OAuthService oauthService, AuthService authService) {
        this.oauthService = oauthService;
        this.authService = authService;
    }

    @GetMapping("/providers")
    public OAuthProvidersResponse providers() {
        return oauthService.listProviders();
    }

    @GetMapping("/connect/{providerId}")
    public void start(
            @PathVariable String providerId,
            @RequestParam(name = "redirect_uri", required = false) String redirectUri,
            HttpServletResponse response
    ) throws IOException {
        OAuthProvider provider = OAuthProvider.fromId(providerId);
        URI target = oauthService.buildAuthorizationRedirect(provider, redirectUri);
        response.sendRedirect(target.toString());
    }

    @GetMapping("/connect/{providerId}/callback")
    public void callback(
            @PathVariable String providerId,
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            HttpServletResponse response
    ) throws IOException {
        completeOAuthCallback(providerId, code, state, response);
    }

    @PostMapping("/connect/apple/callback")
    public void appleCallback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            HttpServletResponse response
    ) throws IOException {
        completeOAuthCallback(OAuthProvider.APPLE.id(), code, state, response);
    }

    private void completeOAuthCallback(
            String providerId,
            String code,
            String state,
            HttpServletResponse response
    ) throws IOException {
        OAuthProvider provider = OAuthProvider.fromId(providerId);
        if (code == null || code.isBlank()) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Code OAuth manquant");
            return;
        }

        URI target = oauthService.completeAuthorization(provider, code, state);
        response.sendRedirect(target.toString());
    }

    @PostMapping("/exchange")
    public AuthResponse exchange(
            @Valid @RequestBody OAuthExchangeRequest request,
            HttpServletRequest httpRequest
    ) {
        var account = oauthService.consumeExchangeCode(request.code());
        return authService.loginOAuth(account, RequestClientInfo.clientIp(httpRequest));
    }
}
