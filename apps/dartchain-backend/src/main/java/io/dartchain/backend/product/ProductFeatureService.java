package io.dartchain.backend.product;

import io.dartchain.backend.config.ProductProperties;
import io.dartchain.backend.exception.FeatureDisabledException;
import org.springframework.stereotype.Service;

@Service
public class ProductFeatureService {

    private final ProductProperties productProperties;

    public ProductFeatureService(ProductProperties productProperties) {
        this.productProperties = productProperties;
    }

    public void requireLegacyPrivateKey() {
        if (!productProperties.isAllowLegacyPrivateKey()) {
            throw new FeatureDisabledException(
                    "senderPrivateKey est désactivé en mode commercial — utilisez une signature client.");
        }
    }

    public void requireServerWalletCreate() {
        if (!productProperties.isAllowServerWalletCreate()) {
            throw new FeatureDisabledException(
                    "La création de wallet côté serveur est désactivée — générez le wallet localement.");
        }
    }

    public void requireFaucet() {
        // Faucet toujours actif — voir ProductProperties#isFaucetEnabled.
    }
}
