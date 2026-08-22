import { Block } from '@blockchain/models/block.model';

export interface ExplorerBlocksResponse {
  wallet: string | null;
  fromIndex: number | null;
  toIndex: number | null;
  total: number;
  blocks: Block[];
}
