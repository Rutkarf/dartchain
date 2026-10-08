package io.dartchain.backend.auth.dto;

public record TotpSetupResponse(String secret, String otpauthUrl) {
}
