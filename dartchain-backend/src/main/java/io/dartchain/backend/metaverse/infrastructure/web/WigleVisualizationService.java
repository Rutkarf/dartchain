package io.dartchain.backend.metaverse.infrastructure.web;

import io.dartchain.backend.config.WigleProperties;
import io.dartchain.backend.metaverse.wigle.dto.WigleAreaAggregateDto;
import io.dartchain.backend.metaverse.wigle.dto.WigleBuildingAggregateDto;
import io.dartchain.backend.metaverse.wigle.dto.WigleBuildingsResponse;
import io.dartchain.backend.metaverse.wigle.dto.WigleAreasResponse;
import io.dartchain.backend.metaverse.wigle.dto.WigleObservationDto;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Agrégation et anonymisation de métadonnées réseau autorisées pour le métavers.
 * Mode mock par défaut — aucune clé API n'est exposée au frontend.
 */
@Service
public class WigleVisualizationService {

    private static final String RESPONSE_TYPE = "WIGLE_VISUALIZATION";
    private static final double VIEUX_PORT_LAT = 43.2945995;
    private static final double VIEUX_PORT_LON = 5.3741227;

    private record BuildingAnchor(String id, double latitude, double longitude) {
    }

    private record CachedPayload(long fetchedAt, WigleBuildingsResponse buildings, WigleAreasResponse areas) {
    }

    private static final List<BuildingAnchor> KNOWN_BUILDINGS = List.of(
            new BuildingAnchor("mirror-adjacent-building-01", 43.2946667, 5.3748399),
            new BuildingAnchor("mirror-adjacent-building-02", 43.2948349, 5.3747715),
            new BuildingAnchor("harbor-west-building", 43.2938343, 5.3737687),
            new BuildingAnchor("harbor-east-building", 43.2946888, 5.3755217),
            new BuildingAnchor("vieux-port-arcades-west", 43.295052, 5.373628),
            new BuildingAnchor("vieux-port-shops-east", 43.2948349, 5.3747715)
    );

    private final WigleProperties properties;
    private final Map<String, CachedPayload> cache = new ConcurrentHashMap<>();

    public WigleVisualizationService(WigleProperties properties) {
        this.properties = properties;
    }

    public WigleBuildingsResponse getBuildingAggregates(
            double south,
            double north,
            double west,
            double east
    ) {
        String cacheKey = bboxKey(south, north, west, east) + ":buildings";
        CachedPayload cached = cache.get(cacheKey);
        if (cached != null && !isExpired(cached.fetchedAt())) {
            return cached.buildings();
        }

        List<WigleObservationDto> observations = loadAuthorizedObservations(south, north, west, east);
        WigleBuildingsResponse response = aggregateByBuilding(observations);
        WigleAreasResponse areas = aggregateByArea(observations, response.unmatchedObservations());

        cache.put(cacheKey, new CachedPayload(System.currentTimeMillis(), response, areas));
        return response;
    }

    public WigleAreasResponse getAreaAggregates(
            double south,
            double north,
            double west,
            double east
    ) {
        String cacheKey = bboxKey(south, north, west, east) + ":areas";
        CachedPayload cached = cache.get(cacheKey);
        if (cached != null && !isExpired(cached.fetchedAt())) {
            return cached.areas();
        }

        getBuildingAggregates(south, north, west, east);
        CachedPayload refreshed = cache.get(cacheKey.replace(":areas", ":buildings"));
        if (refreshed != null) {
            cache.put(cacheKey, refreshed);
            return refreshed.areas();
        }

        List<WigleObservationDto> observations = loadAuthorizedObservations(south, north, west, east);
        WigleBuildingsResponse buildings = aggregateByBuilding(observations);
        WigleAreasResponse areas = aggregateByArea(observations, buildings.unmatchedObservations());
        cache.put(cacheKey, new CachedPayload(System.currentTimeMillis(), buildings, areas));
        return areas;
    }

    private List<WigleObservationDto> loadAuthorizedObservations(
            double south,
            double north,
            double west,
            double east
    ) {
        if (properties.mockEnabled() || properties.apiToken() == null || properties.apiToken().isBlank()) {
            return generateMockObservations(south, north, west, east);
        }
        // Upstream WiGLE API integration point — credentials remain server-side only.
        return generateMockObservations(south, north, west, east);
    }

    private List<WigleObservationDto> generateMockObservations(
            double south,
            double north,
            double west,
            double east
    ) {
        List<WigleObservationDto> observations = new ArrayList<>();
        int seed = (int) Math.round((south + north + west + east) * 10_000);
        String[] networkTypes = {"wifi", "bluetooth", "wifi", "wifi", "unknown"};
        int[] channels = {1, 6, 11, 36, 44, 149};

        for (int i = 0; i < 48; i++) {
            double lat = lerp(south, north, pseudoRandom(seed + i * 17));
            double lon = lerp(west, east, pseudoRandom(seed + i * 31 + 7));
            lat = roundCoordinate(lat);
            lon = roundCoordinate(lon);

            if (lat < south || lat > north || lon < west || lon > east) {
                continue;
            }

            String rawId = "mock-obs-" + i;
            observations.add(new WigleObservationDto(
                    rawId,
                    anonymizeId(rawId),
                    lat,
                    lon,
                    12.0 + pseudoRandom(seed + i) * 8,
                    -40 - (int) (pseudoRandom(seed + i * 3) * 35),
                    channels[i % channels.length],
                    networkTypes[i % networkTypes.length].equals("bluetooth") ? 2.4 : 2.4 + (i % 3) * 2.05,
                    networkTypes[i % networkTypes.length],
                    Instant.now().minus(i * 3L, ChronoUnit.HOURS).truncatedTo(ChronoUnit.HOURS).toString(),
                    confidenceFromSignal(-40 - (int) (pseudoRandom(seed + i * 3) * 35)),
                    "mock"
            ));
        }

        for (BuildingAnchor anchor : KNOWN_BUILDINGS) {
            if (anchor.latitude() < south || anchor.latitude() > north
                    || anchor.longitude() < west || anchor.longitude() > east) {
                continue;
            }
            for (int j = 0; j < 3; j++) {
                double lat = roundCoordinate(anchor.latitude() + (pseudoRandom(seed + j) - 0.5) * 0.0003);
                double lon = roundCoordinate(anchor.longitude() + (pseudoRandom(seed + j + 5) - 0.5) * 0.0003);
                String rawId = anchor.id() + "-mock-" + j;
                observations.add(new WigleObservationDto(
                        rawId,
                        anonymizeId(rawId),
                        lat,
                        lon,
                        15.0,
                        -55 - j * 4,
                        channels[(j + 2) % channels.length],
                        2.4,
                        "wifi",
                        Instant.now().minus(j + 1L, ChronoUnit.DAYS).truncatedTo(ChronoUnit.HOURS).toString(),
                        "high",
                        "mock"
                ));
            }
        }

        return observations;
    }

    private WigleBuildingsResponse aggregateByBuilding(List<WigleObservationDto> observations) {
        Map<String, List<WigleObservationDto>> byBuilding = new LinkedHashMap<>();
        int unmatched = 0;

        for (WigleObservationDto obs : observations) {
            BuildingAnchor nearest = findNearestBuilding(obs.latitudeApprox(), obs.longitudeApprox());
            if (nearest == null || distanceDegrees(obs.latitudeApprox(), obs.longitudeApprox(),
                    nearest.latitude(), nearest.longitude()) > 0.0012) {
                unmatched++;
                continue;
            }
            byBuilding.computeIfAbsent(nearest.id(), key -> new ArrayList<>()).add(obs);
        }

        List<WigleBuildingAggregateDto> aggregates = new ArrayList<>();
        for (Map.Entry<String, List<WigleObservationDto>> entry : byBuilding.entrySet()) {
            aggregates.add(buildAggregate(entry.getKey(), entry.getValue()));
        }

        return new WigleBuildingsResponse(
                RESPONSE_TYPE,
                "mock",
                aggregates,
                observations.size(),
                unmatched
        );
    }

    private WigleAreasResponse aggregateByArea(List<WigleObservationDto> observations, int unmatchedHint) {
        Map<String, List<WigleObservationDto>> cells = new LinkedHashMap<>();
        double cellSize = properties.coordinatePrecisionDegrees() * 4;

        for (WigleObservationDto obs : observations) {
            BuildingAnchor nearest = findNearestBuilding(obs.latitudeApprox(), obs.longitudeApprox());
            if (nearest != null && distanceDegrees(obs.latitudeApprox(), obs.longitudeApprox(),
                    nearest.latitude(), nearest.longitude()) <= 0.0012) {
                continue;
            }
            double cellLat = Math.floor(obs.latitudeApprox() / cellSize) * cellSize;
            double cellLon = Math.floor(obs.longitudeApprox() / cellSize) * cellSize;
            String areaId = "area-" + roundCoordinate(cellLat) + "-" + roundCoordinate(cellLon);
            cells.computeIfAbsent(areaId, key -> new ArrayList<>()).add(obs);
        }

        List<WigleAreaAggregateDto> areas = new ArrayList<>();
        for (Map.Entry<String, List<WigleObservationDto>> entry : cells.entrySet()) {
            List<WigleObservationDto> cellObs = entry.getValue();
            WigleObservationDto first = cellObs.getFirst();
            areas.add(new WigleAreaAggregateDto(
                    entry.getKey(),
                    first.latitudeApprox(),
                    first.longitudeApprox(),
                    cellObs.size(),
                    averageSignal(cellObs),
                    countNetworkTypes(cellObs),
                    aggregateConfidence(cellObs),
                    "mock"
            ));
        }

        if (unmatchedHint > 0 && areas.isEmpty() && !observations.isEmpty()) {
            WigleObservationDto fallback = observations.getFirst();
            areas.add(new WigleAreaAggregateDto(
                    "area-unmatched",
                    fallback.latitudeApprox(),
                    fallback.longitudeApprox(),
                    Math.max(1, unmatchedHint),
                    averageSignal(observations),
                    countNetworkTypes(observations),
                    "low",
                    "mock"
            ));
        }

        return new WigleAreasResponse(RESPONSE_TYPE, "mock", areas);
    }

    private WigleBuildingAggregateDto buildAggregate(String buildingId, List<WigleObservationDto> observations) {
        return new WigleBuildingAggregateDto(
                buildingId,
                observations.size(),
                averageSignal(observations),
                observations.stream().map(WigleObservationDto::signalLevel).filter(v -> v != null)
                        .mapToInt(Integer::intValue).min().stream().mapToObj(v -> (double) v).findFirst().orElse(-90.0),
                observations.stream().map(WigleObservationDto::signalLevel).filter(v -> v != null)
                        .mapToInt(Integer::intValue).max().stream().mapToObj(v -> (double) v).findFirst().orElse(-40.0),
                countNetworkTypes(observations),
                countChannels(observations),
                observations.stream().map(WigleObservationDto::observedAt).filter(v -> v != null && !v.isBlank())
                        .max(String::compareTo).orElse(null),
                aggregateConfidence(observations)
        );
    }

    private BuildingAnchor findNearestBuilding(double lat, double lon) {
        BuildingAnchor best = null;
        double bestDist = Double.MAX_VALUE;
        for (BuildingAnchor anchor : KNOWN_BUILDINGS) {
            double dist = distanceDegrees(lat, lon, anchor.latitude(), anchor.longitude());
            if (dist < bestDist) {
                bestDist = dist;
                best = anchor;
            }
        }
        return best;
    }

    private static double distanceDegrees(double lat1, double lon1, double lat2, double lon2) {
        double dLat = lat1 - lat2;
        double dLon = lon1 - lon2;
        return Math.sqrt(dLat * dLat + dLon * dLon);
    }

    private static Double averageSignal(List<WigleObservationDto> observations) {
        var stats = observations.stream()
                .map(WigleObservationDto::signalLevel)
                .filter(v -> v != null)
                .mapToInt(Integer::intValue)
                .summaryStatistics();
        return stats.getCount() > 0 ? stats.getAverage() : null;
    }

    private static Map<String, Integer> countNetworkTypes(List<WigleObservationDto> observations) {
        Map<String, Integer> counts = new HashMap<>();
        for (WigleObservationDto obs : observations) {
            String type = obs.networkType() == null ? "unknown" : obs.networkType();
            counts.merge(type, 1, Integer::sum);
        }
        return counts;
    }

    private static Map<String, Integer> countChannels(List<WigleObservationDto> observations) {
        Map<String, Integer> counts = new HashMap<>();
        for (WigleObservationDto obs : observations) {
            if (obs.channel() == null) continue;
            counts.merge(String.valueOf(obs.channel()), 1, Integer::sum);
        }
        return counts;
    }

    private static String aggregateConfidence(List<WigleObservationDto> observations) {
        int high = 0;
        int medium = 0;
        for (WigleObservationDto obs : observations) {
            if ("high".equals(obs.confidence())) high++;
            else if ("medium".equals(obs.confidence())) medium++;
        }
        if (high >= observations.size() / 2) return "high";
        if (high + medium >= observations.size() / 2) return "medium";
        return "low";
    }

    private double roundCoordinate(double value) {
        double step = properties.coordinatePrecisionDegrees();
        return Math.round(value / step) * step;
    }

    private String anonymizeId(String rawId) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawId.getBytes(StandardCharsets.UTF_8));
            return "wig-" + HexFormat.of().formatHex(hash, 0, 6);
        } catch (NoSuchAlgorithmException e) {
            return "wig-" + rawId.hashCode();
        }
    }

    private static String confidenceFromSignal(int signalLevel) {
        if (signalLevel >= -55) return "high";
        if (signalLevel >= -70) return "medium";
        return "low";
    }

    private static double lerp(double a, double b, double t) {
        return a + (b - a) * t;
    }

    private static double pseudoRandom(int seed) {
        int x = imul(seed ^ 0x9e3779b9, 0x85ebca6b);
        x = imul(x ^ (x >>> 13), 0xc2b2ae35);
        return ((x ^ (x >>> 16)) >>> 0) / 4294967296.0;
    }

    private static int imul(int a, int b) {
        return (int) ((long) a * (long) b);
    }

    private boolean isExpired(long fetchedAt) {
        return System.currentTimeMillis() - fetchedAt > properties.cacheTtlMs();
    }

    private static String bboxKey(double south, double north, double west, double east) {
        return String.format(Locale.ROOT, "%.4f-%.4f-%.4f-%.4f", south, north, west, east);
    }
}
