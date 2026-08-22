package io.dartchain.backend.metaverse.infrastructure.web;

import io.dartchain.backend.metaverse.placement.dto.MerchantProfileDto;
import io.dartchain.backend.metaverse.placement.dto.MetaversePlacementDetailResponse;
import io.dartchain.backend.metaverse.placement.dto.MetaversePlacementsResponse;
import io.dartchain.backend.metaverse.placement.dto.PlacementBuildingDto;
import io.dartchain.backend.metaverse.placement.dto.PlacementCampaignDto;
import io.dartchain.backend.metaverse.placement.dto.PlacementGeoDto;
import io.dartchain.backend.metaverse.placement.dto.PlacementInquiryRequestDto;
import io.dartchain.backend.metaverse.placement.dto.PlacementInquiryResponseDto;
import io.dartchain.backend.metaverse.placement.dto.PlacementOfferDto;
import io.dartchain.backend.metaverse.placement.dto.PlacementWorldDto;
import io.dartchain.backend.metaverse.placement.dto.SponsoredPlacementDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Inventaire commercial métavers (lot MB-7).
 * Le frontend n'est pas une autorité de disponibilité, de prix ou de propriété.
 */
@Service
public class PlacementCatalogService {

    static final String COORDINATE_SYSTEM = "marseille-local-v1";
    static final double DEFAULT_SOUTH = 43.28;
    static final double DEFAULT_NORTH = 43.3095;
    static final double DEFAULT_WEST = 5.354;
    static final double DEFAULT_EAST = 5.394;

    private static final String DEV_NOTICE =
            "DEV — emplacement fictif, non contractuel, aucun partenaire réel associé.";

    private final Clock clock;
    private final List<PlacementBuildingDto> buildings;
    private final List<SponsoredPlacementDto> placements;
    private final List<MerchantProfileDto> merchants;
    private final List<PlacementCampaignDto> campaigns;
    private final List<PlacementOfferDto> offers;
    private final Map<String, PlacementBuildingDto> buildingsById;
    private final Map<String, SponsoredPlacementDto> placementsById;
    private final Map<String, MerchantProfileDto> merchantsById;
    private final Map<String, PlacementCampaignDto> campaignsById;
    private final Map<String, PlacementOfferDto> offersByPlacementId;
    private final ConcurrentHashMap<String, PlacementInquiryResponseDto> inquiries = new ConcurrentHashMap<>();

    @Autowired
    public PlacementCatalogService() {
        this(Clock.systemUTC());
    }

    public PlacementCatalogService(Clock clock) {
        this.clock = clock;
        this.buildings = seedBuildings();
        this.placements = seedPlacements();
        this.merchants = seedMerchants();
        this.campaigns = seedCampaigns();
        this.offers = seedOffers();
        this.buildingsById = indexById(buildings, PlacementBuildingDto::id);
        this.placementsById = indexById(placements, SponsoredPlacementDto::id);
        this.merchantsById = indexById(merchants, MerchantProfileDto::id);
        this.campaignsById = indexById(campaigns, PlacementCampaignDto::id);
        this.offersByPlacementId = indexById(offers, PlacementOfferDto::placementId);
    }

    public MetaversePlacementsResponse list(double south, double north, double west, double east) {
        if (south >= north || west >= east) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bounding box invalide");
        }

        List<SponsoredPlacementDto> inBounds = placements.stream()
                .filter(placement -> isInBounds(placement, south, north, west, east))
                .toList();
        Set<String> buildingIds = inBounds.stream()
                .map(SponsoredPlacementDto::buildingId)
                .collect(Collectors.toSet());
        Set<String> placementIds = inBounds.stream()
                .map(SponsoredPlacementDto::id)
                .collect(Collectors.toSet());
        Set<String> merchantIds = inBounds.stream()
                .map(SponsoredPlacementDto::merchantId)
                .filter(id -> id != null && !id.isBlank())
                .collect(Collectors.toSet());

        return new MetaversePlacementsResponse(
                MetaversePlacementsResponse.TYPE,
                MetaversePlacementsResponse.SOURCE,
                nowIso(),
                buildings.stream().filter(item -> buildingIds.contains(item.id())).toList(),
                inBounds,
                merchants.stream().filter(item -> merchantIds.contains(item.id())).toList(),
                campaigns.stream().filter(item -> placementIds.contains(item.placementId())).toList(),
                offers.stream().filter(item -> placementIds.contains(item.placementId())).toList()
        );
    }

    public MetaversePlacementDetailResponse getById(String id) {
        SponsoredPlacementDto placement = placementsById.get(id);
        if (placement == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Emplacement introuvable");
        }
        PlacementBuildingDto building = buildingsById.get(placement.buildingId());
        if (building == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Emplacement introuvable");
        }
        String merchantId = placement.merchantId();
        String campaignId = placement.campaignId();
        return new MetaversePlacementDetailResponse(
                MetaversePlacementDetailResponse.TYPE,
                MetaversePlacementsResponse.SOURCE,
                nowIso(),
                building,
                placement,
                merchantId == null ? null : merchantsById.get(merchantId),
                campaignId == null ? null : campaignsById.get(campaignId),
                offersByPlacementId.get(placement.id())
        );
    }

    public PlacementInquiryResponseDto submitInquiry(String placementId, PlacementInquiryRequestDto request) {
        if (request != null && request.placementId() != null && !request.placementId().isBlank()
                && !request.placementId().equals(placementId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identifiant d'emplacement incohérent");
        }

        SponsoredPlacementDto placement = placementsById.get(placementId);
        if (placement == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Emplacement introuvable");
        }

        PlacementBuildingDto building = buildingsById.get(placement.buildingId());
        PlacementOfferDto offer = offersByPlacementId.get(placementId);
        PlacementCampaignDto campaign = placement.campaignId() == null
                ? null
                : campaignsById.get(placement.campaignId());

        if (!inquiryAllowed(building, placement, offer, campaign)) {
            return new PlacementInquiryResponseDto(
                    nextInquiryId(),
                    PlacementInquiryResponseDto.REJECTED,
                    "Demande indisponible pour cet emplacement."
            );
        }

        PlacementInquiryResponseDto response = new PlacementInquiryResponseDto(
                nextInquiryId(),
                PlacementInquiryResponseDto.RECEIVED,
                "Demande reçue. Aucune réservation n'est effectuée."
        );
        inquiries.put(response.inquiryId(), response);
        return response;
    }

    boolean inquiryAllowed(
            PlacementBuildingDto building,
            SponsoredPlacementDto placement,
            PlacementOfferDto offer,
            PlacementCampaignDto campaign
    ) {
        if (building == null || !"active".equals(building.status())) {
            return false;
        }
        if (!"available".equals(placement.status()) && !"active".equals(placement.status())) {
            return false;
        }
        if (campaign != null && "rejected".equals(campaign.status())) {
            return false;
        }
        if (offer == null) {
            return false;
        }
        String model = offer.commercialModel();
        return "inquiry".equals(model) || "quote".equals(model);
    }

    private boolean isInBounds(
            SponsoredPlacementDto placement,
            double south,
            double north,
            double west,
            double east
    ) {
        PlacementGeoDto geo = placement.anchorGeo();
        if (geo == null) {
            PlacementBuildingDto building = buildingsById.get(placement.buildingId());
            geo = building == null ? null : building.geo();
        }
        if (geo == null) {
            return false;
        }
        return geo.latitude() >= south
                && geo.latitude() <= north
                && geo.longitude() >= west
                && geo.longitude() <= east;
    }

    private String nowIso() {
        return Instant.now(clock).toString();
    }

    private static String nextInquiryId() {
        return "inq-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    private static <T> Map<String, T> indexById(List<T> items, java.util.function.Function<T, String> idFn) {
        Map<String, T> index = new HashMap<>();
        for (T item : items) {
            index.put(idFn.apply(item), item);
        }
        return Map.copyOf(index);
    }

    private static PlacementWorldDto world(double x, double y, double z) {
        return new PlacementWorldDto(x, y, z, COORDINATE_SYSTEM);
    }

    private static List<PlacementBuildingDto> seedBuildings() {
        return List.of(
                new PlacementBuildingDto(
                        "mirror-adjacent-building-01",
                        "DEV — Immeuble nord-est Ombrière",
                        new PlacementGeoDto(43.2946586, 5.3748354, null, "verified"),
                        world(57.75, 0, -6.58),
                        "ground-storefront-v1",
                        "active"
                ),
                new PlacementBuildingDto(
                        "mirror-adjacent-building-02",
                        "DEV — Immeuble nord Ombrière",
                        new PlacementGeoDto(43.2948273, 5.3747644, null, "verified"),
                        world(51.99, 0, -25.36),
                        "ground-storefront-v1",
                        "active"
                ),
                new PlacementBuildingDto(
                        "harbor-west-building",
                        "DEV — Façade ouest Vieux-Port",
                        new PlacementGeoDto(43.2938272, 5.3737823, null, "approximate"),
                        world(-27.58, 0, 85.98),
                        "ground-storefront-v1",
                        "active"
                ),
                new PlacementBuildingDto(
                        "harbor-east-building",
                        "DEV — Hôtel des Princes (inventaire fictif)",
                        new PlacementGeoDto(43.294698, 5.375526, null, "verified"),
                        world(113.7, 0, -10.96),
                        "ground-storefront-v1",
                        "active"
                )
        );
    }

    private static List<SponsoredPlacementDto> seedPlacements() {
        return List.of(
                placement(
                        "dev-placement-01",
                        "mirror-adjacent-building-01",
                        "ground-floor-storefront",
                        "standard",
                        "available",
                        null,
                        null,
                        48,
                        64.8848,
                        0.0289,
                        -2.317586875638293,
                        43.29459924059902,
                        5.374923520944316
                ),
                placement(
                        "dev-placement-02",
                        "mirror-adjacent-building-02",
                        "ground-floor-storefront",
                        "featured",
                        "active",
                        "dev-merchant-vitrine",
                        "dev-campaign-demo",
                        48,
                        57.4733,
                        -28.1043,
                        -1.1065958279695263,
                        43.29485196414417,
                        5.374832046867019
                ),
                placement(
                        "dev-placement-03",
                        "harbor-west-building",
                        "entrance-panel",
                        null,
                        "available",
                        "dev-merchant-quai",
                        null,
                        48,
                        -34.3961,
                        86.9225,
                        1.7085350191647164,
                        43.29381866565146,
                        5.373698177192401
                ),
                placement(
                        "dev-placement-04",
                        "harbor-east-building",
                        "ground-floor-storefront",
                        null,
                        "paused",
                        null,
                        null,
                        36,
                        124.7493,
                        -1.4849,
                        -2.279773257247699,
                        43.294612838780644,
                        5.375662379934555
                )
        );
    }

    private static SponsoredPlacementDto placement(
            String id,
            String buildingId,
            String placementType,
            String visibilityTier,
            String status,
            String merchantId,
            String campaignId,
            double maxDistanceMeters,
            double worldX,
            double worldZ,
            double facingRad,
            double latitude,
            double longitude
    ) {
        return new SponsoredPlacementDto(
                id,
                buildingId,
                placementType,
                world(worldX, 1.2, worldZ),
                new PlacementGeoDto(latitude, longitude, 1.2, "projected"),
                new SponsoredPlacementDto.FacingDto(facingRad),
                visibilityTier,
                status,
                merchantId,
                campaignId,
                new SponsoredPlacementDto.DisplayPolicyDto(true, maxDistanceMeters)
        );
    }

    private static List<MerchantProfileDto> seedMerchants() {
        return List.of(
                new MerchantProfileDto(
                        "dev-merchant-vitrine",
                        "DEV — Partenaire exemple",
                        "demo",
                        "unverified",
                        new MerchantProfileDto.PublicProfileDto(DEV_NOTICE, "Démonstration")
                ),
                new MerchantProfileDto(
                        "dev-merchant-quai",
                        "DEV — Quai fictif",
                        "demo",
                        "unverified",
                        new MerchantProfileDto.PublicProfileDto(DEV_NOTICE, null)
                )
        );
    }

    private static List<PlacementCampaignDto> seedCampaigns() {
        return List.of(
                new PlacementCampaignDto(
                        "dev-campaign-demo",
                        "dev-placement-02",
                        "dev-merchant-vitrine",
                        "DEV — Campagne exemple",
                        new PlacementCampaignDto.CreativeDto(
                                "Emplacement sponsorisable (démo)",
                                DEV_NOTICE
                        ),
                        new PlacementCampaignDto.CtaDto("inquiry", "Demander un devis"),
                        "2026-01-01T00:00:00.000Z",
                        "2026-12-31T23:59:59.000Z",
                        "active"
                )
        );
    }

    private static List<PlacementOfferDto> seedOffers() {
        return List.of(
                new PlacementOfferDto("dev-offer-01", "dev-placement-01", "inquiry", PlacementOfferDto.AvailabilityDto.empty()),
                new PlacementOfferDto("dev-offer-02", "dev-placement-02", "quote", PlacementOfferDto.AvailabilityDto.empty()),
                new PlacementOfferDto("dev-offer-03", "dev-placement-03", "inquiry", PlacementOfferDto.AvailabilityDto.empty()),
                new PlacementOfferDto("dev-offer-04", "dev-placement-04", "checkout", PlacementOfferDto.AvailabilityDto.empty())
        );
    }
}
