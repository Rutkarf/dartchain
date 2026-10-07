export type TokenCellState = 'hidden' | 'available' | 'collected' | 'reserved';

export interface TokenCell {
  id: string;
  chunkId: string;
  gridX: number;
  gridZ: number;
  worldPosition: {
    x: number;
    y: number;
    z: number;
  };
  state: TokenCellState;
  tokenType: 'R4V3';
}

export interface TokenCollectionRequest {
  cellId: string;
  playerId: string;
  timestamp: number;
}

export function tokenCellId(gridX: number, gridZ: number): string {
  return `r4v3:${gridX}:${gridZ}`;
}
