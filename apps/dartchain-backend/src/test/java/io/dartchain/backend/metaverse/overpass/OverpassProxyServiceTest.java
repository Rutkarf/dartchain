package io.dartchain.backend.metaverse.overpass;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

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
}
