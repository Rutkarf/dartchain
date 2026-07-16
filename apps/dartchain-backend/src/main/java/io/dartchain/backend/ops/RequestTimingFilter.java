package io.dartchain.backend.ops;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Phase AE — mesure la latence HTTP et alimente les métriques natives.
 */
public class RequestTimingFilter extends OncePerRequestFilter {

    private final ApplicationMetricsCollector metricsCollector;

    public RequestTimingFilter(ApplicationMetricsCollector metricsCollector) {
        this.metricsCollector = metricsCollector;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        long startedAt = System.nanoTime();
        try {
            filterChain.doFilter(request, response);
        } finally {
            long durationMs = (System.nanoTime() - startedAt) / 1_000_000L;
            metricsCollector.recordRequest(durationMs, response.getStatus());
        }
    }
}
