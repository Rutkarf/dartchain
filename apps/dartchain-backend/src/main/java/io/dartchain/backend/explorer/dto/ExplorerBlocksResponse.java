package io.dartchain.backend.explorer.dto;

import io.dartchain.backend.model.Block;

import java.util.List;

public record ExplorerBlocksResponse(
        String wallet,
        Integer fromIndex,
        Integer toIndex,
        int total,
        List<Block> blocks
) {
}
