package io.dartchain.backend.showcase.model;

public class PriceSample {

    private final long timestamp;
    private final double price;

    public PriceSample(long timestamp, double price) {
        this.timestamp = timestamp;
        this.price = price;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public double getPrice() {
        return price;
    }
}
