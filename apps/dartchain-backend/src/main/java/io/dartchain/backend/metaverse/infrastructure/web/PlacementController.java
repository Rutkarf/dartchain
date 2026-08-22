package io.dartchain.backend.metaverse.infrastructure.web;

import io.dartchain.backend.metaverse.placement.dto.MetaversePlacementDetailResponse;
import io.dartchain.backend.metaverse.placement.dto.MetaversePlacementsResponse;
import io.dartchain.backend.metaverse.placement.dto.PlacementInquiryRequestDto;
import io.dartchain.backend.metaverse.placement.dto.PlacementInquiryResponseDto;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/metaverse/placements")
public class PlacementController {

    private final PlacementCatalogService catalogService;

    public PlacementController(PlacementCatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping
    public MetaversePlacementsResponse list(
            @RequestParam(defaultValue = "" + PlacementCatalogService.DEFAULT_SOUTH) double south,
            @RequestParam(defaultValue = "" + PlacementCatalogService.DEFAULT_NORTH) double north,
            @RequestParam(defaultValue = "" + PlacementCatalogService.DEFAULT_WEST) double west,
            @RequestParam(defaultValue = "" + PlacementCatalogService.DEFAULT_EAST) double east
    ) {
        return catalogService.list(south, north, west, east);
    }

    @GetMapping("/{id}")
    public MetaversePlacementDetailResponse detail(@PathVariable String id) {
        return catalogService.getById(id);
    }

    @PostMapping(value = "/{id}/inquiries", consumes = MediaType.APPLICATION_JSON_VALUE)
    public PlacementInquiryResponseDto inquire(
            @PathVariable String id,
            @RequestBody(required = false) PlacementInquiryRequestDto request
    ) {
        return catalogService.submitInquiry(id, request);
    }
}
