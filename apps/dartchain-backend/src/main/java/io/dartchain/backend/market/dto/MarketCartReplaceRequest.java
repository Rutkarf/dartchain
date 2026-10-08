package io.dartchain.backend.market.dto;

import java.util.List;

public record MarketCartReplaceRequest(List<MarketCartItemDto> items) {}
