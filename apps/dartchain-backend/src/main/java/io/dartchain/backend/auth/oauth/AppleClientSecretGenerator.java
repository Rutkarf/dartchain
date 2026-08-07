package io.dartchain.backend.auth.oauth;

import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.ECDSASigner;
import com.nimbusds.jose.jwk.Curve;
import com.nimbusds.jose.jwk.ECKey;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import io.dartchain.backend.auth.AuthException;
import io.dartchain.backend.config.OAuthProperties;

import java.security.interfaces.ECPrivateKey;
import java.time.Instant;
import java.util.Date;

final class AppleClientSecretGenerator {

    private AppleClientSecretGenerator() {
    }

    static String generate(OAuthProperties.AppleProvider apple) {
        try {
            ECKey ecKey = ECKey.parse(apple.normalizedPrivateKey());
            ECPrivateKey privateKey = ecKey.toECPrivateKey();

            Instant now = Instant.now();
            JWTClaimsSet claims = new JWTClaimsSet.Builder()
                    .issuer(apple.getTeamId())
                    .issueTime(Date.from(now))
                    .expirationTime(Date.from(now.plusSeconds(3600)))
                    .audience("https://appleid.apple.com")
                    .subject(apple.getClientId())
                    .build();

            SignedJWT signedJwt = new SignedJWT(
                    new JWSHeader.Builder(JWSAlgorithm.ES256)
                            .keyID(apple.getKeyId())
                            .type(JOSEObjectType.JWT)
                            .build(),
                    claims
            );
            signedJwt.sign(new ECDSASigner(privateKey));
            return signedJwt.serialize();
        } catch (Exception exception) {
            throw new AuthException(500, "Impossible de générer le secret client Apple");
        }
    }
}
