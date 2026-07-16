package io.dartchain.backend.controller;

import io.dartchain.backend.dto.BlockValidationResult;
import io.dartchain.backend.dto.CreateBlockRequest;
import io.dartchain.backend.model.Block;
import io.dartchain.backend.p2p.P2pService;
import io.dartchain.backend.service.BlockchainService;
import io.dartchain.backend.service.BlockchainValidationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/blocks")
public class BlockController {

    private final BlockchainService blockchainService;
    private final BlockchainValidationService validationService;
    private final P2pService p2pService;

    public BlockController(
            BlockchainService blockchainService,
            BlockchainValidationService validationService,
            P2pService p2pService
    ) {
        this.blockchainService = blockchainService;
        this.validationService = validationService;
        this.p2pService = p2pService;
    }

    @GetMapping
    public ResponseEntity<List<Block>> getBlocks() {
        return ResponseEntity.ok(blockchainService.getBlocks());
    }

    @GetMapping("/latest")
    public ResponseEntity<Block> getLatestBlock() {
        return ResponseEntity.ok(blockchainService.getLatestBlock());
    }

    @PostMapping
    public ResponseEntity<Block> createBlock(@Valid @RequestBody CreateBlockRequest request) {
        Block createdBlock = blockchainService.addBlock(request.getData());
        p2pService.broadcastLatest();
        return ResponseEntity.status(HttpStatus.CREATED).body(createdBlock);
    }

    @GetMapping("/validate")
    public ResponseEntity<BlockValidationResult> validateChain() {
        return ResponseEntity.ok(
                validationService.validateChain(blockchainService.getBlocks())
        );
    }

    @PostMapping("/validate")
    public ResponseEntity<BlockValidationResult> validateIncomingBlock(@RequestBody Block block) {
        return ResponseEntity.ok(
                validationService.validateBlockAgainstChain(block, blockchainService.getBlocks())
        );
    }
}