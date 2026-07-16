import { describe, expect, it } from 'vitest';

import { Block } from '../../core/models/block.model';
import {
  applyChainFilters,
  buildChainGraphNodes,
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
});
