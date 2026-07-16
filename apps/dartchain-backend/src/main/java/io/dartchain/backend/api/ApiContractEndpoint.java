package io.dartchain.backend.api;

public record ApiContractEndpoint(
        String method,
        String path,
        boolean authRequired,
        String description
) {
}
