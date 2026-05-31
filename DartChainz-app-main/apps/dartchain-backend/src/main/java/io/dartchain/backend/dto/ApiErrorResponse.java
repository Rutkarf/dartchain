package io.dartchain.backend.dto;

import java.time.Instant;

public class ApiErrorResponse {

    private final String error;
    private final String message;
    private final int status;
    private final Instant timestamp;

    public ApiErrorResponse(String error, String message, int status, Instant timestamp) {
        this.error = error;
        this.message = message;
        this.status = status;
        this.timestamp = timestamp;
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
}