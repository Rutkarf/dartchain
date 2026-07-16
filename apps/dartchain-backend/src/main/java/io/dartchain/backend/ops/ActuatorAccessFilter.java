package io.dartchain.backend.ops;

import io.dartchain.backend.auth.AuthTokenResolver;
import io.dartchain.backend.auth.UserRole;
import io.dartchain.backend.config.OpsProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

public class ActuatorAccessFilter extends OncePerRequestFilter {

    static final String ACTUATOR_TOKEN_HEADER = "X-Actuator-Token";

    private static final Set<String> PUBLIC_ACTUATOR_PATHS = Set.of(
            "/actuator/health",
            "/actuator/info"
    );

    private final OpsProperties opsProperties;
    private final AuthTokenResolver authTokenResolver;

    public ActuatorAccessFilter(OpsProperties opsProperties, AuthTokenResolver authTokenResolver) {
        this.opsProperties = opsProperties;
        this.authTokenResolver = authTokenResolver;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if (!opsProperties.isRestrictActuator()) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        if (!requiresProtectedAccess(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        if (isPublicActuatorPath(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        if (!isAuthorized(request, path)) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setHeader(HttpHeaders.CONTENT_TYPE, "application/json");
            response.getWriter().write("{\"message\":\"Ops endpoint requires X-Actuator-Token\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    static boolean requiresProtectedAccess(String path) {
        return path.startsWith("/actuator")
                || path.startsWith("/api/ops")
                || path.startsWith("/api/v1/ops");
    }

    private boolean isAuthorized(HttpServletRequest request, String path) {
        if (path.startsWith("/api/v1/ops") && hasAdminBearer(request)) {
            return true;
        }

        String configuredToken = opsProperties.getActuatorToken();
        String providedToken = request.getHeader(ACTUATOR_TOKEN_HEADER);

        return configuredToken != null
                && !configuredToken.isBlank()
                && configuredToken.equals(providedToken);
    }

    private boolean hasAdminBearer(HttpServletRequest request) {
        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authorization == null || !authorization.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return false;
        }

        return authTokenResolver.resolveAccount(authorization)
                .map(account -> account.getRole() == UserRole.ADMIN)
                .orElse(false);
    }

    static boolean isPublicActuatorPath(String path) {
        if (PUBLIC_ACTUATOR_PATHS.contains(path)) {
            return true;
        }

        return path.startsWith("/actuator/health/");
    }
}
