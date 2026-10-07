package io.dartchain.backend.ops;

import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.CoreConstants;
import ch.qos.logback.core.LayoutBase;

import java.time.Instant;

/**
 * Phase AE — logs structurés JSON (une ligne par événement), sans lib externe.
 */
public class NativeJsonLogLayout extends LayoutBase<ILoggingEvent> {

    @Override
    public String doLayout(ILoggingEvent event) {
        StringBuilder json = new StringBuilder(256);
        json.append('{');
        appendField(json, "ts", Instant.ofEpochMilli(event.getTimeStamp()).toString());
        json.append(',');
        appendField(json, "level", event.getLevel().toString());
        json.append(',');
        appendField(json, "logger", event.getLoggerName());
        json.append(',');
        appendField(json, "message", event.getFormattedMessage());

        String requestId = event.getMDCPropertyMap().get(RequestCorrelationFilter.MDC_REQUEST_ID);
        if (requestId != null && !requestId.isBlank()) {
            json.append(',');
            appendField(json, "requestId", requestId);
        }

        if (event.getThrowableProxy() != null) {
            json.append(',');
            appendField(json, "error", event.getThrowableProxy().getClassName()
                    + ": " + event.getThrowableProxy().getMessage());
        }

        json.append('}');
        json.append(CoreConstants.LINE_SEPARATOR);
        return json.toString();
    }

    private void appendField(StringBuilder json, String key, String value) {
        json.append('"').append(escape(key)).append("\":\"").append(escape(value)).append('"');
    }

    static String escape(String value) {
        if (value == null) {
            return "";
        }

        StringBuilder escaped = new StringBuilder(value.length() + 8);
        for (int index = 0; index < value.length(); index++) {
            char character = value.charAt(index);
            switch (character) {
                case '"' -> escaped.append("\\\"");
                case '\\' -> escaped.append("\\\\");
                case '\n' -> escaped.append("\\n");
                case '\r' -> escaped.append("\\r");
                case '\t' -> escaped.append("\\t");
                default -> escaped.append(character);
            }
        }
        return escaped.toString();
    }
}
