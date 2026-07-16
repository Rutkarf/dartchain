package io.dartchain.backend.explorer.controller;

import io.dartchain.backend.explorer.dto.ExplorerBlocksResponse;
import io.dartchain.backend.explorer.dto.ExplorerSearchResponse;
import io.dartchain.backend.explorer.service.ExplorerBlocksService;
import io.dartchain.backend.explorer.service.ExplorerSearchService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/explorer")
public class ExplorerController {

    private final ExplorerSearchService explorerSearchService;
    private final ExplorerBlocksService explorerBlocksService;

    public ExplorerController(
            ExplorerSearchService explorerSearchService,
            ExplorerBlocksService explorerBlocksService
    ) {
        this.explorerSearchService = explorerSearchService;
        this.explorerBlocksService = explorerBlocksService;
    }

    @GetMapping("/search")
    public ExplorerSearchResponse search(@RequestParam("q") String query) {
        return explorerSearchService.search(query);
    }

    @GetMapping("/blocks")
    public ExplorerBlocksResponse blocks(
            @RequestParam(value = "wallet", required = false) String wallet,
            @RequestParam(value = "from", required = false) Integer fromIndex,
            @RequestParam(value = "to", required = false) Integer toIndex,
            @RequestParam(value = "limit", required = false) Integer limit
    ) {
        return explorerBlocksService.filter(wallet, fromIndex, toIndex, limit);
    }
}
