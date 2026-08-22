package io.dartchain.backend.metaverse.overpass;

import io.dartchain.backend.metaverse.infrastructure.web.OverpassProxyService;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OverpassProxyServiceTest {

    private final OverpassProxyService service = new OverpassProxyService();

    @Test
    void rejectsEmptyQuery() {
        assertThrows(ResponseStatusException.class, () -> service.validateBuildingQuery(" "));
    }

    @Test
    void acceptsBuildingJsonQuery() {
        String query = "[out:json][timeout:15];way[\"building\"](43.29,5.36,43.30,5.38);out;";
        assertEquals(query, service.validateBuildingQuery(query));
    }

    @Test
    void rejectsNonBuildingQuery() {
        assertThrows(
                ResponseStatusException.class,
                () -> service.validateBuildingQuery("[out:json];node(1);out;")
        );
    }

    @Test
    void prefersFrMirrorThenPrivateCoffee() {
        assertTrue(OverpassProxyService.ENDPOINTS.get(0).url().contains("openstreetmap.fr"));
        assertTrue(OverpassProxyService.ENDPOINTS.get(1).url().contains("private.coffee"));
    }

    @Test
    void looksLikeOverpassJson_requiresElements() {
        assertTrue(OverpassProxyService.looksLikeOverpassJson("{\"elements\":[]}"));
        assertFalse(OverpassProxyService.looksLikeOverpassJson("This service is only available"));
        assertFalse(OverpassProxyService.looksLikeOverpassJson("<html>502</html>"));
    }
}
