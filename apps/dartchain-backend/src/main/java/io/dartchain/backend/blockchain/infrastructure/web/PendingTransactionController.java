package io.dartchain.backend.blockchain.infrastructure.web;

import io.dartchain.backend.auth.application.AuthService;
import io.dartchain.backend.auth.security.RoleAuthorizationService;
import io.dartchain.backend.blockchain.dto.AddPendingTransactionResponse;
import io.dartchain.backend.blockchain.dto.CreatePendingTransactionRequest;
import io.dartchain.backend.blockchain.dto.MinePendingTransactionResponse;
import io.dartchain.backend.blockchain.dto.PendingTransactionResponse;
import io.dartchain.backend.blockchain.application.PendingTransactionService;
import io.dartchain.backend.web.RequestClientInfo;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PendingTransactionController {

    private final PendingTransactionService pendingTransactionService;
    private final AuthService authService;
    private final RoleAuthorizationService roleAuthorizationService;

    @GetMapping("/pending-transactions")
    public List<PendingTransactionResponse> getPendingTransactions() {
        return pendingTransactionService.getPendingTransactions();
    }

    @PostMapping("/pending-transactions")
    public AddPendingTransactionResponse addPendingTransaction(
            @Valid @RequestBody CreatePendingTransactionRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            HttpServletRequest httpRequest
    ) {
        String ip = RequestClientInfo.clientIp(httpRequest);
        var account = roleAuthorizationService.authorizeMutation(
                authorization,
                "pending.create",
                request.getFromAddress(),
                ip
        );
        authService.ensureWalletOwnership(account, request.getFromAddress());
        return pendingTransactionService.addPendingTransaction(request, account);
    }

    @PostMapping("/pending-transactions/{id}/mine")
    public MinePendingTransactionResponse minePendingTransaction(
            @PathVariable String id,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            HttpServletRequest httpRequest
    ) {
        String ip = RequestClientInfo.clientIp(httpRequest);
        roleAuthorizationService.authorizeMutation(authorization, "pending.mine", id, ip);
        return pendingTransactionService.minePendingTransaction(id);
    }
}
