package io.dartchain.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "dartchain.chain")
public class ChainProperties {

    /** Identifiant réseau natif DartChain (EIP-155 compatible, non-Ethereum). */
    private long chainId = 3377L;

    private String networkName = "R4V3 Testnet";

    private String nativeToken = "R4V3";

    /** Autorise la génération serveur de wallets EVM (démo/dev). */
    private boolean allowServerEvmWalletCreate = true;

    public long getChainId() {
        return chainId;
    }

    public void setChainId(long chainId) {
        this.chainId = chainId;
    }

    public String getNetworkName() {
        return networkName;
    }

    public void setNetworkName(String networkName) {
        this.networkName = networkName;
    }

    public String getNativeToken() {
        return nativeToken;
    }

    public void setNativeToken(String nativeToken) {
        this.nativeToken = nativeToken;
    }

    public boolean isAllowServerEvmWalletCreate() {
        return allowServerEvmWalletCreate;
    }

    public void setAllowServerEvmWalletCreate(boolean allowServerEvmWalletCreate) {
        this.allowServerEvmWalletCreate = allowServerEvmWalletCreate;
    }
}
