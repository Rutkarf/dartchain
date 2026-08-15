/**
 * Star Conquest — modèle Quest (frontend-first, prêt API Spring Boot).
 */

import type { StarQuestFamily } from './star-conquest-families';

export type { StarQuestFamily };

export type StarQuestStatus =
  | 'available'
  | 'locked'
  | 'active'
  | 'completed'
  | 'future';

export type StarQuestRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type StarQuestCategory =
  | 'swap'
  | 'showcase'
  | 'dock'
  | 'graph'
  | 'three'
  | 'angular'
  | 'backend'
  | 'performance'
  | 'security'
  | 'ux'
  | 'a11y'
  | 'responsive'
  | 'tests'
  | 'gamification'
  | 'data'
  | 'quality';

/** Slot normalisé dans la bande interactive (u=horizontal, v=vertical 0 haut→1 bas). */
export interface StarQuestSlot {
  u: number;
  v: number;
  /** Profondeur relative [-1, 1] pour le parallaxe léger. */
  depth?: number;
}

export interface StarQuestPosition {
  x: number;
  y: number;
  z: number;
}

export interface StarQuest {
  id: string;
  title: string;
  category: StarQuestCategory;
  /** Famille visuelle (1 parmi 5) — couleur particules / liens / panneau. */
  family: StarQuestFamily;
  description: string;
  rewardM4T3R: number;
  rarity: StarQuestRarity;
  status: StarQuestStatus;
  /** Toujours true pour les Quests interactives du catalogue. */
  interactive: true;
  /**
   * Racines sous le floor Three.js (axe vertical bas) —
   * la constellation part de ces nœuds.
   */
  underFloor?: boolean;
  /**
   * Racines sous le composant Graph (bande graph repliée) —
   * démarrage visible derrière / sous app-graph.
   */
  underGraph?: boolean;
  connections: string[];
  /** Placement relatif (u horizontal ; v dérivé du gain au layout). */
  slot: StarQuestSlot;
  /** Position monde recalculée au layout (runtime). */
  position: StarQuestPosition;
}

export interface StarQuestPanelState {
  quest: StarQuest;
  x: number;
  y: number;
}

export const STAR_QUEST_CATEGORY_LABEL: Record<StarQuestCategory, string> = {
  swap: 'Swap',
  showcase: 'Showcase',
  dock: 'Dock',
  graph: 'Graph',
  three: 'Three.js',
  angular: 'Angular',
  backend: 'Backend',
  performance: 'Perf',
  security: 'Sécurité',
  ux: 'UX',
  a11y: 'A11y',
  responsive: 'Responsive',
  tests: 'Tests',
  gamification: 'Game',
  data: 'Data',
  quality: 'Qualité',
};
