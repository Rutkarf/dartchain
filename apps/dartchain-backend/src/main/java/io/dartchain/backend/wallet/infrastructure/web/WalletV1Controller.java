package io.dartchain.backend.wallet.infrastructure.web;

import io.dartchain.backend.chain.ChainConfigService;
import io.dartchain.backend.chain.dto.EvmWalletGenerateResponse;
import io.dartchain.backend.config.ApiRoutes;
import io.dartchain.backend.config.ChainProperties;
import io.dartchain.backend.shared.utils.EvmCryptoUtils;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.security.KeyPair;

@RestController
@RequestMapping(ApiRoutes.WALLETS_V1_PREFIX)
public class WalletV1Controller {

    private final ChainProperties chainProperties;
    private final ChainConfigService chainConfigService;

    public WalletV1Controller(ChainProperties chainProperties, ChainConfigService chainConfigService) {
        this.chainProperties = chainProperties;
        this.chainConfigService = chainConfigService;
    }

    /**
     * Génération EVM-compatible (secp256k1 + adresse 0x) pour la chaîne native DartChain.
     * Réservé dev/démo — désactivable via {@code dartchain.chain.allow-server-evm-wallet-create=false}.
     */
    @PostMapping("/generate-evm")
    @ResponseStatus(HttpStatus.CREATED)
    public EvmWalletGenerateResponse generateEvmWallet() {
        if (!chainProperties.isAllowServerEvmWalletCreate()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Génération serveur de wallet EVM désactivée"
            );
        }

        KeyPair keyPair = EvmCryptoUtils.generateKeyPair();
        String address = EvmCryptoUtils.addressFromPublicKey(keyPair.getPublic());
        String publicKey = EvmCryptoUtils.publicKeyToBase64(keyPair.getPublic());
        String privateKey = EvmCryptoUtils.privateKeyToBase64(keyPair.getPrivate());

        chainConfigService.registerEvmAccount(address, publicKey);

        return new EvmWalletGenerateResponse(
                address,
                publicKey,
                privateKey,
                "client-ecdsa-evm",
                "evm",
                chainConfigService.resolveChainId()
        );
    }
}
