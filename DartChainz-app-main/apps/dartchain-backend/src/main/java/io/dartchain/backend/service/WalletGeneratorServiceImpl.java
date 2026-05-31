package io.dartchain.backend.service;

import io.dartchain.backend.model.Wallet;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.UUID;

@Service
public class WalletGeneratorServiceImpl implements Wallet.WalletGeneratorService {

    @Override
    public Wallet createWallet() {
        Wallet wallet = new Wallet();
        wallet.setAddress("ADDR_" + UUID.randomUUID());
        wallet.setPublicKey("PUB_" + UUID.randomUUID());
        wallet.setPrivateKey("PRIV_" + UUID.randomUUID());
        wallet.setBalance(BigDecimal.ZERO);
        return wallet;
    }
}