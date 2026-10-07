export type ExplorerResultKind = 'BLOCK' | 'TRANSACTION' | 'PENDING' | 'ADDRESS';

export interface ExplorerSearchResult {
  kind: ExplorerResultKind;
  label: string;
  subtitle: string;
  blockIndex: number | null;
  blockHash: string | null;
  transactionId: string | null;
  address: string | null;
  balance: number | null;
}

export interface ExplorerSearchResponse {
  query: string;
  results: ExplorerSearchResult[];
}
