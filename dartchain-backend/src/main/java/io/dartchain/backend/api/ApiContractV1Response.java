package io.dartchain.backend.api;

import java.util.List;

public record ApiContractV1Response(
        String releaseVersion,
        String apiVersion,
        String errorFormat,
        String legacyPolicy,
        List<ApiContractEndpoint> endpoints
) {
}
