package io.dartchain.backend.explorer.dto;

import java.util.List;

public record ExplorerSearchResponse(
        String query,
        List<ExplorerSearchResultDto> results
) {
}
