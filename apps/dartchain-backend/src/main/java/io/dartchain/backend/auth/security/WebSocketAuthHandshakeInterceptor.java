package io.dartchain.backend.auth.security;

import org.springframework.http.HttpStatus;
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
        var user = webSocketAuthSupport.resolveFromRequest(request);
        user.ifPresent(resolved -> webSocketAuthSupport.attachToAttributes(attributes, resolved));

        String path = request.getURI() != null ? request.getURI().getPath() : "";
        // L'arène est un canal joueur. /ws/peers reste ouvert : les nœuds se synchronisent
        // sans compte partagé. Les réponses P2P sensibles restent contrôlées dans P2pService.
        // /ws/live et /ws/chat restent ouverts sans compte.
        if (path.startsWith("/ws/metaverse-arena") && user.isEmpty()) {
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }
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
