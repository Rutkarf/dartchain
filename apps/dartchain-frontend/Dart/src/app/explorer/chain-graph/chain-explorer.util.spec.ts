import { describe, expect, it } from 'vitest';

import { Block } from '@blockchain/models/block.model';
import {
  applyChainFilters,
  buildChainGraphNodes,
  chainGraphDimensions,
  chainGraphLinkSegment,
  chainGraphMinWidthPercent,
  chainGraphPointForIndex,
  CHAIN_GRAPH_COL_SIZE,
  CHAIN_GRAPH_PAD_Y,
  CHAIN_GRAPH_ROW_GAP,
  CHAIN_GRAPH_VISIBLE_COLS,
  sortBlocksAscending,
} from './chain-explorer.util';

function block(index: number): Block {
  return {
    index,
    previousHash: index === 0 ? '0' : `hash-${index - 1}`,
    timestamp: index,
    data: `block-${index}`,
    nonce: 0,
    hash: `hash-${index}`,
    transactions: index === 1 ? [{ id: '1', sender: 'alice', recipient: 'bob', amount: 1, timestamp: 1, signature: 'sig' }] : [],
  };
}

describe('chain-explorer.util', () => {
  it('filters by wallet and height range', () => {
    const blocks = [block(0), block(1), block(2)];

    const filtered = applyChainFilters(blocks, {
      searchQuery: '',
      wallet: 'alice',
      fromIndex: 1,
      toIndex: 2,
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].index).toBe(1);
  });

  it('builds graph nodes with genesis preserved', () => {
    const blocks = Array.from({ length: 25 }, (_, index) => block(index));
    const nodes = buildChainGraphNodes(blocks, 20);

    expect(nodes[0].index).toBe(0);
    expect(nodes).toHaveLength(20);
    expect(sortBlocksAscending(nodes).at(-1)?.index).toBe(24);
  });

  it('lays out chain graph as a vertical wave of 5 pastilles per column', () => {
    const p0 = chainGraphPointForIndex(0);
    const p4 = chainGraphPointForIndex(4);
    const p5 = chainGraphPointForIndex(5);
    const p9 = chainGraphPointForIndex(9);
    const p10 = chainGraphPointForIndex(10);
    const p14 = chainGraphPointForIndex(14);

    // Colonne 1 : descend
    expect(p0.x).toBe(p4.x);
    expect(p4.y).toBeGreaterThan(p0.y);

    // Colonne 2 : remonte (6 en bas, 10 en haut)
    expect(p5.x).toBeGreaterThan(p4.x);
    expect(p5.y).toBe(p4.y);
    expect(p9.x).toBe(p5.x);
    expect(p9.y).toBe(p0.y);

    // Colonne 3 : redescend (11 en haut)
    expect(p10.x).toBeGreaterThan(p9.x);
    expect(p10.y).toBe(p0.y);
    expect(p14.y).toBe(p4.y);

    const bottomBridge = chainGraphLinkSegment(p4, p5);
    expect(bottomBridge.y1).toBeCloseTo(p4.y, 5);
    expect(bottomBridge.y2).toBeCloseTo(p5.y, 5);
    expect(bottomBridge.x2).toBeGreaterThan(bottomBridge.x1);

    const topBridge = chainGraphLinkSegment(p9, p10);
    expect(topBridge.y1).toBeCloseTo(p9.y, 5);
    expect(topBridge.y2).toBeCloseTo(p10.y, 5);
    expect(topBridge.x2).toBeGreaterThan(topBridge.x1);

    const size = chainGraphDimensions(20);
    expect(size.width).toBeGreaterThan(size.height * 0.5);
    expect(size.height).toBe(
      CHAIN_GRAPH_PAD_Y * 2 + (CHAIN_GRAPH_COL_SIZE - 1) * CHAIN_GRAPH_ROW_GAP
    );

    expect(chainGraphMinWidthPercent(CHAIN_GRAPH_VISIBLE_COLS * CHAIN_GRAPH_COL_SIZE)).toBe(100);
    expect(chainGraphMinWidthPercent(CHAIN_GRAPH_VISIBLE_COLS * CHAIN_GRAPH_COL_SIZE + 1)).toBeGreaterThan(
      100
    );
  });
});
