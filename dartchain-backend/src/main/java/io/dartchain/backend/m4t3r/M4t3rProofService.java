package io.dartchain.backend.m4t3r;

import io.dartchain.backend.m4t3r.config.M4t3rRewardConfig;
import io.dartchain.backend.m4t3r.model.M4t3rReward;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

@Service
public class M4t3rProofService {

    private static final String ALGORITHM = "HmacSHA256";

    private final M4t3rRewardConfig config;

    public M4t3rProofService(M4t3rRewardConfig config) {
        this.config = config;
    }

    public String buildProofHash(M4t3rReward reward) {
        String canonical = String.join("|",
                nullSafe(reward.getRewardId()),
                nullSafe(reward.getUserIdHash()),
                nullSafe(reward.getWalletAddress()),
                nullSafe(reward.getTokenId()),
                reward.getAmount() == null ? "0" : reward.getAmount().toPlainString(),
                reward.getPlayerSpeed() == null ? "0" : reward.getPlayerSpeed().toPlainString(),
                reward.getMaxAllowedSpeed() == null ? "0" : reward.getMaxAllowedSpeed().toPlainString(),
                String.valueOf(reward.getCollectedAt()),
                String.valueOf(reward.getServerValidatedAt()),
                nullSafe(reward.getChainId()),
                nullSafe(reward.getNonce())
        );
        return sha256Hex(canonical);
    }

    public String signProofHash(String proofHash) {
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(new SecretKeySpec(config.getSigningKey().getBytes(StandardCharsets.UTF_8), ALGORITHM));
            return "0x" + HexFormat.of().formatHex(mac.doFinal(proofHash.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to sign m4t3r reward proof", exception);
        }
    }

    public boolean verify(String proofHash, String serverSignature) {
        if (proofHash == null || serverSignature == null || serverSignature.isBlank()) {
            return false;
        }
        String expected = signProofHash(proofHash);
        return expected.equalsIgnoreCase(serverSignature);
    }

    public String hashUserId(String userId) {
        return sha256Hex(nullSafe(userId));
    }

    private static String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return "0x" + HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to hash m4t3r proof payload", exception);
        }
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
