package io.dartchain.backend.shared.exception;

public class InvalidBlockException extends RuntimeException {

    public InvalidBlockException(String message) {
        super(message);
    }
}