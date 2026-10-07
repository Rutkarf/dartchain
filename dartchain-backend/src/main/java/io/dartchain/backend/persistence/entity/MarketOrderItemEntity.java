package io.dartchain.backend.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "market_order_items")
public class MarketOrderItemEntity {

    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private MarketOrderEntity order;

    @Column(name = "exchange_token", nullable = false, length = 32)
    private String exchangeToken;

    @Column(name = "display_symbol", nullable = false, length = 32)
    private String displaySymbol;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "unit_price_r4v3", nullable = false, precision = 38, scale = 26)
    private BigDecimal unitPriceR4v3;

    @Column(name = "amount_in_r4v3", nullable = false, precision = 38, scale = 26)
    private BigDecimal amountInR4v3;

    @Column(name = "amount_out", nullable = false, precision = 38, scale = 26)
    private BigDecimal amountOut;

    @Column(nullable = false)
    private boolean ok;

    @Column(name = "line_message")
    private String lineMessage;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public MarketOrderEntity getOrder() {
        return order;
    }

    public void setOrder(MarketOrderEntity order) {
        this.order = order;
    }

    public String getExchangeToken() {
        return exchangeToken;
    }

    public void setExchangeToken(String exchangeToken) {
        this.exchangeToken = exchangeToken;
    }

    public String getDisplaySymbol() {
        return displaySymbol;
    }

    public void setDisplaySymbol(String displaySymbol) {
        this.displaySymbol = displaySymbol;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getUnitPriceR4v3() {
        return unitPriceR4v3;
    }

    public void setUnitPriceR4v3(BigDecimal unitPriceR4v3) {
        this.unitPriceR4v3 = unitPriceR4v3;
    }

    public BigDecimal getAmountInR4v3() {
        return amountInR4v3;
    }

    public void setAmountInR4v3(BigDecimal amountInR4v3) {
        this.amountInR4v3 = amountInR4v3;
    }

    public BigDecimal getAmountOut() {
        return amountOut;
    }

    public void setAmountOut(BigDecimal amountOut) {
        this.amountOut = amountOut;
    }

    public boolean isOk() {
        return ok;
    }

    public void setOk(boolean ok) {
        this.ok = ok;
    }

    public String getLineMessage() {
        return lineMessage;
    }

    public void setLineMessage(String lineMessage) {
        this.lineMessage = lineMessage;
    }
}
