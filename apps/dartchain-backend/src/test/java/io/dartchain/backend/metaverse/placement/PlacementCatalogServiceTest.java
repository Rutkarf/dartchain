package io.dartchain.backend.metaverse.placement;

import io.dartchain.backend.metaverse.infrastructure.web.PlacementCatalogService;
import io.dartchain.backend.metaverse.placement.dto.MetaversePlacementDetailResponse;
import io.dartchain.backend.metaverse.placement.dto.MetaversePlacementsResponse;
import io.dartchain.backend.metaverse.placement.dto.PlacementInquiryRequestDto;
import io.dartchain.backend.metaverse.placement.dto.PlacementInquiryResponseDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PlacementCatalogServiceTest {

    private static final Instant FIXED_NOW = Instant.parse("2026-08-22T12:00:00Z");

    private PlacementCatalogService service;

    @BeforeEach
    void setUp() {
        service = new PlacementCatalogService(Clock.fixed(FIXED_NOW, ZoneOffset.UTC));
    }

    @Test
    void list_returnsInventoryInsideDefaultMarseilleBbox() {
        MetaversePlacementsResponse response = service.list(43.28, 43.3095, 5.354, 5.394);

        assertThat(response.type()).isEqualTo("METAVERSE_PLACEMENTS");
        assertThat(response.source()).isEqualTo("authorized-api");
        assertThat(response.serverTime()).isEqualTo("2026-08-22T12:00:00Z");
        assertThat(response.placements()).hasSize(4);
        assertThat(response.buildings()).hasSize(4);
        assertThat(response.placements())
                .extracting(item -> item.id())
                .containsExactly(
                        "dev-placement-01",
                        "dev-placement-02",
                        "dev-placement-03",
                        "dev-placement-04"
                );
        assertThat(response.placements().getFirst().anchorWorld().coordinateSystemVersion())
                .isEqualTo("marseille-local-v1");
    }

    @Test
    void list_filtersByBoundingBox() {
        MetaversePlacementsResponse response = service.list(43.2947, 43.2950, 5.3747, 5.3750);

        assertThat(response.placements())
                .extracting(item -> item.id())
                .containsExactly("dev-placement-02");
        assertThat(response.buildings())
                .extracting(item -> item.id())
                .containsExactly("mirror-adjacent-building-02");
        assertThat(response.merchants())
                .extracting(item -> item.id())
                .containsExactly("dev-merchant-vitrine");
        assertThat(response.campaigns())
                .extracting(item -> item.id())
                .containsExactly("dev-campaign-demo");
        assertThat(response.offers())
                .extracting(item -> item.id())
                .containsExactly("dev-offer-02");
    }

    @Test
    void list_rejectsInvertedBoundingBox() {
        assertThatThrownBy(() -> service.list(43.31, 43.28, 5.354, 5.394))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode().value())
                .isEqualTo(400);
    }

    @Test
    void getById_returnsLinkedBuildingAndOffer() {
        MetaversePlacementDetailResponse detail = service.getById("dev-placement-02");

        assertThat(detail.type()).isEqualTo("METAVERSE_PLACEMENT_DETAIL");
        assertThat(detail.placement().id()).isEqualTo("dev-placement-02");
        assertThat(detail.building().id()).isEqualTo("mirror-adjacent-building-02");
        assertThat(detail.merchant().id()).isEqualTo("dev-merchant-vitrine");
        assertThat(detail.campaign().id()).isEqualTo("dev-campaign-demo");
        assertThat(detail.offer().commercialModel()).isEqualTo("quote");
    }

    @Test
    void getById_unknownPlacement_isNotFound() {
        assertThatThrownBy(() -> service.getById("missing"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode().value())
                .isEqualTo(404);
    }

    @Test
    void submitInquiry_receivesAvailableInquiryPlacement() {
        PlacementInquiryResponseDto response = service.submitInquiry(
                "dev-placement-01",
                new PlacementInquiryRequestDto("dev-placement-01", "hello", "a@example.com", "fr", null)
        );

        assertThat(response.status()).isEqualTo("received");
        assertThat(response.inquiryId()).startsWith("inq-");
    }

    @Test
    void submitInquiry_rejectsPausedPlacement() {
        PlacementInquiryResponseDto response = service.submitInquiry("dev-placement-04", null);

        assertThat(response.status()).isEqualTo("rejected");
        assertThat(response.message()).contains("indisponible");
    }

    @Test
    void submitInquiry_unknownPlacement_isNotFound() {
        assertThatThrownBy(() -> service.submitInquiry("missing", null))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode().value())
                .isEqualTo(404);
    }

    @Test
    void submitInquiry_rejectsMismatchedPathAndBodyIds() {
        assertThatThrownBy(() -> service.submitInquiry(
                "dev-placement-01",
                new PlacementInquiryRequestDto("dev-placement-02", null, null, null, null)
        ))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode().value())
                .isEqualTo(400);
    }
}
