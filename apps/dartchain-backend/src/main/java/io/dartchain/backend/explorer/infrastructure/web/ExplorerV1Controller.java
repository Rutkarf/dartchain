package io.dartchain.backend.explorer.infrastructure.web;

import io.dartchain.backend.config.ApiRoutes;
import io.dartchain.backend.explorer.dto.ExplorerBlocksResponse;
import io.dartchain.backend.explorer.dto.ExplorerSearchResponse;
import io.dartchain.backend.explorer.application.ExplorerBlocksService;
import io.dartchain.backend.explorer.application.ExplorerSearchService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Phase AA — explorer versionné.
 */
@RestController
@RequestMapping(ApiRoutes.EXPLORER_V1_PREFIX)
public class ExplorerV1Controller {

    private final ExplorerSearchService explorerSearchService;
    private final ExplorerBlocksService explorerBlocksService;

    public ExplorerV1Controller(
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
