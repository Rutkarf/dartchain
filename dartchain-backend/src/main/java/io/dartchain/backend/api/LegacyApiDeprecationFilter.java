package io.dartchain.backend.api;

import io.dartchain.backend.config.ApiRoutes;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ServletRequestPathUtils;

import java.io.IOException;
import java.util.Map;

/**
 * Phase AA — signale les chemins legacy via en-têtes {@code Deprecation} et {@code Link}.
 * <p>
 * Chemins encore servis : en-têtes ajoutés sur 2xx.
 * Chemins retirés (404) : en-têtes ajoutés pour guider vers le successeur v1.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class LegacyApiDeprecationFilter extends OncePerRequestFilter {

    private static final String SUNSET = "2027-01-01";

    /** Legacy GET encore routés — réponse 2xx attendue. */
    private static final Map<String, String> ACTIVE_LEGACY_PATHS = Map.of(
            ApiRoutes.BLOCKS, ApiRoutes.BLOCKCHAIN_BLOCKS_V1
    );

    /** Legacy GET retirés — 404 attendu, en-têtes de migration quand même. */
    private static final Map<String, String> REMOVED_LEGACY_PATHS = Map.of(
            ApiRoutes.LEGACY_STATS, ApiRoutes.BLOCKCHAIN_STATS_V1
    );

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        filterChain.doFilter(request, response);

        if (!"GET".equalsIgnoreCase(request.getMethod())) {
            return;
        }

        String path = resolvePath(request);
        String successor = ACTIVE_LEGACY_PATHS.get(path);
        if (successor != null && response.getStatus() >= 200 && response.getStatus() < 300) {
            applyDeprecationHeaders(response, successor);
            return;
        }

        successor = REMOVED_LEGACY_PATHS.get(path);
        if (successor != null && response.getStatus() == HttpServletResponse.SC_NOT_FOUND) {
            applyDeprecationHeaders(response, successor);
        }
    }

    private void applyDeprecationHeaders(HttpServletResponse response, String successor) {
        response.setHeader("Deprecation", "true");
        response.setHeader("Sunset", SUNSET);
        response.setHeader("Link", "<" + successor + ">; rel=\"successor-version\"");
    }

    private String resolvePath(HttpServletRequest request) {
        if (ServletRequestPathUtils.hasParsedRequestPath(request)) {
            return ServletRequestPathUtils.getParsedRequestPath(request).value();
        }
        return request.getRequestURI();
    }
}
