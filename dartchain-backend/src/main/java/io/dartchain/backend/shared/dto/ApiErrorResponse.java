package io.dartchain.backend.shared.dto;

import java.time.Instant;

public class ApiErrorResponse {

    private final String error;
    private final String message;
    private final int status;
    private final Instant timestamp;
    private final String requestId;

    public ApiErrorResponse(String error, String message, int status, Instant timestamp) {
        this(error, message, status, timestamp, null);
    }

    public ApiErrorResponse(
            String error,
            String message,
            int status,
            Instant timestamp,
            String requestId
    ) {
        this.error = error;
        this.message = message;
        this.status = status;
        this.timestamp = timestamp;
        this.requestId = requestId;
    }

    public String getError() {
        return error;
    }

    public String getMessage() {
        return message;
    }

    public int getStatus() {
        return status;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public String getRequestId() {
        return requestId;
    }
}