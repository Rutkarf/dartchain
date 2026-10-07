package io.dartchain.backend.metaverse.infrastructure.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.config.WigleProperties;
import io.dartchain.backend.metaverse.wigle.dto.WiglePointDto;
import io.dartchain.backend.metaverse.wigle.dto.WiglePointsResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Points WiGLE géolocalisés pour le métavers — fetch API côté serveur ou dataset Vieux-Port.
 */
@Service
public class WiglePointsService {

    private static final String RESPONSE_TYPE = "WIGLE_GEO_POINTS";
    private static final String WIGLE_API_BASE = "https://api.wigle.net/api/v2";
    /** Origine = Ombrière Vieux-Port (alignée frontend geo-reference.config). */
    private static final double VIEUX_PORT_LAT = 43.2945995;
    private static final double VIEUX_PORT_LON = 5.3741227;

    private record CachedPoints(long fetchedAt, WiglePointsResponse response) {
    }

    private final WigleProperties properties;
    private final RestClient restClient = RestClient.create();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, CachedPoints> cache = new ConcurrentHashMap<>();

    public WiglePointsService(WigleProperties properties) {
        this.properties = properties;
    }

    public WiglePointsResponse getPoints(double lat, double lon, double radiusMeters, int limit) {
        int cappedLimit = Math.min(Math.max(limit, 1), 100);
        String cacheKey = String.format(Locale.ROOT, "%.5f-%.5f-%.0f-%d", lat, lon, radiusMeters, cappedLimit);
        CachedPoints cached = cache.get(cacheKey);
        if (cached != null && System.currentTimeMillis() - cached.fetchedAt() < properties.cacheTtlMs()) {
            return cached.response();
        }

        List<WiglePointDto> points = fetchFromApi(lat, lon, radiusMeters, cappedLimit);
        String source = "authorized-api";
        if (points.isEmpty()) {
            points = vieuxPortDataset(lat, lon, radiusMeters, cappedLimit);
            source = "mock";
        }

        WiglePointsResponse response = new WiglePointsResponse(
                RESPONSE_TYPE,
                source,
                lat,
                lon,
                radiusMeters,
                points
        );
        cache.put(cacheKey, new CachedPoints(System.currentTimeMillis(), response));
        return response;
    }

    private List<WiglePointDto> fetchFromApi(double lat, double lon, double radiusMeters, int limit) {
        String apiName = properties.apiName();
        String apiToken = properties.apiToken();
        if (apiName == null || apiName.isBlank() || apiToken == null || apiToken.isBlank()) {
            return List.of();
        }

        double latDelta = radiusMeters / 111_320.0;
        double lonDelta = radiusMeters / (111_320.0 * Math.cos(Math.toRadians(lat)));
        double south = lat - latDelta;
        double north = lat + latDelta;
        double west = lon - lonDelta;
        double east = lon + lonDelta;

        String credentials = Base64.getEncoder()
                .encodeToString((apiName + ":" + apiToken).getBytes(StandardCharsets.UTF_8));

        try {
            String json = restClient.get()
                    .uri(WIGLE_API_BASE + "/network/search?onlymine=false&resultsPerPage={limit}"
                                    + "&latrange1={south}&latrange2={north}&longrange1={west}&longrange2={east}",
                            limit, south, north, west, east)
                    .header(HttpHeaders.AUTHORIZATION, "Basic " + credentials)
                    .retrieve()
                    .body(String.class);

            if (json == null || json.isBlank()) {
                return List.of();
            }
            return parseWigleSearch(json);
        } catch (RestClientException | IOException e) {
            return List.of();
        }
    }

    private List<WiglePointDto> parseWigleSearch(String json) throws IOException {
        JsonNode root = objectMapper.readTree(json);
        JsonNode results = root.path("results");
        if (!results.isArray()) {
            return List.of();
        }

        List<WiglePointDto> points = new ArrayList<>();
        for (JsonNode node : results) {
            double latitude = node.path("trilat").asDouble(Double.NaN);
            double longitude = node.path("trilong").asDouble(Double.NaN);
            if (!Double.isFinite(latitude) || !Double.isFinite(longitude)) {
                continue;
            }

            String ssid = sanitizeNetworkName(node.path("ssid").asText(""));
            String type = normalizeNetworkType(node.path("type").asText("WIFI"));
            int signal = node.path("signal").asInt(-75);
            String netid = node.path("netid").asText("");
            String id = anonymizeId(netid.isBlank() ? ssid + latitude + longitude : netid);

            points.add(new WiglePointDto(
                    id,
                    roundCoordinate(latitude),
                    roundCoordinate(longitude),
                    ssid,
                    type,
                    signal,
                    "authorized-api"
            ));
        }
        return points;
    }

    /**
     * Dataset Vieux-Port — coordonnées GPS réelles de POI publics (source: mock, positions fixes).
     */
    private List<WiglePointDto> vieuxPortDataset(double lat, double lon, double radiusMeters, int limit) {
        List<WiglePointDto> all = List.of(
                point("vp-ombriere", VIEUX_PORT_LAT, VIEUX_PORT_LON, "VieuxPort-Ombriere", "WIFI", -58),
                point("vp-metro", 43.294582, 5.374089, "Metro-Vieux-Port", "WIFI", -55),
                point("vp-arcades", 43.295052, 5.373628, "Quai-Arcades", "WIFI", -59),
                point("vp-shops-east", 43.2948349, 5.3747715, "ShopRow-WiFi", "WIFI", -57),
                point("vp-r4v3", 43.2948349, 5.3747715, "R4V3-Node", "WIFI", -54),
                point("vp-building-01", 43.2946667, 5.3748399, "NorthEast-Node", "WIFI", -61),
                point("vp-harbor-west", 43.2938343, 5.3737687, "Harbor-West", "WIFI", -64),
                point("vp-hotel-princes", 43.2946888, 5.3755217, "Hotel-Princes", "WIFI", -66),
                point("vp-quai-nord", 43.2948495, 5.3744727, "Quai-Nord-Public", "WIFI", -65),
                point("vp-quai-sud", 43.2943995, 5.3736227, "Quai-Sud-Guest", "WIFI", -68),
                point("vp-canebiere", 43.2941995, 5.3735727, "Canebiere-Free", "WIFI", -60),
                point("vp-marche", 43.2941495, 5.3746727, "Marche-Poisson", "WIFI", -63),
                point("vp-ble-01", 43.2946667, 5.3748399, "BLE-Beacon-01", "BLE", -70),
                point("vp-ble-02", 43.2948349, 5.3747715, "BLE-Beacon-02", "BLE", -72),
                point("vp-cell-01", 43.2943995, 5.3733227, "Cell-Tower-N", "CELL", -50),
                point("vp-cell-02", 43.2947995, 5.3749227, "Cell-Tower-S", "CELL", -52),
                point("vp-wifi-cafe", 43.2944995, 5.3740227, "Cafe-Port-WiFi", "WIFI", -61),
                point("vp-wifi-hotel", 43.2948995, 5.3751227, "Hotel-Port-WiFi", "WIFI", -66),
                point("vp-wifi-boat", 43.2943495, 5.3742227, "Boat-Tour-WiFi", "WIFI", -71),
                point("vp-wifi-esplanade", 43.2946495, 5.3742227, "Esplanade-Public", "WIFI", -57)
        );

        List<WiglePointDto> filtered = new ArrayList<>();
        for (WiglePointDto p : all) {
            if (distanceMeters(lat, lon, p.latitude(), p.longitude()) <= radiusMeters) {
                filtered.add(p);
            }
        }

        if (filtered.size() > limit) {
            return filtered.subList(0, limit);
        }
        return filtered;
    }

    private static WiglePointDto point(
            String id, double lat, double lon, String ssid, String type, int signal
    ) {
        return new WiglePointDto(id, lat, lon, ssid, type, signal, "mock");
    }

    private static double distanceMeters(double lat1, double lon1, double lat2, double lon2) {
        double dLat = (lat2 - lat1) * 111_320.0;
        double dLon = (lon2 - lon1) * 111_320.0 * Math.cos(Math.toRadians(lat1));
        return Math.sqrt(dLat * dLat + dLon * dLon);
    }

    private double roundCoordinate(double value) {
        double step = properties.coordinatePrecisionDegrees();
        return Math.round(value / step) * step;
    }

    private static String sanitizeNetworkName(String raw) {
        if (raw == null || raw.isBlank()) {
            return "Unknown-Network";
        }
        String trimmed = raw.trim();
        if (trimmed.length() > 32) {
            return trimmed.substring(0, 29) + "...";
        }
        return trimmed;
    }

    private static String normalizeNetworkType(String raw) {
        if (raw == null) return "WIFI";
        return switch (raw.toUpperCase(Locale.ROOT)) {
            case "WIFI", "WEP", "WPA", "WPA2", "WPA3" -> "WIFI";
            case "BLE", "BLUETOOTH" -> "BLE";
            case "GSM", "LTE", "NR", "CDMA", "CELL" -> "CELL";
            default -> "WIFI";
        };
    }

    private String anonymizeId(String rawId) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawId.getBytes(StandardCharsets.UTF_8));
            return "wpt-" + HexFormat.of().formatHex(hash, 0, 8);
        } catch (NoSuchAlgorithmException e) {
            return "wpt-" + Math.abs(rawId.hashCode());
        }
    }
}
