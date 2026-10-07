package io.dartchain.backend.showcase.model;

import java.time.Instant;

public class ChatMessage {

    private String id;
    private String roomId;
    private String author;
    private String text;
    private Instant sentAt;
    private String clientId;
    private String fontKey;
    private String fontSize;
    private boolean bold;
    private boolean italic;
    private boolean underline;
    private boolean strikethrough;
    private String fontColor;
    private String highlightColor;
    private String textAlign;
    private String styleKey;

    public ChatMessage() {
    }

    public ChatMessage(
            String id,
            String roomId,
            String author,
            String text,
            Instant sentAt,
            String clientId,
            String fontKey,
            String fontSize,
            boolean bold,
            boolean italic,
            boolean underline,
            boolean strikethrough,
            String fontColor,
            String highlightColor,
            String textAlign,
            String styleKey
    ) {
        this.id = id;
        this.roomId = roomId;
        this.author = author;
        this.text = text;
        this.sentAt = sentAt;
        this.clientId = clientId;
        this.fontKey = fontKey;
        this.fontSize = fontSize;
        this.bold = bold;
        this.italic = italic;
        this.underline = underline;
        this.strikethrough = strikethrough;
        this.fontColor = fontColor;
        this.highlightColor = highlightColor;
        this.textAlign = textAlign;
        this.styleKey = styleKey;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public Instant getSentAt() {
        return sentAt;
    }

    public void setSentAt(Instant sentAt) {
        this.sentAt = sentAt;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getFontKey() {
        return fontKey;
    }

    public void setFontKey(String fontKey) {
        this.fontKey = fontKey;
    }

    public String getFontSize() {
        return fontSize;
    }

    public void setFontSize(String fontSize) {
        this.fontSize = fontSize;
    }

    public boolean isBold() {
        return bold;
    }

    public void setBold(boolean bold) {
        this.bold = bold;
    }

    public boolean isItalic() {
        return italic;
    }

    public void setItalic(boolean italic) {
        this.italic = italic;
    }

    public boolean isUnderline() {
        return underline;
    }

    public void setUnderline(boolean underline) {
        this.underline = underline;
    }

    public boolean isStrikethrough() {
        return strikethrough;
    }

    public void setStrikethrough(boolean strikethrough) {
        this.strikethrough = strikethrough;
    }

    public String getFontColor() {
        return fontColor;
    }

    public void setFontColor(String fontColor) {
        this.fontColor = fontColor;
    }

    public String getHighlightColor() {
        return highlightColor;
    }

    public void setHighlightColor(String highlightColor) {
        this.highlightColor = highlightColor;
    }

    public String getTextAlign() {
        return textAlign;
    }

    public void setTextAlign(String textAlign) {
        this.textAlign = textAlign;
    }

    public String getStyleKey() {
        return styleKey;
    }

    public void setStyleKey(String styleKey) {
        this.styleKey = styleKey;
    }
}
