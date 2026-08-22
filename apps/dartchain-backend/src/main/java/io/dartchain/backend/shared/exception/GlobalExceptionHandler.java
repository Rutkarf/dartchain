package io.dartchain.backend.shared.exception;

import io.dartchain.backend.api.ApiProblemDetails;
import io.dartchain.backend.api.ApiV1Support;
import io.dartchain.backend.auth.application.AuthException;
import io.dartchain.backend.shared.dto.ApiErrorResponse;
import io.dartchain.backend.ops.ApplicationMetricsCollector;
import io.dartchain.backend.ops.RequestCorrelationFilter;
import io.dartchain.backend.quests.application.QuestException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.Instant;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private final ApplicationMetricsCollector metricsCollector;
    private final HttpServletRequest request;

    public GlobalExceptionHandler(
            @Autowired(required = false) ApplicationMetricsCollector metricsCollector,
            HttpServletRequest request
    ) {
        this.metricsCollector = metricsCollector;
        this.request = request;
    }

    @ExceptionHandler(AuthException.class)
    public ResponseEntity<?> handleAuth(AuthException exception) {
        HttpStatus status = HttpStatus.resolve(exception.getStatusCode());
        if (status == null) {
            status = HttpStatus.UNAUTHORIZED;
        }

        return buildErrorResponse(status, status.getReasonPhrase(), exception.getMessage());
    }

    @ExceptionHandler(TransactionValidationException.class)
    public ResponseEntity<?> handleTransactionValidation(TransactionValidationException exception) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Bad Request", exception.getMessage());
    }

    @ExceptionHandler(InvalidBlockException.class)
    public ResponseEntity<?> handleInvalidBlock(InvalidBlockException exception) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Bad Request", exception.getMessage());
    }

    @ExceptionHandler(FaucetException.class)
    public ResponseEntity<?> handleFaucetException(FaucetException exception) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Bad Request", exception.getMessage());
    }

    @ExceptionHandler(QuestException.class)
    public ResponseEntity<?> handleQuestException(QuestException exception) {
        HttpStatus status = HttpStatus.resolve(exception.getStatusCode());
        if (status == null) {
            status = HttpStatus.BAD_REQUEST;
        }

        return buildErrorResponse(status, status.getReasonPhrase(), exception.getMessage());
    }

    @ExceptionHandler(FeatureDisabledException.class)
    public ResponseEntity<?> handleFeatureDisabled(FeatureDisabledException exception) {
        return buildErrorResponse(HttpStatus.FORBIDDEN, "Forbidden", exception.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleIllegalArgument(IllegalArgumentException exception) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Bad Request", exception.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidation(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult()
                .getFieldErrors()
                .stream()
                .findFirst()
                .map(error -> {
                    String field = error.getField();
                    String defaultMessage = error.getDefaultMessage();
                    if (defaultMessage == null || defaultMessage.isBlank()) {
                        return "Validation failed on field: " + field;
                    }
                    return field + ": " + defaultMessage;
                })
                .orElse("Validation failed");

        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Bad Request", message);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<?> handleNotFound(NoResourceFoundException exception) {
        return buildErrorResponse(HttpStatus.NOT_FOUND, "Not Found", exception.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneric(Exception exception) {
        String message = exception.getMessage() == null || exception.getMessage().isBlank()
                ? "An unexpected error occurred"
                : exception.getMessage();

        return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error", message);
    }

    private ResponseEntity<?> buildErrorResponse(HttpStatus status, String title, String message) {
        if (status.is4xxClientError() || status.is5xxServerError()) {
            if (metricsCollector != null) {
                metricsCollector.recordHttpError(status.value(), message);
            }
        }

        String requestId = MDC.get(RequestCorrelationFilter.MDC_REQUEST_ID);
        log.warn(
                "requestId={} status={} error={} message={}",
                requestId,
                status.value(),
                title,
                message
        );

        if (ApiV1Support.isV1Request(request)) {
            return ApiProblemDetails.response(status, title, message);
        }

        return ResponseEntity.status(status).body(
                new ApiErrorResponse(
                        title,
                        message,
                        status.value(),
                        Instant.now(),
                        requestId
                )
        );
    }
}
