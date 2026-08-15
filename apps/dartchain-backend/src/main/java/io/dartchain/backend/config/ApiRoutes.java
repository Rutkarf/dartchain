package io.dartchain.backend.config;

/**
 * Chemins API canoniques (Phase K) et versionnés (Phase AA).
 * Les alias legacy restent exposés pour compatibilité — préférer {@code /api/v1/*}.
 */
public final class ApiRoutes {

    public static final String API_V1_PREFIX = "/api/v1";

    public static final String PENDING_TRANSACTIONS = "/api/pending-transactions";
    public static final String BLOCKCHAIN_STATS = "/api/blockchain/stats";
    public static final String BLOCKCHAIN_VALID = "/api/blockchain/valid";
    public static final String BLOCKS = "/api/blocks";

    /** Phase M — vérification address ↔ publicKey */
    public static final String WALLETS_VERIFY = "/api/wallets/verify";

    /** Phase M — enregistrement wallet généré côté client */
    public static final String WALLETS_CREATE_CLIENT = "/api/wallets/create-client";

    /** Phase N — routes soumises au rate limit (voir {@link RateLimitProperties#defaultPaths()}) */
    public static final String RATE_LIMIT_SWAP = "/api/exchange-panel/swap";
    public static final String RATE_LIMIT_BLOCKCHAIN_MINE = "/api/blockchain/mine";
    public static final String RATE_LIMIT_SHOWCASE_CHAT = "/api/showcase/chat/messages";

    /** Phase X — snapshot métriques natives (futur panel admin) */
    public static final String OPS_SNAPSHOT = "/api/ops/snapshot";

    /** Phase AE — snapshot métriques versionné */
    public static final String OPS_SNAPSHOT_V1 = API_V1_PREFIX + "/ops/snapshot";

    /** Phase Z — health versionné */
    public static final String HEALTH_V1 = API_V1_PREFIX + "/health";

    /** Phase AA — contrat API natif (sans outil tiers) */
    public static final String CONTRACT_V1 = API_V1_PREFIX + "/contract";

    public static final String AUTH_V1_PREFIX = API_V1_PREFIX + "/auth";
    public static final String AUTH_REGISTER_V1 = AUTH_V1_PREFIX + "/register";
    public static final String AUTH_LOGIN_V1 = AUTH_V1_PREFIX + "/login";
    public static final String AUTH_REFRESH_V1 = AUTH_V1_PREFIX + "/refresh";
    public static final String AUTH_LOGOUT_V1 = AUTH_V1_PREFIX + "/logout";
    public static final String AUTH_ME_V1 = AUTH_V1_PREFIX + "/me";
    public static final String AUTH_LINK_WALLET_V1 = AUTH_V1_PREFIX + "/me/wallet";

    public static final String BLOCKCHAIN_V1_PREFIX = API_V1_PREFIX + "/blockchain";
    public static final String BLOCKCHAIN_CHAIN_V1 = BLOCKCHAIN_V1_PREFIX + "/chain";
    public static final String BLOCKCHAIN_STATS_V1 = BLOCKCHAIN_V1_PREFIX + "/stats";
    public static final String BLOCKCHAIN_VALID_V1 = BLOCKCHAIN_V1_PREFIX + "/valid";
    public static final String BLOCKCHAIN_BLOCKS_V1 = BLOCKCHAIN_V1_PREFIX + "/blocks";
    public static final String BLOCKCHAIN_BLOCKS_LATEST_V1 = BLOCKCHAIN_V1_PREFIX + "/blocks/latest";
    public static final String BLOCKCHAIN_PENDING_V1 = BLOCKCHAIN_V1_PREFIX + "/pending";

    public static final String EXPLORER_V1_PREFIX = API_V1_PREFIX + "/explorer";
    public static final String EXPLORER_SEARCH_V1 = EXPLORER_V1_PREFIX + "/search";
    public static final String EXPLORER_BLOCKS_V1 = EXPLORER_V1_PREFIX + "/blocks";

    public static final String CHAIN_V1_PREFIX = API_V1_PREFIX + "/chain";
    public static final String CHAIN_CONFIG_V1 = CHAIN_V1_PREFIX + "/config";

    public static final String WALLETS_V1_PREFIX = API_V1_PREFIX + "/wallets";
    public static final String WALLETS_GENERATE_EVM_V1 = WALLETS_V1_PREFIX + "/generate-evm";

    /** Character NFT (1 mesh .stl / user) — mint blockchain ultérieur. */
    public static final String CHARACTERS_V1_PREFIX = API_V1_PREFIX + "/characters";
    public static final String CHARACTERS_ME_V1 = CHARACTERS_V1_PREFIX + "/me";

    private ApiRoutes() {
    }
}
