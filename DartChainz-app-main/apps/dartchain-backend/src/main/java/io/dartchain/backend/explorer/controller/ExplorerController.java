package io.dartchain.backend.explorer.controller;

import io.dartchain.backend.explorer.dto.ExplorerSearchResponse;
import io.dartchain.backend.explorer.service.ExplorerSearchService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/explorer")
public class ExplorerController {

    private final ExplorerSearchService explorerSearchService;

    public ExplorerController(ExplorerSearchService explorerSearchService) {
        this.explorerSearchService = explorerSearchService;
    }

    @GetMapping("/search")
    public ExplorerSearchResponse search(@RequestParam("q") String query) {
        return explorerSearchService.search(query);
    }
}
