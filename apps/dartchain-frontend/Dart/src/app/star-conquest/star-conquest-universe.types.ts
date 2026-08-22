/** Identifiants des 10 univers spatiaux Star Conquest (100 % autonomes, sans lien metaverse floor). */
export type StarConquestUniverseId =
  | 'stellar-nebula'
  | 'synaptic-cortex'
  | 'orbital-p2p'
  | 'm4t3r-grid'
  | 'zodiac-constellation'
  | 'p2p-aurora'
  | 'agent-swarm'
  | 'nexus-portal'
  | 'conquest-timeline'
  | 'galaxy-graph';

export type StarConquestPeerLayout =
  | 'ring'
  | 'orbital-rings'
  | 'spiral'
  | 'grid'
  | 'timeline-z'
  | 'swarm-orbit'
  | 'nebula-cluster'
  | 'galaxy-spiral';

export type StarConquestEffectKind =
  | 'none'
  | 'nebula-clouds'
  | 'synaptic-pulse'
  | 'orbital-rings'
  | 'm4t3r-grid'
  | 'zodiac-guides'
  | 'aurora-waves'
  | 'agent-swarm'
  | 'nexus-portal'
  | 'timeline-axis'
  | 'galaxy-spiral';

export interface StarConquestUniverseTheme {
  id: StarConquestUniverseId;
  label: string;
  shortLabel: string;
  description: string;
  /** Couleur de fond CSS (dégradé radial via --sc-universe-bg). */
  bgCenter: string;
  bgEdge: string;
  /** Teinte aurora / nébuleuse [r,g,b] 0–1. */
  auroraRgb: readonly [number, number, number];
  auroraSecondaryRgb: readonly [number, number, number];
  peerLayout: StarConquestPeerLayout;
  effectKind: StarConquestEffectKind;
  showConstellations: boolean;
  showNeuralLinks: boolean;
  showDepthStars: boolean;
  /** Multiplicateurs visuels particules quests. */
  coreOpacity: number;
  haloOpacity: number;
  coreSizeMult: number;
  haloSizeMult: number;
  linkOpacity: number;
  constellationOpacity: number;
  driftSpeedMult: number;
  /** Couches depth far/mid/near — counts override. */
  depthFarCount: number;
  depthMidCount: number;
  depthNearCount: number;
}
