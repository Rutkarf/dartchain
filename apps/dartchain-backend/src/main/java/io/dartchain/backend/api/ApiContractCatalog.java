package io.dartchain.backend.api;

import io.dartchain.backend.config.ApiRoutes;

import java.util.List;

/**
 * Phase AA — catalogue de contrat API natif (maintenu dans le dépôt, sans OpenAPI/Swagger).
 */
public final class ApiContractCatalog {

    private ApiContractCatalog() {
    }

    public static ApiContractV1Response build() {
        return new ApiContractV1Response(
                "0.17.0",
                "v1",
                "application/problem+json",
                "Les routes /api/* legacy restent actives avec en-têtes Deprecation.",
                List.of(
                        endpoint("GET", ApiRoutes.OPS_SNAPSHOT_V1, true, "Snapshot observabilité native (ADMIN, panel admin)"),
                        endpoint("GET", ApiRoutes.CHAIN_CONFIG_V1, false, "Métadonnées chaîne native EVM-compatible"),
                        endpoint("POST", ApiRoutes.WALLETS_GENERATE_EVM_V1, false, "Générer wallet secp256k1 (dev/démo)"),
                        endpoint("GET", ApiRoutes.HEALTH_V1, false, "Santé et flags produit"),
                        endpoint("GET", ApiRoutes.CONTRACT_V1, false, "Ce catalogue de contrat"),
                        endpoint("POST", ApiRoutes.AUTH_REGISTER_V1, false, "Inscription utilisateur"),
                        endpoint("POST", ApiRoutes.AUTH_LOGIN_V1, false, "Connexion (identifier + password)"),
                        endpoint("POST", ApiRoutes.AUTH_REFRESH_V1, false, "Renouveler access token (refreshToken)"),
                        endpoint("POST", ApiRoutes.AUTH_LOGOUT_V1, true, "Déconnexion session Bearer"),
                        endpoint("GET", ApiRoutes.AUTH_ME_V1, true, "Profil utilisateur courant"),
                        endpoint("PUT", ApiRoutes.AUTH_LINK_WALLET_V1, true, "Lier un wallet au compte"),
                        endpoint("GET", ApiRoutes.BLOCKCHAIN_CHAIN_V1, false, "Chaîne complète"),
                        endpoint("GET", ApiRoutes.BLOCKCHAIN_STATS_V1, false, "Statistiques blockchain"),
                        endpoint("GET", ApiRoutes.BLOCKCHAIN_VALID_V1, false, "Validité de la chaîne"),
                        endpoint("GET", ApiRoutes.BLOCKCHAIN_BLOCKS_V1, false, "Liste des blocs"),
                        endpoint("GET", ApiRoutes.BLOCKCHAIN_BLOCKS_LATEST_V1, false, "Dernier bloc"),
                        endpoint("GET", ApiRoutes.BLOCKCHAIN_PENDING_V1, false, "Transactions en attente"),
                        endpoint("GET", ApiRoutes.EXPLORER_SEARCH_V1, false, "Recherche explorer (param q)"),
                        endpoint("GET", ApiRoutes.EXPLORER_BLOCKS_V1, false, "Blocs filtrés (wallet, from, to, limit)")
                )
        );
    }

    private static ApiContractEndpoint endpoint(
            String method,
            String path,
            boolean authRequired,
            String description
    ) {
        return new ApiContractEndpoint(method, path, authRequired, description);
    }
}
