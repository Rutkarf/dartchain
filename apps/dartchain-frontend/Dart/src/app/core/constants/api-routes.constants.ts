/**
 * Chemins API canoniques — préférer /api/v1/* pour les lectures versionnées.
 */
export const API_ROUTES = {
  blocks: '/blocks',
  blocksLatest: '/blocks/latest',
  blockchainBlocks: '/blockchain/blocks',
  blockchainStats: '/blockchain/stats',
  blockchainStatsV1: '/v1/blockchain/stats',
  pendingTransactions: '/pending-transactions',
  blockchainPendingV1: '/v1/blockchain/pending',
  blockchainValid: '/blockchain/valid',
  blockchainMine: '/blockchain/mine',
  walletsVerify: '/wallets/verify',
  walletsCreateClient: '/wallets/create-client',
} as const;
