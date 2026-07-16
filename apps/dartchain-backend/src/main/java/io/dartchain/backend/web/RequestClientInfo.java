package io.dartchain.backend.web;

import jakarta.servlet.http.HttpServletRequest;

public final class RequestClientInfo {

    private RequestClientInfo() {
    }

    public static String clientIp(HttpServletRequest request) {
        if (request == null) {
            return null;
        }

        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }

        return request.getRemoteAddr();
    }
}
