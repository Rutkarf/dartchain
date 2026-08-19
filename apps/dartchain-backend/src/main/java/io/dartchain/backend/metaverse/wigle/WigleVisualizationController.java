package io.dartchain.backend.metaverse.wigle;

import io.dartchain.backend.metaverse.wigle.dto.WigleAreasResponse;
import io.dartchain.backend.metaverse.wigle.dto.WigleBuildingsResponse;
import io.dartchain.backend.metaverse.wigle.dto.WiglePointsResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/metaverse/wigle")
public class WigleVisualizationController {

    private static final double DEFAULT_SOUTH = 43.2937;
    private static final double DEFAULT_NORTH = 43.2999;
    private static final double DEFAULT_WEST = 5.3642;
    private static final double DEFAULT_EAST = 5.3778;
    private static final double DEFAULT_CENTER_LAT = 43.2965;
    private static final double DEFAULT_CENTER_LON = 5.3698;

    private final WigleVisualizationService visualizationService;
    private final WiglePointsService pointsService;

    public WigleVisualizationController(
            WigleVisualizationService visualizationService,
            WiglePointsService pointsService
    ) {
        this.visualizationService = visualizationService;
        this.pointsService = pointsService;
    }

    @GetMapping("/buildings")
    public WigleBuildingsResponse buildings(
            @RequestParam(defaultValue = "" + DEFAULT_SOUTH) double south,
            @RequestParam(defaultValue = "" + DEFAULT_NORTH) double north,
            @RequestParam(defaultValue = "" + DEFAULT_WEST) double west,
            @RequestParam(defaultValue = "" + DEFAULT_EAST) double east
    ) {
        return visualizationService.getBuildingAggregates(south, north, west, east);
    }

    @GetMapping("/areas")
    public WigleAreasResponse areas(
            @RequestParam(defaultValue = "" + DEFAULT_SOUTH) double south,
            @RequestParam(defaultValue = "" + DEFAULT_NORTH) double north,
            @RequestParam(defaultValue = "" + DEFAULT_WEST) double west,
            @RequestParam(defaultValue = "" + DEFAULT_EAST) double east
    ) {
        return visualizationService.getAreaAggregates(south, north, west, east);
    }

    @GetMapping("/points")
    public WiglePointsResponse points(
            @RequestParam(defaultValue = "" + DEFAULT_CENTER_LAT) double lat,
            @RequestParam(defaultValue = "" + DEFAULT_CENTER_LON) double lon,
            @RequestParam(defaultValue = "500") double radiusMeters,
            @RequestParam(defaultValue = "100") int limit
    ) {
        return pointsService.getPoints(lat, lon, radiusMeters, limit);
    }
}
