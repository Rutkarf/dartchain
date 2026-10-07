package io.dartchain.backend.api;

import io.dartchain.backend.ops.RequestCorrelationFilter;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;

import java.time.Instant;

/**
 * Phase AA — erreurs RFC 7807 ({@code application/problem+json}) pour {@code /api/v1/*}.
 */
public final class ApiProblemDetails {

    private ApiProblemDetails() {
    }

    public static ProblemDetail of(HttpStatus status, String title, String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(title);

        String requestId = MDC.get(RequestCorrelationFilter.MDC_REQUEST_ID);
        if (requestId != null && !requestId.isBlank()) {
            problem.setProperty("requestId", requestId);
        }
        problem.setProperty("timestamp", Instant.now().toString());
        return problem;
    }

    public static ResponseEntity<ProblemDetail> response(HttpStatus status, String title, String detail) {
        return ResponseEntity.status(status)
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .body(of(status, title, detail));
    }
}
