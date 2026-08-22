import { Block, BlockTransaction } from '@blockchain/models/block.model';
import { ExplorerBlocksResponse } from '@explorer/models/explorer-blocks.model';

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

/** Pastilles par colonne dans le graphe en onde. */
export const CHAIN_GRAPH_COL_SIZE = 5;
/** Colonnes visibles sans scroll horizontal. */
export const CHAIN_GRAPH_VISIBLE_COLS = 9;
export const CHAIN_GRAPH_NODE_RADIUS = 5;
export const CHAIN_GRAPH_COL_GAP = 28;
export const CHAIN_GRAPH_ROW_GAP = 20;
export const CHAIN_GRAPH_PAD_X = 8;
export const CHAIN_GRAPH_PAD_Y = 8;
/** Zone cliquable autour de la pastille. */
export const CHAIN_GRAPH_HIT_RADIUS = 8;

export function chainGraphColumnCount(nodeCount: number): number {
  return Math.max(1, Math.ceil(Math.max(nodeCount, 1) / CHAIN_GRAPH_COL_SIZE));
}

export function chainGraphPointForIndex(index: number): { x: number; y: number } {
  const col = Math.floor(index / CHAIN_GRAPH_COL_SIZE);
  const posInCol = index % CHAIN_GRAPH_COL_SIZE;
  const goingDown = col % 2 === 0;
  const row = goingDown ? posInCol : CHAIN_GRAPH_COL_SIZE - 1 - posInCol;

  return {
    x: CHAIN_GRAPH_PAD_X + col * CHAIN_GRAPH_COL_GAP,
    y: CHAIN_GRAPH_PAD_Y + row * CHAIN_GRAPH_ROW_GAP,
  };
}

export function chainGraphDimensions(nodeCount: number): { width: number; height: number } {
  const cols = chainGraphColumnCount(nodeCount);
  // Largeur calibrée pour 9 colonnes visibles ; s’étend au-delà si plus de colonnes.
  const widthCols = Math.max(cols, CHAIN_GRAPH_VISIBLE_COLS);

  return {
    width: Math.max(
      CHAIN_GRAPH_PAD_X * 2,
      CHAIN_GRAPH_PAD_X + (widthCols - 1) * CHAIN_GRAPH_COL_GAP + CHAIN_GRAPH_PAD_X
    ),
    height: CHAIN_GRAPH_PAD_Y * 2 + (CHAIN_GRAPH_COL_SIZE - 1) * CHAIN_GRAPH_ROW_GAP,
  };
}

/** Largeur CSS min (%) pour afficher 9 colonnes avant le scroll. */
export function chainGraphMinWidthPercent(nodeCount: number): number {
  const cols = chainGraphColumnCount(nodeCount);
  if (cols <= CHAIN_GRAPH_VISIBLE_COLS) {
    return 100;
  }
  return (cols / CHAIN_GRAPH_VISIBLE_COLS) * 100;
}

export function chainGraphLinkSegment(
  from: { x: number; y: number },
  to: { x: number; y: number },
  radius = CHAIN_GRAPH_NODE_RADIUS
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;

  return {
    x1: from.x + ux * radius,
    y1: from.y + uy * radius,
    x2: to.x - ux * radius,
    y2: to.y - uy * radius,
  };
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
