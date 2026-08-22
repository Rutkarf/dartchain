package io.dartchain.backend.shared.utils;

import org.bouncycastle.jce.provider.BouncyCastleProvider;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

public final class CryptoUtils {

    static {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
    }

    private CryptoUtils() {
    }

    public static KeyPair generateKeyPair() {
        try {
            KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance("EC", "BC");
            ECGenParameterSpec ecSpec = new ECGenParameterSpec("secp256r1");
            keyPairGenerator.initialize(ecSpec, new SecureRandom());
            return keyPairGenerator.generateKeyPair();
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la génération de la paire de clés", e);
        }
    }

    public static String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));

            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Erreur SHA-256", e);
        }
    }

    public static String sign(String data, PrivateKey privateKey) {
        try {
            Signature ecdsaSign = Signature.getInstance("SHA256withECDSA", "BC");
            ecdsaSign.initSign(privateKey);
            ecdsaSign.update(data.getBytes(StandardCharsets.UTF_8));
            byte[] signature = ecdsaSign.sign();
            return Base64.getEncoder().encodeToString(signature);
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la signature", e);
        }
    }

    public static boolean verify(String data, String signatureBase64, PublicKey publicKey) {
        try {
            Signature ecdsaVerify = Signature.getInstance("SHA256withECDSA", "BC");
            ecdsaVerify.initVerify(publicKey);
            ecdsaVerify.update(data.getBytes(StandardCharsets.UTF_8));
            byte[] signatureBytes = Base64.getDecoder().decode(signatureBase64);
            return ecdsaVerify.verify(signatureBytes);
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la vérification de signature", e);
        }
    }

    /**
     * Vérifie une signature ECDSA client (Phase M).
     * Accepte le DER Java et le format IEEE P1363 (64 octets) produit par Web Crypto.
     */
    public static boolean verifyClientSignature(String data, String signatureBase64, PublicKey publicKey) {
        try {
            if (verify(data, signatureBase64, publicKey)) {
                return true;
            }

            byte[] signatureBytes = Base64.getDecoder().decode(signatureBase64);
            if (signatureBytes.length == 64) {
                return verify(
                        data,
                        Base64.getEncoder().encodeToString(toDerEcdsaSignature(signatureBytes)),
                        publicKey
                );
            }
        } catch (Exception ignored) {
            return false;
        }

        return false;
    }

    private static byte[] toDerEcdsaSignature(byte[] ieeeP1363) {
        byte[] r = trimLeadingZeros(copyOfRange(ieeeP1363, 0, 32));
        byte[] s = trimLeadingZeros(copyOfRange(ieeeP1363, 32, 64));

        int rHeader = 2 + r.length;
        int sHeader = 2 + s.length;
        int sequenceLength = rHeader + sHeader;
        byte[] der = new byte[2 + sequenceLength];
        int index = 0;
        der[index++] = 0x30;
        der[index++] = (byte) sequenceLength;
        index = writeDerInteger(der, index, r);
        writeDerInteger(der, index, s);
        return der;
    }

    private static int writeDerInteger(byte[] target, int offset, byte[] value) {
        target[offset] = 0x02;
        target[offset + 1] = (byte) value.length;
        System.arraycopy(value, 0, target, offset + 2, value.length);
        return offset + 2 + value.length;
    }

    private static byte[] trimLeadingZeros(byte[] value) {
        int start = 0;
        while (start < value.length - 1 && value[start] == 0) {
            start++;
        }
        if (start == 0) {
            if ((value[0] & 0x80) != 0) {
                byte[] prefixed = new byte[value.length + 1];
                prefixed[0] = 0x00;
                System.arraycopy(value, 0, prefixed, 1, value.length);
                return prefixed;
            }
            return value;
        }
        byte[] trimmed = new byte[value.length - start];
        System.arraycopy(value, start, trimmed, 0, trimmed.length);
        if ((trimmed[0] & 0x80) != 0) {
            byte[] prefixed = new byte[trimmed.length + 1];
            prefixed[0] = 0x00;
            System.arraycopy(trimmed, 0, prefixed, 1, trimmed.length);
            return prefixed;
        }
        return trimmed;
    }

    private static byte[] copyOfRange(byte[] source, int from, int to) {
        byte[] copy = new byte[to - from];
        System.arraycopy(source, from, copy, 0, copy.length);
        return copy;
    }

    public static String publicKeyToBase64(PublicKey publicKey) {
        return Base64.getEncoder().encodeToString(publicKey.getEncoded());
    }

    public static String privateKeyToBase64(PrivateKey privateKey) {
        return Base64.getEncoder().encodeToString(privateKey.getEncoded());
    }

    public static PublicKey publicKeyFromBase64(String publicKeyBase64) {
        try {
            byte[] keyBytes = Base64.getDecoder().decode(publicKeyBase64);
            X509EncodedKeySpec spec = new X509EncodedKeySpec(keyBytes);
            KeyFactory keyFactory = KeyFactory.getInstance("EC", "BC");
            return keyFactory.generatePublic(spec);
        } catch (Exception e) {
            throw new RuntimeException("Erreur conversion clé publique", e);
        }
    }

    public static PrivateKey privateKeyFromBase64(String privateKeyBase64) {
        try {
            byte[] keyBytes = Base64.getDecoder().decode(privateKeyBase64);
            PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(keyBytes);
            KeyFactory keyFactory = KeyFactory.getInstance("EC", "BC");
            return keyFactory.generatePrivate(spec);
        } catch (Exception e) {
            throw new RuntimeException("Erreur conversion clé privée", e);
        }
    }

    public static String addressFromPublicKey(PublicKey publicKey) {
        String publicKeyBase64 = publicKeyToBase64(publicKey);
        String hash = sha256(publicKeyBase64);
        return hash.substring(0, 40);
    }
}