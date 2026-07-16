package io.dartchain.backend.auth.security;

import io.dartchain.backend.auth.AuthService;
import io.dartchain.backend.auth.AuthTokenResolver;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.Map;
import java.util.Optional;

@Component
public class WebSocketAuthSupport {

    public static final String AUTH_USER_ATTRIBUTE = "dartchain.authenticatedUser";

    private final AuthTokenResolver authTokenResolver;

    public WebSocketAuthSupport(AuthTokenResolver authTokenResolver) {
        this.authTokenResolver = authTokenResolver;
    }

    public Optional<AuthenticatedUser> resolveFromRequest(ServerHttpRequest request) {
        String token = extractTokenFromRequest(request);
        if (token.isBlank()) {
            return Optional.empty();
        }

        return authTokenResolver.resolveAccount(token).map(AuthenticatedUser::new);
    }

    public Optional<AuthenticatedUser> resolveFromSession(WebSocketSession session) {
        Object value = session.getAttributes().get(AUTH_USER_ATTRIBUTE);
        if (value instanceof AuthenticatedUser authenticatedUser) {
            return Optional.of(authenticatedUser);
        }
        return Optional.empty();
    }

    public void attachToAttributes(Map<String, Object> attributes, AuthenticatedUser user) {
        attributes.put(AUTH_USER_ATTRIBUTE, user);
    }

    private String extractTokenFromRequest(ServerHttpRequest request) {
        String query = request.getURI().getQuery();
        if (query != null) {
            for (String part : query.split("&")) {
                int separator = part.indexOf('=');
                if (separator <= 0) {
                    continue;
                }
                String key = part.substring(0, separator);
                if ("access_token".equals(key) || "token".equals(key)) {
                    return AuthService.extractToken(part.substring(separator + 1));
                }
            }
        }

        String authorization = request.getHeaders().getFirst("Authorization");
        return AuthService.extractToken(authorization);
    }
}
