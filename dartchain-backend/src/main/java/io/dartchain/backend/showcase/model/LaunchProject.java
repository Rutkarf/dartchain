package io.dartchain.backend.showcase.model;

import java.math.BigDecimal;
import java.time.Instant;

public class LaunchProject {

    private String id;
    private String name;
    private String symbol;
    private LaunchStatus status;
    private BigDecimal raisedAmount;
    private BigDecimal targetAmount;
    private Instant createdAt;
    private String logoUrl;
    private String description;
    private String chain;
    private String whitepaperUrl;
    private String website;
    private String launchDate;

    public LaunchProject() {
    }

    public LaunchProject(
            String id,
            String name,
            String symbol,
            LaunchStatus status,
            BigDecimal raisedAmount,
            BigDecimal targetAmount,
            Instant createdAt,
            String logoUrl,
            String description,
            String chain,
            String whitepaperUrl,
            String website,
            String launchDate
    ) {
        this.id = id;
        this.name = name;
        this.symbol = symbol;
        this.status = status;
        this.raisedAmount = raisedAmount;
        this.targetAmount = targetAmount;
        this.createdAt = createdAt;
        this.logoUrl = logoUrl;
        this.description = description;
        this.chain = chain;
        this.whitepaperUrl = whitepaperUrl;
        this.website = website;
        this.launchDate = launchDate;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }

    public LaunchStatus getStatus() {
        return status;
    }

    public void setStatus(LaunchStatus status) {
        this.status = status;
    }

    public BigDecimal getRaisedAmount() {
        return raisedAmount;
    }

    public void setRaisedAmount(BigDecimal raisedAmount) {
        this.raisedAmount = raisedAmount;
    }

    public BigDecimal getTargetAmount() {
        return targetAmount;
    }

    public void setTargetAmount(BigDecimal targetAmount) {
        this.targetAmount = targetAmount;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public String getLogoUrl() {
        return logoUrl;
    }

    public void setLogoUrl(String logoUrl) {
        this.logoUrl = logoUrl;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getChain() {
        return chain;
    }

    public void setChain(String chain) {
        this.chain = chain;
    }

    public String getWhitepaperUrl() {
        return whitepaperUrl;
    }

    public void setWhitepaperUrl(String whitepaperUrl) {
        this.whitepaperUrl = whitepaperUrl;
    }

    public String getWebsite() {
        return website;
    }

    public void setWebsite(String website) {
        this.website = website;
    }

    public String getLaunchDate() {
        return launchDate;
    }

    public void setLaunchDate(String launchDate) {
        this.launchDate = launchDate;
    }
}
