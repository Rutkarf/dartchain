package io.dartchain.backend.blockchain.infrastructure.web;

import io.dartchain.backend.auth.AuthService;
import io.dartchain.backend.auth.security.RoleAuthorizationService;
import io.dartchain.backend.blockchain.dto.MineRequest;
import io.dartchain.backend.blockchain.dto.StatsResponse;
import io.dartchain.backend.blockchain.model.Block;
import io.dartchain.backend.blockchain.model.Transaction;
import io.dartchain.backend.blockchain.application.BlockchainService;
import io.dartchain.backend.exchange.application.ExchangeService;
import io.dartchain.backend.web.RequestClientInfo;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/blockchain")
@RequiredArgsConstructor
public class BlockchainController {

    private final BlockchainService blockchainService;
    private final ExchangeService exchangeService;
    private final AuthService authService;
    private final RoleAuthorizationService roleAuthorizationService;

    @GetMapping("/balance/{address}")
    public Map<String, Object> getBalance(@PathVariable String address) {
        BigDecimal chainBalance = blockchainService.getBalance(address);
        BigDecimal effectiveBalance = exchangeService.getEffectiveNativeBalance(address);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("address", address);
        response.put("balance", effectiveBalance.toPlainString());
        response.put("chainBalance", chainBalance.toPlainString());
        response.put("testnetAdjusted", effectiveBalance.compareTo(chainBalance) != 0);
        return response;
    }

    @GetMapping("/chain")
    public List<Block> getChain() {
        return blockchainService.getChain();
    }

    /** Alias frontend : `/api/blockchain/blocks` */
    @GetMapping("/blocks")
    public List<Block> getBlocks() {
        return blockchainService.getBlocks();
    }

    /** Alias frontend : `/api/blockchain/blocks/latest` */
    @GetMapping("/blocks/latest")
    public Block getLatestBlock() {
        return blockchainService.getLatestBlock();
    }

    /** Alias frontend : `/api/blockchain/stats` */
    @GetMapping("/stats")
    public StatsResponse getStats() {
        return blockchainService.getStats();
    }

    @GetMapping("/valid")
    public boolean isChainValid() {
        return blockchainService.isChainValid();
    }

    @GetMapping("/pending")
    public List<Transaction> getPendingTransactions() {
        return blockchainService.getPendingTransactions();
    }

    @PostMapping("/mine")
    public Block minePendingTransactions(
            @RequestBody MineRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            HttpServletRequest httpRequest
    ) {
        if (request == null || request.getMinerAddress() == null || request.getMinerAddress().isBlank()) {
            throw new IllegalArgumentException("minerAddress requis");
        }

        String ip = RequestClientInfo.clientIp(httpRequest);
        var account = roleAuthorizationService.authorizeMutation(
                authorization,
                "blockchain.mine",
                request.getMinerAddress(),
                ip
        );
        authService.ensureWalletOwnership(account, request.getMinerAddress());
        return blockchainService.minePendingTransactions(request.getMinerAddress());
    }

    @PostMapping("/mine/{minerAddress}")
    public Block minePendingTransactionsByPath(
            @PathVariable String minerAddress,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            HttpServletRequest httpRequest
    ) {
        String ip = RequestClientInfo.clientIp(httpRequest);
        var account = roleAuthorizationService.authorizeMutation(
                authorization,
                "blockchain.mine",
                minerAddress,
                ip
        );
        authService.ensureWalletOwnership(account, minerAddress);
        return blockchainService.minePendingTransactions(minerAddress);
    }
}
