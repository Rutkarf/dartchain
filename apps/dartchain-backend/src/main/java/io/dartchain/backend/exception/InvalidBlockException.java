package io.dartchain.backend.exception;

public class InvalidBlockException extends RuntimeException {

    public InvalidBlockException(String message) {
        super(message);
    }
}