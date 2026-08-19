export type M4T3RRewardStatus =
  | 'PENDING'
  | 'VALIDATED'
  | 'CREDITED_OFFCHAIN'
  | 'QUEUED_ONCHAIN'
  | 'SUBMITTED_ONCHAIN'
  | 'CONFIRMED_ONCHAIN'
  | 'REJECTED'
  | 'DUPLICATE'
  | 'REVOKED';

export interface M4T3RReward {
  rewardId: string;
  collectionId: string;
  tokenId: string;
  amount: string;
  playerSpeed: string;
  maxAllowedSpeed: string;
  status: M4T3RRewardStatus;
  proofHash: string;
  serverSignature: string;
  transactionId?: string;
  collectedAt: number;
}

export interface M4T3RRewardHistoryItem {
  rewardId: string;
  tokenId: string;
  amount: string;
  playerSpeed: string;
  status: string;
  proofHash: string;
  transactionId?: string;
  collectedAt: string;
}

export interface M4T3RTokenIdentity {
  tokenId: string;
  chunkId: string;
  gridX: number;
  gridZ: number;
  worldPosition: { x: number; y: number; z: number };
  generationSeed: string;
  cycle: number;
}
