/** Modèle joueur local — assets/characters (servis via angular.json). */
export const CHARACTER_ASSETS = {
  fbx: [
    'assets/characters/CharacterAnon.fbx',
    '/assets/characters/CharacterAnon.fbx',
  ],
  stl: [
    'assets/characters/CharacterAnon.stl',
    '/assets/characters/CharacterAnon.stl',
  ],
  fallbackStl: [
    'assets/characters/default-character.stl',
    '/assets/characters/default-character.stl',
  ],
  targetHeight: 2.8,
  /** Hauteur des pieds au-dessus du sol walkable (m). */
  footClearanceMeters: 0.14,
  /** Relevage du mesh après alignement bbox (pieds Mixamo souvent sous la bbox). */
  plantLiftMeters: 0.06,
} as const;

export function isCharacterStlPath(path: string): boolean {
  return path.toLowerCase().endsWith('.stl');
}

export function isCharacterFbxPath(path: string): boolean {
  return path.toLowerCase().endsWith('.fbx');
}
