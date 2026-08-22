export const PLACEMENTS_LAYER_CONFIG = {
  enabled: true,
  dragThresholdPx: 6,
  hitWidth: 2.4,
  hitHeight: 2.2,
  hitDepth: 0.38,
} as const;

export const PLACEMENT_STATUS_COLOR: Record<string, number> = {
  available: 0x40e0ff,
  reserved: 0xffb347,
  active: 0xffe600,
  paused: 0xff3ecf,
  expired: 0x8f9bb3,
  unavailable: 0x5a6573,
};
