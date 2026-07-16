import { Block, BlockTransaction } from '../../core/models/block.model';
import { ExplorerBlocksResponse } from '../../core/models/explorer-blocks.model';

export type { ExplorerBlocksResponse };

export interface ChainExplorerFilters {
  searchQuery: string;
  wallet: string;
  fromIndex: number | null;
  toIndex: number | null;
}

export function applyChainFilters(blocks: Block[], filters: ChainExplorerFilters): Block[] {
  const search = filters.searchQuery.trim().toLowerCase();
  const wallet = filters.wallet.trim().toLowerCase();

  return blocks.filter((block) => {
    if (filters.fromIndex != null && block.index < filters.fromIndex) {
      return false;
    }

    if (filters.toIndex != null && block.index > filters.toIndex) {
      return false;
    }

    if (wallet && !blockInvolvesWallet(block, wallet)) {
      return false;
    }

    if (!search) {
      return true;
    }

    const haystack = [
      block.index,
      block.hash,
      block.previousHash,
      block.data,
      block.transactions?.length ?? 0,
    ]
      .filter((value) => value !== null && value !== undefined)
      .join(' ')
      .toLowerCase();

    return haystack.includes(search);
  });
}

export function sortBlocksDescending(blocks: Block[]): Block[] {
  return [...blocks].sort((left, right) => right.index - left.index);
}

export function sortBlocksAscending(blocks: Block[]): Block[] {
  return [...blocks].sort((left, right) => left.index - right.index);
}

export function buildChainGraphNodes(blocks: Block[], maxNodes = 20): Block[] {
  const ascending = sortBlocksAscending(blocks);
  if (ascending.length <= maxNodes) {
    return ascending;
  }

  const genesis = ascending[0];
  const tail = ascending.slice(-(maxNodes - 1));
  return [genesis, ...tail.filter((block) => block.index !== genesis.index)];
}

export function downloadBlocksJson(blocks: Block[], filename = 'dartchain-blocks.json'): void {
  const payload = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      total: blocks.length,
      blocks,
    },
    null,
    2
  );

  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function blockInvolvesWallet(block: Block, wallet: string): boolean {
  return (block.transactions ?? []).some((transaction: BlockTransaction) => {
    const sender = transaction.sender?.toLowerCase() ?? '';
    const recipient = transaction.recipient?.toLowerCase() ?? '';
    return sender.includes(wallet) || recipient.includes(wallet);
  });
}
