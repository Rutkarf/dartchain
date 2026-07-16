package io.dartchain.backend.utils;

import org.bouncycastle.jce.ECNamedCurveTable;
import org.bouncycastle.jce.interfaces.ECPublicKey;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.jce.spec.ECNamedCurveParameterSpec;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.SecureRandom;
import java.security.Security;
import java.security.Signature;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Phase AD — crypto EVM-compatible pour la chaîne native DartChain (non-Ethereum).
 * Courbe secp256k1, adresses Keccak-256 (0x + 20 octets), chainId EIP-155 pour les payloads.
 */
public final class EvmCryptoUtils {

    private static final String CURVE = "secp256k1";
    private static final ECNamedCurveParameterSpec CURVE_SPEC =
            ECNamedCurveTable.getParameterSpec(CURVE);

    static {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
    }

    private EvmCryptoUtils() {
    }

    public static KeyPair generateKeyPair() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("ECDSA", "BC");
            generator.initialize(CURVE_SPEC, new SecureRandom());
            return generator.generateKeyPair();
        } catch (Exception exception) {
            throw new RuntimeException("Erreur génération paire secp256k1", exception);
        }
    }

    public static String publicKeyToBase64(PublicKey publicKey) {
        return Base64.getEncoder().encodeToString(publicKey.getEncoded());
    }

    public static String privateKeyToBase64(PrivateKey privateKey) {
        return Base64.getEncoder().encodeToString(privateKey.getEncoded());
    }

    public static PublicKey publicKeyFromBase64(String publicKeyBase64) {
        try {
            KeyFactory keyFactory = KeyFactory.getInstance("ECDSA", "BC");
            return keyFactory.generatePublic(new X509EncodedKeySpec(
                    Base64.getDecoder().decode(publicKeyBase64)
            ));
        } catch (Exception exception) {
            throw new RuntimeException("Clé publique secp256k1 invalide", exception);
        }
    }

    public static PrivateKey privateKeyFromBase64(String privateKeyBase64) {
        try {
            KeyFactory keyFactory = KeyFactory.getInstance("ECDSA", "BC");
            return keyFactory.generatePrivate(new PKCS8EncodedKeySpec(
                    Base64.getDecoder().decode(privateKeyBase64)
            ));
        } catch (Exception exception) {
            throw new RuntimeException("Clé privée secp256k1 invalide", exception);
        }
    }

    public static String addressFromPublicKey(PublicKey publicKey) {
        if (!(publicKey instanceof ECPublicKey ecPublicKey)) {
            throw new IllegalArgumentException("Clé publique EC attendue");
        }

        byte[] uncompressed = ecPublicKey.getQ().getEncoded(false);
        byte[] hash = Keccak256.hash(uncompressed);
        byte[] addressBytes = copyOfRange(hash, 12, 32);
        return "0x" + HexFormat.of().formatHex(addressBytes);
    }

    public static String buildNativePayload(
            long chainId,
            long nonce,
            String from,
            String to,
            String value,
            long timestamp,
            String memo
    ) {
        String normalizedMemo = memo == null ? "" : memo.trim();
        String base = "DCv1|"
                + chainId + "|"
                + nonce + "|"
                + from + "|"
                + to + "|"
                + value + "|"
                + timestamp;
        if (!normalizedMemo.isBlank()) {
            return base + "|" + normalizedMemo;
        }
        return base;
    }

    public static String sign(String payload, PrivateKey privateKey) {
        try {
            Signature signature = Signature.getInstance("SHA256withECDSA", "BC");
            signature.initSign(privateKey);
            signature.update(payload.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(signature.sign());
        } catch (Exception exception) {
            throw new RuntimeException("Erreur signature secp256k1", exception);
        }
    }

    public static boolean verify(String payload, String signatureBase64, PublicKey publicKey) {
        try {
            Signature verifier = Signature.getInstance("SHA256withECDSA", "BC");
            verifier.initVerify(publicKey);
            verifier.update(payload.getBytes(StandardCharsets.UTF_8));
            return verifier.verify(Base64.getDecoder().decode(signatureBase64));
        } catch (Exception exception) {
            return false;
        }
    }

    private static byte[] copyOfRange(byte[] source, int from, int to) {
        byte[] copy = new byte[to - from];
        System.arraycopy(source, from, copy, 0, copy.length);
        return copy;
    }
}
