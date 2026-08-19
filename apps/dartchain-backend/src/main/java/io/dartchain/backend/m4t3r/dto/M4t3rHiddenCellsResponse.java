package io.dartchain.backend.m4t3r.dto;

import java.util.List;

public record M4t3rHiddenCellsResponse(String type, List<M4t3rHiddenCell> cells) {
}
