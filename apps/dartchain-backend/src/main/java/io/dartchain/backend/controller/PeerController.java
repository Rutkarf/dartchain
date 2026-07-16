package io.dartchain.backend.controller;

import io.dartchain.backend.auth.security.RoleAuthorizationService;
import io.dartchain.backend.dto.AddPeerRequest;
import io.dartchain.backend.dto.AddPeerResponse;
import io.dartchain.backend.dto.PeerStatsResponse;
import io.dartchain.backend.dto.PeerView;
import io.dartchain.backend.peer.PeerConnection;
import io.dartchain.backend.peer.PeerMetricsRegistry;
import io.dartchain.backend.peer.PeerMetricsRegistry.PeerMetricsSnapshot;
import io.dartchain.backend.service.PeerService;
import io.dartchain.backend.web.RequestClientInfo;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/peers")
public class PeerController {

    private final PeerService peerService;
    private final PeerMetricsRegistry metricsRegistry;
    private final RoleAuthorizationService roleAuthorizationService;

    public PeerController(
            PeerService peerService,
            PeerMetricsRegistry metricsRegistry,
            RoleAuthorizationService roleAuthorizationService
    ) {
        this.peerService = peerService;
        this.metricsRegistry = metricsRegistry;
        this.roleAuthorizationService = roleAuthorizationService;
    }

    @GetMapping
    public List<PeerView> getPeers() {
        return peerService.getAll().stream()
                .map(this::toView)
                .toList();
    }

    @GetMapping("/stats")
    public PeerStatsResponse getStats() {
        return peerService.getStats();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AddPeerResponse addPeer(
            @RequestBody AddPeerRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            HttpServletRequest httpRequest
    ) {
        if (request == null || request.getPeer() == null || request.getPeer().trim().isEmpty()) {
            throw new IllegalArgumentException("Peer is required");
        }

        String ip = RequestClientInfo.clientIp(httpRequest);
        roleAuthorizationService.authorizeMutation(
                authorization,
                "peer.add",
                request.getPeer().trim(),
                ip
        );

        PeerConnection peer = peerService.addAndConnect(request.getPeer(), authorization);

        return new AddPeerResponse(
                true,
                peer.getUrl(),
                peer.getStatus().name(),
                peer.getMessage()
        );
    }

    @PostMapping("/reconnect")
    public AddPeerResponse reconnectPeer(
            @RequestBody AddPeerRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            HttpServletRequest httpRequest
    ) {
        if (request == null || request.getPeer() == null || request.getPeer().trim().isEmpty()) {
            throw new IllegalArgumentException("Peer is required");
        }

        String ip = RequestClientInfo.clientIp(httpRequest);
        roleAuthorizationService.authorizeMutation(
                authorization,
                "peer.reconnect",
                request.getPeer().trim(),
                ip
        );

        PeerConnection peer = peerService.reconnect(request.getPeer(), authorization);

        return new AddPeerResponse(
                true,
                peer.getUrl(),
                peer.getStatus().name(),
                peer.getMessage()
        );
    }

    @PostMapping("/disconnect")
    public AddPeerResponse disconnectPeer(
            @RequestBody AddPeerRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            HttpServletRequest httpRequest
    ) {
        if (request == null || request.getPeer() == null || request.getPeer().trim().isEmpty()) {
            throw new IllegalArgumentException("Peer is required");
        }

        String ip = RequestClientInfo.clientIp(httpRequest);
        roleAuthorizationService.authorizeMutation(
                authorization,
                "peer.disconnect",
                request.getPeer().trim(),
                ip
        );

        PeerConnection peer = peerService.disconnect(request.getPeer());

        return new AddPeerResponse(
                true,
                peer.getUrl(),
                peer.getStatus().name(),
                peer.getMessage()
        );
    }

    private PeerView toView(PeerConnection peer) {
        PeerMetricsSnapshot metrics = metricsRegistry.getSnapshot(peer.getUrl());
        Integer syncPercent = metrics.syncPercent() != null
                ? metrics.syncPercent()
                : metricsRegistry.resolveSyncPercent(peer.getUrl(), peer.getStatus());

        PeerView view = new PeerView(
                peer.getUrl(),
                peer.getStatus().name(),
                peer.getMessage()
        );
        view.setLatencyMs(metrics.latencyMs());
        view.setChainHeight(metrics.chainHeight());
        view.setLocalChainHeight(metrics.localChainHeight());
        view.setSyncPercent(syncPercent);
        view.setLastSyncAt(metrics.lastSyncAt());
        view.setActivityPoints(metrics.activityPoints());
        return view;
    }
}
