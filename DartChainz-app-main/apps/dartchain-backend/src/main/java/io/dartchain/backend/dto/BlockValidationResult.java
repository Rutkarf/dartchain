package io.dartchain.backend.dto;

public class BlockValidationResult {

    private final boolean valid;
    private final String message;

    public BlockValidationResult(boolean valid, String message) {
        this.valid = valid;
        this.message = message;
    }

    public boolean isValid() {
        return valid;
    }

    public String getMessage() {
        return message;
    }
}