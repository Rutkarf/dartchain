package io.dartchain.backend.quests;

public class QuestException extends RuntimeException {

    private final int statusCode;

    public QuestException(int statusCode, String message) {
        super(message);
        this.statusCode = statusCode;
    }

    public int getStatusCode() {
        return statusCode;
    }
}
