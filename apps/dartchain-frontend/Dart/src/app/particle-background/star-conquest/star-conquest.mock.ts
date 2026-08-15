import { familyFromCategory } from './star-conquest-families';
import type {
  StarQuest,
  StarQuestCategory,
  StarQuestFamily,
  StarQuestRarity,
  StarQuestStatus,
} from './star-conquest.model';

type QuestSeed = {
  id: string;
  title: string;
  category: StarQuestCategory;
  family?: StarQuestFamily;
  description: string;
  rewardM4T3R: number;
  rarity: StarQuestRarity;
  status: StarQuestStatus;
  connections: string[];
  /** u = horizontal ; v ignoré au layout (dérivé du gain). */
  slot: { u: number; v?: number; depth?: number };
  /** Racine interactive sous le floor (exactement 3). */
  underFloor?: boolean;
  /** Racine interactive sous app-graph (exactement 3, départ replié). */
  underGraph?: boolean;
};

/**
 * 15 Quests retirées du catalogue v50 → v35 (3 par axe famille / redondance).
 * Raisons : redondance produit, faible impact 250×550, ou couverture par une Quest retenue.
 */
export const STAR_CONQUEST_REMOVED_QUESTS: readonly {
  id: string;
  reason: string;
}[] = [
  {
    id: 'sc-navbar-ticker',
    reason: 'Impact faible à 250px ; collision visuelle avec CTA wallet — couvert par responsive + toasts.',
  },
  {
    id: 'sc-ux-empty',
    reason: 'Trop vague ; empty states absorbés par skeletons Swap et densités Showcase.',
  },
  {
    id: 'sc-a11y-live',
    reason: 'Redondant avec focus shell + feedback news ; fusionné dans sc-a11y-focus.',
  },
  {
    id: 'sc-showcase-news',
    reason: 'Badge news moins critique que Chat/DAO pour la conquête produit.',
  },
  {
    id: 'sc-showcase-tabs',
    reason: 'Mémoire d’onglet faible ROI vs interactions Showcase prioritaires.',
  },
  {
    id: 'sc-showcase-launch',
    reason: 'A11y launch formée dans sc-a11y-focus ; évite doublon formulaire.',
  },
  {
    id: 'sc-graph-token-search',
    reason: 'Inutilisable en densité réelle à 250px de large — priorité Graph alerts/chart.',
  },
  {
    id: 'sc-graph-health',
    reason: 'Fusionné dans sc-graph monitoring via sc-angular-layout + sc-dock-chain.',
  },
  {
    id: 'sc-dock-peers',
    reason: 'Priorité Dock = wallet / faucet / mempool / quests sync.',
  },
  {
    id: 'sc-angular-signals',
    reason: 'Audit meta non user-facing ; layout zones reste le levier Angular.',
  },
  {
    id: 'sc-swap-skeleton',
    reason: 'Couvert par piste Swap confirm + slippage (UX exchange).',
  },
  {
    id: 'sc-security-peers',
    reason: 'Niche ; auth + wallet mask + tx preview couvrent la surface critique.',
  },
  {
    id: 'sc-data-peers',
    reason: 'Redondant avec poll chain + rates ; budget réseau unifié.',
  },
  {
    id: 'sc-data-showcase-api',
    reason: 'Fallbacks Showcase absorbés par sc-backend-faucet + sc-data-rates.',
  },
  {
    id: 'sc-quality-lint',
    reason: 'Chore SCSS faible valeur conquête ; docs + tests restent prioritaires.',
  },
];

/**
 * 35 Quests (7 × 5 familles) — ancrées Navbar/Swap/Showcase/Dock/Graph,
 * Three floor, wallet/M4T3R, Spring Boot futur, QA & gamification.
 * Gains élevés → haut de zone interactive (layout runtime).
 */
const SEEDS: readonly QuestSeed[] = [
  // ——— Interface (7) ———
  {
    id: 'sc-responsive-250',
    title: 'Lock 250×550',
    category: 'responsive',
    family: 'interface',
    description:
      'Garantir zero-scroll et zero overflow horizontal sur le shell à 250×550 : Navbar, Swap, Showcase, Dock, Graph.',
    rewardM4T3R: 220,
    rarity: 'legendary',
    status: 'active',
    connections: ['sc-angular-layout', 'sc-a11y-focus', 'sc-three-floor-peek'],
    slot: { u: 0.52, depth: 0.15 },
  },
  {
    id: 'sc-angular-layout',
    title: 'Layout Zone Tokens',
    category: 'angular',
    family: 'interface',
    description:
      'Stabiliser ui-layout-zones + tokens --ds-zone-* pour que les panneaux dépliés ne volent jamais l’espace Quests.',
    rewardM4T3R: 180,
    rarity: 'epic',
    status: 'available',
    connections: ['sc-responsive-250', 'sc-three-floor-peek', 'sc-showcase-dao'],
    slot: { u: 0.78, depth: -0.2 },
  },
  {
    id: 'sc-swap-confirm',
    title: 'Confirm Swap HUD',
    category: 'swap',
    family: 'interface',
    description:
      'Confirmation holographique avant exécution swap (exchange-panel), style glass sobre, sans scroll interne.',
    rewardM4T3R: 140,
    rarity: 'epic',
    status: 'available',
    connections: ['sc-swap-slippage', 'sc-security-tx', 'sc-wallet-copy'],
    slot: { u: 0.22, depth: 0.25 },
  },
  {
    id: 'sc-swap-slippage',
    title: 'Slippage Control',
    category: 'swap',
    family: 'interface',
    description:
      'Contrôle slippage discret sur exchange-panel, mémorisé, adapté au strip 16px mobile.',
    rewardM4T3R: 95,
    rarity: 'rare',
    status: 'available',
    connections: ['sc-swap-confirm', 'sc-data-rates', 'sc-a11y-focus'],
    slot: { u: 0.12, depth: -0.15 },
  },
  {
    id: 'sc-showcase-chat',
    title: 'Chat Density MVP',
    category: 'showcase',
    family: 'interface',
    description:
      'Densifier showcase-chat pour 250px : bulles compactes, inputs accessibles, pas de scroll page.',
    rewardM4T3R: 110,
    rarity: 'rare',
    status: 'active',
    connections: ['sc-showcase-dao', 'sc-a11y-focus', 'sc-wallet-copy'],
    slot: { u: 0.4, depth: 0.05 },
  },
  {
    id: 'sc-showcase-dao',
    title: 'DAO Vote Preview',
    category: 'showcase',
    family: 'interface',
    description:
      'Prévisualisation de vote DAO lisible en colonne étroite, états locked/available cohérents.',
    rewardM4T3R: 125,
    rarity: 'rare',
    status: 'available',
    connections: ['sc-showcase-chat', 'sc-backend-quests', 'sc-gamify-progress'],
    slot: { u: 0.68, depth: -0.3 },
  },
  {
    id: 'sc-a11y-focus',
    title: 'Focus Rings Shell',
    category: 'a11y',
    family: 'interface',
    description:
      'Anneaux focus visibles sur Navbar, Swap, Dock et panneau Quest ; navigation clavier sans piège.',
    rewardM4T3R: 70,
    rarity: 'common',
    status: 'available',
    connections: ['sc-responsive-250', 'sc-showcase-chat', 'sc-tests-a11y'],
    slot: { u: 0.88, depth: 0.35 },
  },

  // ——— Three.js (7) ———
  {
    id: 'sc-three-raycast',
    title: 'Raycast Safe Zones',
    category: 'three',
    family: 'three',
    description:
      'Raycasting Quests qui ignore Navbar/Swap/Dock/Graph via elementFromPoint et bande sous Swap.',
    rewardM4T3R: 200,
    rarity: 'legendary',
    status: 'active',
    connections: ['sc-three-network', 'sc-three-occlusion', 'sc-responsive-250'],
    slot: { u: 0.3, depth: 0.4 },
  },
  {
    id: 'sc-three-network',
    title: 'Neural Link Glow',
    category: 'three',
    family: 'three',
    description:
      'Liens fins double-brin + signaux énergétiques désynchronisés sur le graphe Star Conquest.',
    rewardM4T3R: 160,
    rarity: 'epic',
    status: 'active',
    connections: ['sc-three-raycast', 'sc-three-depth', 'sc-gamify-map'],
    slot: { u: 0.55, depth: -0.25 },
  },
  {
    id: 'sc-three-depth',
    title: 'Depth Layer Tune',
    category: 'three',
    family: 'three',
    description:
      'Calibrer far/mid/interactive/near : taille, opacités, parallaxe et dérive sans post-process lourd.',
    rewardM4T3R: 150,
    rarity: 'epic',
    status: 'available',
    connections: ['sc-three-network', 'sc-three-floor-peek', 'sc-three-fps'],
    slot: { u: 0.18, depth: 0.1 },
  },
  {
    id: 'sc-three-fps',
    title: 'Three FPS Cap',
    category: 'performance',
    family: 'three',
    description:
      'Plafond FPS / pause visibility pour mobile 250×550 : constellation fluide sans drain batterie.',
    rewardM4T3R: 120,
    rarity: 'rare',
    status: 'available',
    connections: ['sc-three-depth', 'sc-performance-lists', 'sc-three-floor-peek'],
    slot: { u: 0.72, depth: -0.1 },
  },
  {
    id: 'sc-three-floor-peek',
    title: 'Floor Peek Sync',
    category: 'three',
    family: 'three',
    description:
      'Synchroniser --floor-peek-height avec la bande jouable Quests et le floor Three.js.',
    rewardM4T3R: 85,
    rarity: 'rare',
    status: 'completed',
    connections: ['sc-angular-layout', 'sc-three-depth', 'sc-responsive-250', 'sc-three-drift'],
    slot: { u: 0.45, depth: 0.2 },
    underFloor: true,
  },
  {
    id: 'sc-three-occlusion',
    title: 'Occlusion Scanner',
    category: 'three',
    family: 'three',
    description:
      'Détection Quests masquées + scanner compact : accès tactile quand Showcase/Dock/Graph sont ouverts.',
    rewardM4T3R: 135,
    rarity: 'epic',
    status: 'active',
    connections: ['sc-three-raycast', 'sc-gamify-map', 'sc-dock-quests'],
    slot: { u: 0.9, depth: -0.35 },
    underFloor: true,
  },
  {
    id: 'sc-three-drift',
    title: 'Organic Drift',
    category: 'three',
    family: 'three',
    description:
      'Dérive individuelle par Quest (phase, amplitude, direction) type ciel nocturne — stable au clic.',
    rewardM4T3R: 100,
    rarity: 'rare',
    status: 'available',
    connections: ['sc-three-network', 'sc-three-depth', 'sc-three-raycast', 'sc-three-floor-peek'],
    slot: { u: 0.08, depth: 0.3 },
    underFloor: true,
  },

  // ——— Blockchain / M4T3R (7) ———
  {
    id: 'sc-wallet-copy',
    title: 'Wallet Address Copy',
    category: 'dock',
    family: 'blockchain',
    description:
      'Copie d’adresse one-tap dans wallet-panel avec feedback toast, sans exposer de secret.',
    rewardM4T3R: 75,
    rarity: 'common',
    status: 'available',
    connections: ['sc-security-wallet', 'sc-dock-faucet', 'sc-m4t3r-estimate'],
    slot: { u: 0.25, depth: -0.05 },
  },
  {
    id: 'sc-dock-faucet',
    title: 'Faucet Rate Limit UX',
    category: 'dock',
    family: 'blockchain',
    description:
      'États cooldown / erreur faucet lisibles dans le dock, branchés Soft Fail API.',
    rewardM4T3R: 90,
    rarity: 'rare',
    status: 'available',
    connections: ['sc-wallet-copy', 'sc-backend-faucet', 'sc-m4t3r-estimate'],
    slot: { u: 0.48, depth: 0.22 },
  },
  {
    id: 'sc-dock-mempool',
    title: 'Mempool Row Density',
    category: 'dock',
    family: 'blockchain',
    description:
      'Lignes mempool densifiées pour bande dock 250px, zero-scroll forcé.',
    rewardM4T3R: 105,
    rarity: 'rare',
    status: 'active',
    connections: ['sc-dock-chain', 'sc-performance-lists', 'sc-data-chain'],
    slot: { u: 0.62, depth: -0.2 },
    underGraph: true,
  },
  {
    id: 'sc-dock-chain',
    title: 'Chain Composer Hint',
    category: 'dock',
    family: 'blockchain',
    description:
      'Hint contextuel block-composer quand mempool vide ; lien DockChainStateService.',
    rewardM4T3R: 115,
    rarity: 'rare',
    status: 'available',
    connections: ['sc-dock-mempool', 'sc-data-chain', 'sc-angular-layout'],
    slot: { u: 0.35, depth: 0.15 },
    underGraph: true,
  },
  {
    id: 'sc-security-wallet',
    title: 'Wallet Key Mask',
    category: 'security',
    family: 'blockchain',
    description:
      'Masquage systématique des secrets wallet-panel ; aucun leak console.',
    rewardM4T3R: 170,
    rarity: 'epic',
    status: 'available',
    connections: ['sc-wallet-copy', 'sc-security-tx', 'sc-security-auth'],
    slot: { u: 0.15, depth: -0.3 },
  },
  {
    id: 'sc-security-tx',
    title: 'Tx Preview Hash',
    category: 'security',
    family: 'blockchain',
    description:
      'Prévisualiser hash / montant avant envoi (wallet actions), style glass sobre.',
    rewardM4T3R: 130,
    rarity: 'epic',
    status: 'locked',
    connections: ['sc-swap-confirm', 'sc-security-wallet', 'sc-m4t3r-estimate'],
    slot: { u: 0.82, depth: 0.05 },
  },
  {
    id: 'sc-m4t3r-estimate',
    title: 'M4T3R Estimate UI',
    category: 'gamification',
    family: 'blockchain',
    description:
      'Affichage cosmétique « Gain probable : XX M4T3R » — aucun transfert on-chain dans cette feature.',
    rewardM4T3R: 55,
    rarity: 'common',
    status: 'completed',
    connections: ['sc-gamify-map', 'sc-dock-faucet', 'sc-data-persist'],
    slot: { u: 0.7, depth: 0.4 },
  },

  // ——— Backend / data (7) ———
  {
    id: 'sc-backend-quests',
    title: 'Quests API Hook',
    category: 'backend',
    family: 'backend',
    description:
      'Préparer le contrat frontend ↔ Spring Boot pour catalogue Quests (DTO prêt, mock local actuel).',
    rewardM4T3R: 190,
    rarity: 'legendary',
    status: 'future',
    connections: ['sc-data-persist', 'sc-dock-quests', 'sc-showcase-dao'],
    slot: { u: 0.28, depth: -0.15 },
  },
  {
    id: 'sc-backend-faucet',
    title: 'Faucet API Soft Fail',
    category: 'backend',
    family: 'backend',
    description:
      'Erreurs faucet (429/5xx) mappées en messages UX non leaky côté dock.',
    rewardM4T3R: 80,
    rarity: 'common',
    status: 'available',
    connections: ['sc-dock-faucet', 'sc-security-auth', 'sc-data-rates'],
    slot: { u: 0.58, depth: 0.25 },
  },
  {
    id: 'sc-security-auth',
    title: 'Auth Drawer Hardening',
    category: 'security',
    family: 'backend',
    description:
      'auth-drawer : autocomplete, erreurs non leaky, restauration focus après fermeture.',
    rewardM4T3R: 145,
    rarity: 'epic',
    status: 'available',
    connections: ['sc-admin-gate', 'sc-security-wallet', 'sc-backend-faucet'],
    slot: { u: 0.2, depth: 0.1 },
  },
  {
    id: 'sc-admin-gate',
    title: 'Admin Tab Gate',
    category: 'security',
    family: 'backend',
    description:
      'Gating AuthService.isAdmin() sur l’onglet admin dock — aucune fuite UI guest.',
    rewardM4T3R: 155,
    rarity: 'epic',
    status: 'available',
    connections: ['sc-security-auth', 'sc-dock-quests', 'sc-tests-unit'],
    slot: { u: 0.85, depth: -0.25 },
  },
  {
    id: 'sc-data-rates',
    title: 'Rate Cache Soft',
    category: 'data',
    family: 'backend',
    description:
      'Cache taux swap soft-expire pour réduire spam réseau sur exchange-panel.',
    rewardM4T3R: 100,
    rarity: 'rare',
    status: 'available',
    connections: ['sc-swap-slippage', 'sc-data-chain', 'sc-backend-faucet'],
    slot: { u: 0.42, depth: -0.05 },
  },
  {
    id: 'sc-data-chain',
    title: 'Chain Poll Budget',
    category: 'data',
    family: 'backend',
    description:
      'Budget de polling hauteur de chaîne / mempool adapté mobile (backoff, pause onglet caché).',
    rewardM4T3R: 110,
    rarity: 'rare',
    status: 'active',
    connections: ['sc-dock-chain', 'sc-data-rates', 'sc-three-fps'],
    slot: { u: 0.65, depth: 0.3 },
  },
  {
    id: 'sc-data-persist',
    title: 'Quest Local Persist',
    category: 'data',
    family: 'backend',
    description:
      'Persistance locale du progrès Quests (guest) jusqu’à sync Spring Boot future.',
    rewardM4T3R: 125,
    rarity: 'rare',
    status: 'future',
    connections: ['sc-backend-quests', 'sc-gamify-progress', 'sc-m4t3r-estimate'],
    slot: { u: 0.1, depth: 0.2 },
  },

  // ——— Quality / conquête (7) ———
  {
    id: 'sc-gamify-map',
    title: 'Conquest Select',
    category: 'gamification',
    family: 'quality',
    description:
      'Sélection sticky Quests + panneau holographique ; sensation de constellation activée.',
    rewardM4T3R: 210,
    rarity: 'legendary',
    status: 'active',
    connections: ['sc-three-network', 'sc-gamify-progress', 'sc-three-occlusion'],
    slot: { u: 0.5, depth: 0 },
  },
  {
    id: 'sc-gamify-progress',
    title: 'Progress Constellation',
    category: 'gamification',
    family: 'quality',
    description:
      'Lier progression Quests (statuts) au graphe neuronal et au dock-quests-summary.',
    rewardM4T3R: 175,
    rarity: 'epic',
    status: 'available',
    connections: ['sc-gamify-map', 'sc-dock-quests', 'sc-data-persist'],
    slot: { u: 0.33, depth: 0.35 },
  },
  {
    id: 'sc-dock-quests',
    title: 'Dock Quests Sync',
    category: 'gamification',
    family: 'quality',
    description:
      'Aligner dock-quests-summary avec le catalogue Star Conquest (daily + conquête).',
    rewardM4T3R: 140,
    rarity: 'epic',
    status: 'active',
    connections: ['sc-gamify-progress', 'sc-backend-quests', 'sc-three-occlusion'],
    slot: { u: 0.6, depth: -0.15 },
    underGraph: true,
  },
  {
    id: 'sc-performance-lists',
    title: 'Virtualize Dock Lists',
    category: 'performance',
    family: 'quality',
    description:
      'Virtualiser listes dock (tx / mempool) pour fluidité tactile à 250×550.',
    rewardM4T3R: 130,
    rarity: 'rare',
    status: 'locked',
    connections: ['sc-dock-mempool', 'sc-three-fps', 'sc-tests-unit'],
    slot: { u: 0.2, depth: 0.2 },
  },
  {
    id: 'sc-tests-unit',
    title: 'Star Conquest Specs',
    category: 'tests',
    family: 'quality',
    description:
      'Specs : 35 Quests, 7 par famille, connexions valides, couches profondeur, format • +N.',
    rewardM4T3R: 90,
    rarity: 'rare',
    status: 'available',
    connections: ['sc-admin-gate', 'sc-tests-a11y', 'sc-quality-docs'],
    slot: { u: 0.4, depth: 0.1 },
  },
  {
    id: 'sc-tests-a11y',
    title: 'Axe Panel Smoke',
    category: 'tests',
    family: 'quality',
    description:
      'Smoke a11y panneau Quest + scanner (titre, close, reward) sans régression shell.',
    rewardM4T3R: 65,
    rarity: 'common',
    status: 'available',
    connections: ['sc-a11y-focus', 'sc-tests-unit', 'sc-quality-docs'],
    slot: { u: 0.92, depth: 0.25 },
  },
  {
    id: 'sc-quality-docs',
    title: 'Conquest README',
    category: 'quality',
    family: 'quality',
    description:
      'Documenter couches profondeur, zone Swap, labels sans pill, scanner et contrat mock→API.',
    rewardM4T3R: 50,
    rarity: 'common',
    status: 'available',
    connections: ['sc-tests-unit', 'sc-m4t3r-estimate', 'sc-three-depth'],
    slot: { u: 0.15, depth: -0.1 },
  },
];

function buildQuest(seed: QuestSeed): StarQuest {
  const { family: familyOverride, underFloor, underGraph, ...rest } = seed;
  return {
    ...rest,
    family: familyOverride ?? familyFromCategory(seed.category),
    interactive: true,
    underFloor: underFloor === true,
    underGraph: underGraph === true,
    slot: {
      u: seed.slot.u,
      v: seed.slot.v ?? 0.5,
      depth: seed.slot.depth,
    },
    position: { x: 0, y: 0, z: 0 },
  };
}

export const STAR_CONQUEST_MOCK_QUESTS: readonly StarQuest[] = SEEDS.map(buildQuest);

export function starQuestById(
  id: string,
  catalog: readonly StarQuest[] = STAR_CONQUEST_MOCK_QUESTS
): StarQuest | undefined {
  return catalog.find((q) => q.id === id);
}

export const STAR_CONQUEST_QUEST_COUNT = 35;
export const STAR_CONQUEST_QUESTS_PER_FAMILY = 7;
