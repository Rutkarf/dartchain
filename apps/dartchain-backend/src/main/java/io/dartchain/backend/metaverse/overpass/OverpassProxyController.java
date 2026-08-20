package io.dartchain.backend.metaverse.overpass;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/metaverse/overpass")
public class OverpassProxyController {

    private final OverpassProxyService overpassProxyService;

    public OverpassProxyController(OverpassProxyService overpassProxyService) {
        this.overpassProxyService = overpassProxyService;
    }

    @PostMapping(consumes = MediaType.TEXT_PLAIN_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> query(@RequestBody String query) {
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(overpassProxyService.forward(query));
    }
}
