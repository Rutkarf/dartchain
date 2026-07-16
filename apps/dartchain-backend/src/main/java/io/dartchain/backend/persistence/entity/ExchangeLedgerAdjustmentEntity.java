package io.dartchain.backend.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "exchange_ledger_adjustments")
public class ExchangeLedgerAdjustmentEntity {

    @EmbeddedId
    private ExchangeLedgerAdjustmentId id;

    @Column(nullable = false, precision = 38, scale = 8)
    private BigDecimal adjustment;

    public ExchangeLedgerAdjustmentId getId() {
        return id;
    }

    public void setId(ExchangeLedgerAdjustmentId id) {
        this.id = id;
    }

    public BigDecimal getAdjustment() {
        return adjustment;
    }

    public void setAdjustment(BigDecimal adjustment) {
        this.adjustment = adjustment;
    }
}
