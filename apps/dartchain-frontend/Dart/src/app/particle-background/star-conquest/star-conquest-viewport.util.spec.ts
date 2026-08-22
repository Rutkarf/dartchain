import { describe, expect, it } from 'vitest';

import {
  SC_LAYOUT_H,
  SC_LAYOUT_W,
  starConquestRenderSize,
} from './star-conquest-viewport.util';

describe('star-conquest-viewport 250×550', () => {
  it('verrouille le buffer render sur 250×550', () => {
    expect(starConquestRenderSize()).toEqual({ width: 250, height: 550 });
    expect(SC_LAYOUT_W).toBe(250);
    expect(SC_LAYOUT_H).toBe(550);
  });
});
