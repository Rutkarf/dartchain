package io.dartchain.backend.m4t3r;

import io.dartchain.backend.m4t3r.config.M4t3rRewardConfig;
import io.dartchain.backend.m4t3r.model.M4t3rReward;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class M4t3rProofServiceTest {

    @Test
    void signsAndVerifiesRewardProof() {
        M4t3rRewardConfig config = new M4t3rRewardConfig();
        setField(config, "signingKey", "test-signing-key");
        setField(config, "signingKeyId", "test-key");

        M4t3rProofService proofService = new M4t3rProofService(config);
        M4t3rReward reward = new M4t3rReward();
        reward.setRewardId("reward-1");
        reward.setUserIdHash("0xabc");
        reward.setWalletAddress("R4V3test");
        reward.setTokenId("m4t3r:marseille:chunk:0:0:1:2:cycle-0");
        reward.setAmount(new BigDecimal("0.00000000000000000000000001"));
        reward.setPlayerSpeed(new BigDecimal("1.420"));
        reward.setMaxAllowedSpeed(new BigDecimal("5.000"));
        reward.setCollectedAt(1_700_000_000_000L);
        reward.setServerValidatedAt(1_700_000_001_000L);
        reward.setChainId("offchain");
        reward.setNonce("nonce-1");

        String proofHash = proofService.buildProofHash(reward);
        String signature = proofService.signProofHash(proofHash);

        assertThat(proofHash).startsWith("0x");
        assertThat(signature).startsWith("0x");
        assertThat(proofService.verify(proofHash, signature)).isTrue();
        assertThat(proofService.verify(proofHash, signature + "00")).isFalse();
    }

    private static void setField(Object target, String fieldName, String value) {
        try {
            var field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
