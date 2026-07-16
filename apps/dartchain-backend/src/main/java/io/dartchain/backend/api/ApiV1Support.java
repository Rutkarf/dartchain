package io.dartchain.backend.api;

import io.dartchain.backend.config.ApiRoutes;
import jakarta.servlet.http.HttpServletRequest;

/**
 * Phase AA — détection des requêtes API versionnées.
 */
public final class ApiV1Support {

    private ApiV1Support() {
    }

    public static boolean isV1Request(HttpServletRequest request) {
        if (request == null) {
            return false;
        }
        String uri = request.getRequestURI();
        return uri != null && uri.startsWith(ApiRoutes.API_V1_PREFIX + "/");
    }
}
