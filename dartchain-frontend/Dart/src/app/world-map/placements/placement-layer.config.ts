export const PLACEMENTS_LAYER_CONFIG = {
  enabled: true,
  dragThresholdPx: 6,
  hitWidth: 2.4,
  hitHeight: 2.2,
  hitDepth: 0.38,
} as const;

export const PLACEMENT_STATUS_COLOR: Record<string, number> = {
  available: 0x8a95a5,
  reserved: 0x7b0d1e,
  active: 0xd5a021,
  paused: 0x7b0d1e,
  expired: 0x8a95a5,
  unavailable: 0x8a95a5,
};
