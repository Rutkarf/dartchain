package io.dartchain.backend.ops;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.spi.LoggingEvent;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;

class NativeJsonLogLayoutTest {

    @Test
    void formatsJsonLineWithRequestId() {
        LoggerContext context = new LoggerContext();
        context.start();
        NativeJsonLogLayout layout = new NativeJsonLogLayout();
        layout.setContext(context);
        layout.start();

        LoggingEvent event = new LoggingEvent();
        event.setLoggerContext(context);
        event.setLevel(Level.WARN);
        event.setLoggerName("io.dartchain.test");
        event.setMessage("test message");
        event.setTimeStamp(System.currentTimeMillis());
        event.setMDCPropertyMap(Map.of(RequestCorrelationFilter.MDC_REQUEST_ID, "req-abc"));

        String line = layout.doLayout(event);

        assertTrue(line.startsWith("{"));
        assertTrue(line.contains("\"level\":\"WARN\""));
        assertTrue(line.contains("\"requestId\":\"req-abc\""));
        assertTrue(line.contains("\"message\":\"test message\""));
    }

    @Test
    void escapesQuotesInMessage() {
        String escaped = NativeJsonLogLayout.escape("say \"hello\"");
        assertTrue(escaped.contains("\\\""));
    }
}
