export interface Transaction {
  id: string;
  sender: string;
  recipient: string;
  amount: number;
  timestamp: number;
  signature: string;
  systemReward?: boolean;
  payload?: string;
}

export interface PendingTransaction {
  id: string;
  hash?: string;
  data?: string;
  createdAt?: number;
  sender?: string;
  recipient?: string;
  amount?: number;
  timestamp?: number;
  signature?: string;
  systemReward?: boolean;
  payload?: string;
}

export interface WalletResponse {
  address: string;
  publicKey: string;
  privateKey: string;
}

export interface BalanceResponse {
  address: string;
  balance: number;
}

export interface CreateTransactionRequest {
  senderAddress: string;
  senderPublicKey: string;
  senderPrivateKey: string;
  recipientAddress: string;
  amount: number;
}

export interface MinePendingTransactionsRequest {
  minerAddress: string;
}