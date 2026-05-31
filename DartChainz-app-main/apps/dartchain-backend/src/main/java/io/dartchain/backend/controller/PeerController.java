package io.dartchain.backend.controller;

import io.dartchain.backend.dto.AddPeerRequest;
import io.dartchain.backend.dto.AddPeerResponse;
import io.dartchain.backend.dto.PeerStatsResponse;
import io.dartchain.backend.dto.PeerView;
import io.dartchain.backend.peer.PeerConnection;
import io.dartchain.backend.service.PeerService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/peers")
public class PeerController {

    private final PeerService peerService;

    public PeerController(PeerService peerService) {
        this.peerService = peerService;
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
    public AddPeerResponse addPeer(@RequestBody AddPeerRequest request) {
        if (request == null || request.getPeer() == null || request.getPeer().trim().isEmpty()) {
            throw new IllegalArgumentException("Peer is required");
        }

        PeerConnection peer = peerService.addAndConnect(request.getPeer());

        return new AddPeerResponse(
                true,
                peer.getUrl(),
                peer.getStatus().name(),
                peer.getMessage()
        );
    }

    @PostMapping("/reconnect")
    public AddPeerResponse reconnectPeer(@RequestBody AddPeerRequest request) {
        if (request == null || request.getPeer() == null || request.getPeer().trim().isEmpty()) {
            throw new IllegalArgumentException("Peer is required");
        }

        PeerConnection peer = peerService.reconnect(request.getPeer());

        return new AddPeerResponse(
                true,
                peer.getUrl(),
                peer.getStatus().name(),
                peer.getMessage()
        );
    }

    private PeerView toView(PeerConnection peer) {
        return new PeerView(
                peer.getUrl(),
                peer.getStatus().name(),
                peer.getMessage()
        );
    }
}