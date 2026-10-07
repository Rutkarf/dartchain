package io.dartchain.backend.auth.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.api.ApiProblemDetails;
import io.dartchain.backend.api.ApiV1Support;
import io.dartchain.backend.shared.dto.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;

@Component
public class SecurityProblemSupport implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final ObjectMapper objectMapper;

    public SecurityProblemSupport(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException authException
    ) throws IOException {
        writeError(request, response, HttpStatus.UNAUTHORIZED, "Unauthorized", "Authentification requise");
    }

    @Override
    public void handle(
            HttpServletRequest request,
            HttpServletResponse response,
            AccessDeniedException accessDeniedException
    ) throws IOException {
        writeError(request, response, HttpStatus.FORBIDDEN, "Forbidden", "Accès refusé");
    }

    private void writeError(
            HttpServletRequest request,
            HttpServletResponse response,
            HttpStatus status,
            String title,
            String message
    ) throws IOException {
        response.setStatus(status.value());

        if (ApiV1Support.isV1Request(request)) {
            ProblemDetail problem = ApiProblemDetails.of(status, title, message);
            response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
            objectMapper.writeValue(response.getOutputStream(), problem);
            return;
        }

        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(
                response.getOutputStream(),
                new ApiErrorResponse(
                        status.getReasonPhrase(),
                        message,
                        status.value(),
                        Instant.now()
                )
        );
    }
}
