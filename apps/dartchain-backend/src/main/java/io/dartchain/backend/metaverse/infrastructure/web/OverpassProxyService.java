package io.dartchain.backend.metaverse.infrastructure.web;

import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;
import static org.springframework.http.HttpStatus.BAD_REQUEST;

/**
 * Proxy serveur Overpass — le navigateur ne parle jamais aux hosts Overpass (CORS).
 */
@Service
public class OverpassProxyService {

    public record OverpassEndpoint(String url, String userAgent) {}

    /**
     * Ordre : miroir FR (réactif) → private.coffee (ex-kumi) → FOSSGIS principal / lz4.
     * Le miroir FR whitelist « overpass-turbo » ; les autres acceptent notre UA applicatif.
     */
    public static final List<OverpassEndpoint> ENDPOINTS = List.of(
            new OverpassEndpoint(
                    "https://overpass.openstreetmap.fr/api/interpreter",
                    "overpass-turbo"
            ),
            new OverpassEndpoint(
                    "https://overpass.private.coffee/api/interpreter",
                    "DartChain-MetaverseBB/1.0"
            ),
            new OverpassEndpoint(
                    "https://overpass-api.de/api/interpreter",
                    "DartChain-MetaverseBB/1.0"
            ),
            new OverpassEndpoint(
                    "https://lz4.overpass-api.de/api/interpreter",
                    "DartChain-MetaverseBB/1.0"
            )
    );

    private static final int MAX_QUERY_CHARS = 8_192;
    private static final int CONNECT_TIMEOUT_MS = 8_000;
    private static final int READ_TIMEOUT_MS = 60_000;

    private final RestClient restClient;

    public OverpassProxyService() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(CONNECT_TIMEOUT_MS);
        requestFactory.setReadTimeout(READ_TIMEOUT_MS);
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    public String forward(String query) {
        String normalized = validateBuildingQuery(query);
        RestClientException last = null;
        for (OverpassEndpoint endpoint : ENDPOINTS) {
            try {
                String body = restClient.post()
                        .uri(endpoint.url())
                        .header("User-Agent", endpoint.userAgent())
                        .contentType(MediaType.TEXT_PLAIN)
                        .accept(MediaType.APPLICATION_JSON)
                        .body(normalized)
                        .retrieve()
                        .body(String.class);
                if (body != null && !body.isBlank() && looksLikeOverpassJson(body)) {
                    return body;
                }
            } catch (RestClientException exception) {
                last = exception;
            }
        }
        throw new ResponseStatusException(
                BAD_GATEWAY,
                "Overpass unreachable",
                last
        );
    }

    public String validateBuildingQuery(String query) {
        if (query == null || query.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "Empty Overpass query");
        }
        if (query.length() > MAX_QUERY_CHARS) {
            throw new ResponseStatusException(BAD_REQUEST, "Overpass query too large");
        }
        String compact = query.toLowerCase(Locale.ROOT).replace("'", "\"");
        if (!compact.contains("[out:json]") || !compact.contains("building")) {
            throw new ResponseStatusException(BAD_REQUEST, "Only OSM building JSON queries are allowed");
        }
        return query.trim();
    }

    /** Évite de traiter une page HTML d'erreur 200 comme un succès Overpass. */
    public static boolean looksLikeOverpassJson(String body) {
        String trimmed = body.stripLeading();
        return trimmed.startsWith("{") && trimmed.contains("\"elements\"");
    }
}
