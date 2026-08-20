export const MARSEILLE_ATMOSPHERE_PRESETS = {
  currentGameplay: {
    id: 'current-gameplay',
    fogEnabled: false,
    fogDensity: 0,
    nightShift: false,
  },
  nightHarbor: {
    id: 'night-harbor',
    fogEnabled: true,
    fogDensity: 0.008,
    nightShift: true,
  },
} as const;

export const ACTIVE_ATMOSPHERE_PRESET_ID = 'currentGameplay' as const;

export function activeAtmospherePreset() {
  return MARSEILLE_ATMOSPHERE_PRESETS[ACTIVE_ATMOSPHERE_PRESET_ID];
}
