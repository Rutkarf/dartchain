export interface BlockTransaction {
  id: string;
  sender: string;
  recipient: string;
  amount: number;
  timestamp: number;
  signature: string;
  systemReward?: boolean;
  payload?: string;
}

export interface Block {
  index: number;
  previousHash: string;
  timestamp: number;
  data: string | null;
  nonce: number;
  hash: string;
  difficulty?: number;
  transactions?: BlockTransaction[];
}