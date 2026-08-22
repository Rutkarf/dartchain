export const LANDMARK_HEIGHT_QUALITY = {
  'mirror-adjacent-building-01': 'APPROXIMATE',
  'mirror-adjacent-building-02': 'APPROXIMATE',
  'harbor-west-building': 'APPROXIMATE',
  'harbor-east-building': 'APPROXIMATE',
} as const;

export const ARCADES_WEST_PROVENANCE = {
  id: 'vieux-port-arcades-west',
  sourceQuality: 'APPROXIMATE',
  source: 'osm-quai-du-port-estimated',
  notes: 'Spawn arcade massing is estimated, not an OSM way ring. Do not present as cadastre.',
} as const;
