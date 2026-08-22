package io.dartchain.backend.auth.application;

public class AuthException extends RuntimeException {

    private final int statusCode;

    public AuthException(int statusCode, String message) {
        super(message);
        this.statusCode = statusCode;
    }

    public int getStatusCode() {
        return statusCode;
    }
}
