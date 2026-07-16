package io.dartchain.backend.auth.security;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

@Component
public class WebSocketAuthHandshakeInterceptor implements HandshakeInterceptor {

    private final WebSocketAuthSupport webSocketAuthSupport;

    public WebSocketAuthHandshakeInterceptor(WebSocketAuthSupport webSocketAuthSupport) {
        this.webSocketAuthSupport = webSocketAuthSupport;
    }

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes
    ) {
        webSocketAuthSupport.resolveFromRequest(request)
                .ifPresent(user -> webSocketAuthSupport.attachToAttributes(attributes, user));
        return true;
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception
    ) {
        // no-op
    }
}
