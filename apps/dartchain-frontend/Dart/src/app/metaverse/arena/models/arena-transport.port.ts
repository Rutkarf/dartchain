import type { ArenaEliminationResult, PlayerGameState, Vec3 } from './player-game-state.model';

/**
 * Abstraction multijoueur (Q2=A→B).
 * MVP : mock local. Futur : WebSocket `/ws/metaverse-arena` sans toucher live/chat/peers.
 */
export abstract class ArenaTransportPort {
  abstract connect(localPlayer: PlayerGameState): void;
  abstract disconnect(): void;
  abstract publishPose(userId: string, position: Vec3, rotation: Vec3): void;
  abstract requestElimination(input: {
    eventId: string;
    killerUserId: string;
    victimUserId: string;
    lootMultiplier?: number;
  }): Promise<ArenaEliminationResult>;
  abstract listRemotePlayers(): PlayerGameState[];
}
