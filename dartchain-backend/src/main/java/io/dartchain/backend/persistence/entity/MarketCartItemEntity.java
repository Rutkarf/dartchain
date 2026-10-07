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
@Table(name = "market_cart_items")
public class MarketCartItemEntity {

    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cart_id", nullable = false)
    private MarketCartEntity cart;

    @Column(name = "exchange_token", nullable = false, length = 32)
    private String exchangeToken;

    @Column(name = "display_symbol", nullable = false, length = 32)
    private String displaySymbol;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(name = "offer_kind", nullable = false, length = 16)
    private String offerKind;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "unit_price_r4v3", nullable = false, precision = 38, scale = 26)
    private BigDecimal unitPriceR4v3;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public MarketCartEntity getCart() {
        return cart;
    }

    public void setCart(MarketCartEntity cart) {
        this.cart = cart;
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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getOfferKind() {
        return offerKind;
    }

    public void setOfferKind(String offerKind) {
        this.offerKind = offerKind;
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
}
