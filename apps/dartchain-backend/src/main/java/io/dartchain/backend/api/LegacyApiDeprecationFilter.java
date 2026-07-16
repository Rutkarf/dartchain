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
 * Phase AA — signale les alias legacy via en-têtes {@code Deprecation} et {@code Link}.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class LegacyApiDeprecationFilter extends OncePerRequestFilter {

    private static final Map<String, String> SUCCESSOR_BY_LEGACY_PATH = Map.of(
            ApiRoutes.BLOCKS, ApiRoutes.BLOCKCHAIN_BLOCKS_V1
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
        String successor = SUCCESSOR_BY_LEGACY_PATH.get(path);
        if (successor == null) {
            return;
        }

        response.setHeader("Deprecation", "true");
        response.setHeader("Sunset", "2027-01-01");
        response.setHeader("Link", "<" + successor + ">; rel=\"successor-version\"");
    }

    private String resolvePath(HttpServletRequest request) {
        if (ServletRequestPathUtils.hasParsedRequestPath(request)) {
            return ServletRequestPathUtils.getParsedRequestPath(request).value();
        }
        return request.getRequestURI();
    }
}
