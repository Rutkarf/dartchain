package io.dartchain.backend.chain;

import io.dartchain.backend.chain.dto.ChainConfigResponse;
import io.dartchain.backend.config.ChainProperties;
import io.dartchain.backend.persistence.entity.ChainAccountEntity;
import io.dartchain.backend.persistence.repository.ChainAccountRepository;
import io.dartchain.backend.persistence.repository.ChainConfigRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class ChainConfigService {

    private final ChainProperties chainProperties;
    private final ChainConfigRepository chainConfigRepository;
    private final ChainAccountRepository chainAccountRepository;

    public ChainConfigService(
            ChainProperties chainProperties,
            @Autowired(required = false) ChainConfigRepository chainConfigRepository,
            @Autowired(required = false) ChainAccountRepository chainAccountRepository
    ) {
        this.chainProperties = chainProperties;
        this.chainConfigRepository = chainConfigRepository;
        this.chainAccountRepository = chainAccountRepository;
    }

    public ChainConfigResponse getConfig() {
        long chainId = resolveChainId();
        String networkName = resolveConfigValue("networkName", chainProperties.getNetworkName());
        String nativeToken = resolveConfigValue("nativeToken", chainProperties.getNativeToken());
        String scheme = resolveConfigValue("addressSchemeDefault", "evm-compatible");
        String payloadVersion = resolveConfigValue("signingPayloadVersion", "DCv1");

        return new ChainConfigResponse(
                chainId,
                networkName,
                nativeToken,
                scheme,
                payloadVersion,
                true
        );
    }

    public long resolveChainId() {
        return parseLong(resolveConfigValue("chainId", String.valueOf(chainProperties.getChainId())));
    }

    public void registerEvmAccount(String address, String publicKeyBase64) {
        if (chainAccountRepository == null) {
            return;
        }

        Optional<ChainAccountEntity> existing = chainAccountRepository.findById(address);
        if (existing.isPresent()) {
            return;
        }

        ChainAccountEntity entity = new ChainAccountEntity();
        entity.setAddress(address);
        entity.setAddressScheme(AddressScheme.EVM.name().toLowerCase());
        entity.setPublicKey(publicKeyBase64);
        entity.setNonce(0L);
        entity.setCreatedAt(System.currentTimeMillis());
        chainAccountRepository.save(entity);
    }

    private String resolveConfigValue(String key, String fallback) {
        if (chainConfigRepository == null) {
            return fallback;
        }

        return chainConfigRepository.findById(key)
                .map(entity -> entity.getConfigValue())
                .orElse(fallback);
    }

    private long parseLong(String value) {
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException exception) {
            return chainProperties.getChainId();
        }
    }
}
