package io.dartchain.backend.faucet;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** 1 m4t3r = 10^-26 R4V3. Le compteur UI est cet entier, pas le montant R4V3. */
public final class M4t3rUnitCount {

    public static final int SCALE = 26;

    private M4t3rUnitCount() {
    }

    public static String of(BigDecimal r4v3Amount) {
        if (r4v3Amount == null || r4v3Amount.signum() <= 0) {
            return "0";
        }
        return r4v3Amount.movePointRight(SCALE).setScale(0, RoundingMode.DOWN).toPlainString();
    }
}
