package io.dartchain.backend.metaverse.overpass;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;
import static org.springframework.http.HttpStatus.BAD_REQUEST;

/**
 * Proxy serveur Overpass — le navigateur ne parle jamais à overpass-api.de (CORS).
 */
@Service
public class OverpassProxyService {

    static final List<String> ENDPOINTS = List.of(
            "https://overpass-api.de/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter",
            "https://lz4.overpass-api.de/api/interpreter"
    );

    private static final int MAX_QUERY_CHARS = 8_192;
    private static final String USER_AGENT = "DartChain-MetaverseBB/1.0";

    private final RestClient restClient = RestClient.create();

    public String forward(String query) {
        String normalized = validateBuildingQuery(query);
        RestClientException last = null;
        for (String endpoint : ENDPOINTS) {
            try {
                String body = restClient.post()
                        .uri(endpoint)
                        .header("User-Agent", USER_AGENT)
                        .contentType(MediaType.TEXT_PLAIN)
                        .accept(MediaType.APPLICATION_JSON)
                        .body(normalized)
                        .retrieve()
                        .body(String.class);
                if (body != null && !body.isBlank()) {
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

    String validateBuildingQuery(String query) {
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
}
