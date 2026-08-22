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
  {
    id: 'sc-three-drift',
    reason: 'Dérive absorbée par le graphe runtime ; remplacée par la carte Wigle live.',
  },
  {
    id: 'sc-m4t3r-estimate',
    reason: 'Estimate cosmétique remplacée par le pickup M4T3R sur la carte.',
  },
  {
    id: 'sc-performance-lists',
    reason: 'Virtualisation dock moins prioritaire que l’onglet Peers live.',
  },
  {
    id: 'sc-quality-docs',
    reason: 'README interne ; remplacé par la surface R4V3 / market produit.',
  },
];

/**
 * 35 Quests (7 × 5 familles) — board produit type GitHub Project.
 * Source de vérité : codebase + rendu https://dartchain.pages.dev (2026-08-21).
 * Colonnes : completed=Done · active=In Progress · available=Ready · locked=Blocked · future=Icebox.
 * Live CTA (Dock/Showcase) restent Ready jusqu’à action joueur.
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
      '[Done] Shell MVP zero-scroll : TARGET_VIEWPORT 250×550, vp-compact, tokens --ds-zone-* live sur dartchain.pages.dev.',
    rewardM4T3R: 220,
    rarity: 'legendary',
    status: 'completed',
    connections: ['sc-angular-layout', 'sc-a11y-focus', 'sc-three-floor-peek'],
    slot: { u: 0.52, depth: 0.15 },
  },
  {
    id: 'sc-angular-layout',
    title: 'Shell Zones Overlay',
    category: 'angular',
    family: 'interface',
    description:
      '[Done] Zones shell + panneau/scanner SC sans voler Navbar/Swap/Dock/Graph — overlays shippés sur pages.dev.',
    rewardM4T3R: 180,
    rarity: 'epic',
    status: 'completed',
    connections: ['sc-responsive-250', 'sc-three-floor-peek', 'sc-showcase-dao'],
    slot: { u: 0.78, depth: -0.2 },
  },
  {
    id: 'sc-swap-confirm',
    title: 'Confirm Swap HUD',
    category: 'swap',
    family: 'interface',
    description:
      '[Ready · live] Exécuter un swap LaunchLab. L’étoile se complète via la quête Dock swap-tokens (pas de claim magique).',
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
      '[In Progress] Label « Slippage max 0,5 % » live — reste : contrôle mémorisé + strip 16px (pas encore de picker).',
    rewardM4T3R: 95,
    rarity: 'rare',
    status: 'active',
    connections: ['sc-swap-confirm', 'sc-data-rates', 'sc-a11y-focus'],
    slot: { u: 0.12, depth: -0.15 },
  },
  {
    id: 'sc-showcase-chat',
    title: 'Showcase Chat Live',
    category: 'showcase',
    family: 'interface',
    description:
      '[Ready · live] Ouvrir Showcase Chat (CTA SC) : bulles 250px, input accessible — conquérir via navigation produit.',
    rewardM4T3R: 110,
    rarity: 'rare',
    status: 'available',
    connections: ['sc-showcase-dao', 'sc-a11y-focus', 'sc-wallet-copy'],
    slot: { u: 0.4, depth: 0.05 },
  },
  {
    id: 'sc-showcase-dao',
    title: 'DAO Vote Preview',
    category: 'showcase',
    family: 'interface',
    description:
      '[Done] Vote DAO Showcase (drawer + résumé) en colonne étroite — shippé sur pages.dev, zéro overflow 250px.',
    rewardM4T3R: 125,
    rarity: 'rare',
    status: 'completed',
    connections: ['sc-showcase-chat', 'sc-backend-quests', 'sc-gamify-progress'],
    slot: { u: 0.68, depth: -0.3 },
  },
  {
    id: 'sc-a11y-focus',
    title: 'Focus Rings Shell',
    category: 'a11y',
    family: 'interface',
    description:
      '[Done] FocusTrapDirective + anneaux sur drawers, panneau Quest, scanner, Navbar/Swap/Dock — clavier sans piège.',
    rewardM4T3R: 70,
    rarity: 'common',
    status: 'completed',
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
      '[Done] Occlusion SC via elementFromPoint — ignore chrome Angular (Navbar/Swap/Dock/Graph) sur pages.dev.',
    rewardM4T3R: 200,
    rarity: 'legendary',
    status: 'completed',
    connections: ['sc-three-network', 'sc-three-occlusion', 'sc-responsive-250'],
    slot: { u: 0.3, depth: 0.4 },
  },
  {
    id: 'sc-three-network',
    title: 'Neural Link Glow',
    category: 'three',
    family: 'three',
    description:
      '[Done] Filaments double-brin + sparks — chaque lien = edge catalogue (35 stars, 5 galaxies).',
    rewardM4T3R: 160,
    rarity: 'epic',
    status: 'completed',
    connections: ['sc-three-raycast', 'sc-three-depth', 'sc-gamify-map'],
    slot: { u: 0.55, depth: -0.25 },
  },
  {
    id: 'sc-three-depth',
    title: 'Depth Layer Tune',
    category: 'three',
    family: 'three',
    description:
      '[Done] Couches far/mid/interactive/near + parallaxe (SC-UI-010) — maturity backlog clos.',
    rewardM4T3R: 150,
    rarity: 'epic',
    status: 'completed',
    connections: ['sc-three-network', 'sc-three-floor-peek', 'sc-three-fps'],
    slot: { u: 0.18, depth: 0.1 },
  },
  {
    id: 'sc-three-fps',
    title: 'Three FPS Cap',
    category: 'performance',
    family: 'three',
    description:
      '[Done] shouldAnimateWebGl + pause visibility — constellation mobile sans drain (floor + SC host).',
    rewardM4T3R: 120,
    rarity: 'rare',
    status: 'completed',
    connections: ['sc-three-depth', 'sc-dock-peers', 'sc-three-floor-peek'],
    slot: { u: 0.72, depth: -0.1 },
  },
  {
    id: 'sc-three-floor-peek',
    title: 'Floor Peek Sync',
    category: 'three',
    family: 'three',
    description:
      '[Done] --floor-peek-height (220px token) synchronisé bande Quests ↔ canvas MetaVerseBB.',
    rewardM4T3R: 85,
    rarity: 'rare',
    status: 'completed',
    connections: ['sc-angular-layout', 'sc-three-depth', 'sc-responsive-250', 'sc-map-wigle'],
    slot: { u: 0.45, depth: 0.2 },
    underFloor: true,
  },
  {
    id: 'sc-three-occlusion',
    title: 'Occlusion Scanner',
    category: 'three',
    family: 'three',
    description:
      '[Done] Scanner hors-vue + reward labels — une ligne = une Quest occluse (shippé).',
    rewardM4T3R: 135,
    rarity: 'epic',
    status: 'completed',
    connections: ['sc-three-raycast', 'sc-gamify-map', 'sc-dock-quests'],
    slot: { u: 0.9, depth: -0.35 },
    underFloor: true,
  },
  {
    id: 'sc-map-wigle',
    title: 'Carte Wigle Live',
    category: 'three',
    family: 'three',
    description:
      '[Done] Floor : WiFi Wigle + footprints OSM — ancre MetaVerseBB, zéro particule orpheline.',
    rewardM4T3R: 100,
    rarity: 'rare',
    status: 'completed',
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
      '[Ready · live] Copier l’adresse wallet (CTA SC → Dock wallet) — toast, sans exposer de secret.',
    rewardM4T3R: 75,
    rarity: 'common',
    status: 'available',
    connections: ['sc-security-wallet', 'sc-dock-faucet', 'sc-map-pickup'],
    slot: { u: 0.25, depth: -0.05 },
  },
  {
    id: 'sc-dock-faucet',
    title: 'Faucet Rate Limit UX',
    category: 'dock',
    family: 'blockchain',
    description:
      '[Ready · live] Réclamer le faucet. Aligné Dock faucet-claim (1 MTS + XP) — action réelle requise.',
    rewardM4T3R: 90,
    rarity: 'rare',
    status: 'available',
    connections: ['sc-wallet-copy', 'sc-backend-faucet', 'sc-map-pickup'],
    slot: { u: 0.48, depth: 0.22 },
  },
  {
    id: 'sc-dock-mempool',
    title: 'Mempool Row Density',
    category: 'dock',
    family: 'blockchain',
    description:
      '[Ready · live] Ouvrir le mempool densifié (bande dock 250px) — CTA SC → transactions.',
    rewardM4T3R: 105,
    rarity: 'rare',
    status: 'available',
    connections: ['sc-dock-chain', 'sc-dock-peers', 'sc-data-chain'],
    slot: { u: 0.62, depth: -0.2 },
    underGraph: true,
  },
  {
    id: 'sc-dock-chain',
    title: 'Chain Composer Hint',
    category: 'dock',
    family: 'blockchain',
    description:
      '[Ready · live] Ouvrir le détail d’un bloc — suit Dock explore-blocks (drawer hash/nonce).',
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
      '[Done] maskedPublicKey / maskedPrivateKey + reveal contrôlé — aucun leak console sur pages.dev.',
    rewardM4T3R: 170,
    rarity: 'epic',
    status: 'completed',
    connections: ['sc-wallet-copy', 'sc-security-tx', 'sc-security-auth'],
    slot: { u: 0.15, depth: -0.3 },
  },
  {
    id: 'sc-security-tx',
    title: 'Tx Preview Hash',
    category: 'security',
    family: 'blockchain',
    description:
      '[Blocked] Confirm send wallet existe — débloquer après conquête swap + mask + pickup (deps graph).',
    rewardM4T3R: 130,
    rarity: 'epic',
    status: 'locked',
    connections: ['sc-swap-confirm', 'sc-security-wallet', 'sc-map-pickup'],
    slot: { u: 0.82, depth: 0.05 },
  },
  {
    id: 'sc-map-pickup',
    title: 'M4T3R Map Pickup',
    category: 'gamification',
    family: 'blockchain',
    description:
      '[Done] Pickup FX + cellules M4T3R au sol (trail) — preview local, pas de crédit faucet.',
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
      '[Ready · hub live] Login + faucet + swap + blocs Dock complètent l’étoile. API Spring SC = Icebox.',
    rewardM4T3R: 190,
    rarity: 'legendary',
    status: 'available',
    connections: ['sc-data-persist', 'sc-dock-quests', 'sc-showcase-dao'],
    slot: { u: 0.28, depth: -0.15 },
  },
  {
    id: 'sc-backend-faucet',
    title: 'Faucet API Soft Fail',
    category: 'backend',
    family: 'backend',
    description:
      '[Done] 429/5xx faucet → messages UX non leaky (FaucetRuntimeService) — shippé.',
    rewardM4T3R: 80,
    rarity: 'common',
    status: 'completed',
    connections: ['sc-dock-faucet', 'sc-security-auth', 'sc-data-rates'],
    slot: { u: 0.58, depth: 0.25 },
  },
  {
    id: 'sc-security-auth',
    title: 'Auth Drawer Hardening',
    category: 'security',
    family: 'backend',
    description:
      '[Ready · live] Se connecter — suit Dock daily-login. Pas de clic magique sur l’étoile.',
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
      '[Done] AuthService.isAdmin() gate l’onglet admin dock (app.ts) — zéro fuite UI guest.',
    rewardM4T3R: 155,
    rarity: 'epic',
    status: 'completed',
    connections: ['sc-security-auth', 'sc-dock-quests', 'sc-tests-unit'],
    slot: { u: 0.85, depth: -0.25 },
  },
  {
    id: 'sc-data-rates',
    title: 'Rate Cache Soft',
    category: 'data',
    family: 'backend',
    description:
      '[In Progress] Quote lock « Taux garanti 30 s » live — reste : soft-expire cache réseau anti-spam.',
    rewardM4T3R: 100,
    rarity: 'rare',
    status: 'active',
    connections: ['sc-swap-slippage', 'sc-data-chain', 'sc-backend-faucet'],
    slot: { u: 0.42, depth: -0.05 },
  },
  {
    id: 'sc-data-chain',
    title: 'Chain Poll Budget',
    category: 'data',
    family: 'backend',
    description:
      '[Done] Polling chain/mempool avec backoff 429 + pause onglet — budgets mobile shippés.',
    rewardM4T3R: 110,
    rarity: 'rare',
    status: 'completed',
    connections: ['sc-dock-chain', 'sc-data-rates', 'sc-three-fps'],
    slot: { u: 0.65, depth: 0.3 },
  },
  {
    id: 'sc-data-persist',
    title: 'Quest Local Persist',
    category: 'data',
    family: 'backend',
    description:
      '[Icebox] localStorage star-conquest-progress-v1 OK — sync Spring Boot SC pas branchée.',
    rewardM4T3R: 125,
    rarity: 'rare',
    status: 'future',
    connections: ['sc-backend-quests', 'sc-gamify-progress', 'sc-map-pickup'],
    slot: { u: 0.1, depth: 0.2 },
  },

  // ——— Quality / conquête (7) ———
  {
    id: 'sc-gamify-map',
    title: 'Conquest Select',
    category: 'gamification',
    family: 'quality',
    description:
      '[Done] 1 particule = 1 Quest → panneau holographique. Halos/bloom = copies de la même carte.',
    rewardM4T3R: 210,
    rarity: 'legendary',
    status: 'completed',
    connections: ['sc-three-network', 'sc-gamify-progress', 'sc-three-occlusion'],
    slot: { u: 0.5, depth: 0 },
  },
  {
    id: 'sc-gamify-progress',
    title: 'Progress Constellation',
    category: 'gamification',
    family: 'quality',
    description:
      '[Done] Progression SC (claim + live Dock) hydratée sur le graphe + dock-quests-summary.',
    rewardM4T3R: 175,
    rarity: 'epic',
    status: 'completed',
    connections: ['sc-gamify-map', 'sc-dock-quests', 'sc-data-persist'],
    slot: { u: 0.33, depth: 0.35 },
  },
  {
    id: 'sc-dock-quests',
    title: 'Dock Quests Sync',
    category: 'gamification',
    family: 'quality',
    description:
      '[Done] Pont STAR_CONQUEST_LIVE_LINKS ↔ Dock daily (10 surfaces) — sync shippée.',
    rewardM4T3R: 140,
    rarity: 'epic',
    status: 'completed',
    connections: ['sc-gamify-progress', 'sc-backend-quests', 'sc-three-occlusion'],
    slot: { u: 0.6, depth: -0.15 },
    underGraph: true,
  },
  {
    id: 'sc-dock-peers',
    title: 'Dock Peers Live',
    category: 'gamification',
    family: 'quality',
    description:
      '[Ready · live] Ouvrir l’onglet Peers — satellites réseau orbitent une Quest (CTA SC).',
    rewardM4T3R: 130,
    rarity: 'rare',
    status: 'available',
    connections: ['sc-dock-mempool', 'sc-three-fps', 'sc-tests-unit'],
    slot: { u: 0.2, depth: 0.2 },
  },
  {
    id: 'sc-tests-unit',
    title: 'Star Conquest Specs',
    category: 'tests',
    family: 'quality',
    description:
      '[Done] Specs : 35 Quests, 7/famille, connexions valides, live links, board GitHub colonnes.',
    rewardM4T3R: 90,
    rarity: 'rare',
    status: 'completed',
    connections: ['sc-admin-gate', 'sc-tests-a11y', 'sc-r4v3-market'],
    slot: { u: 0.4, depth: 0.1 },
  },
  {
    id: 'sc-tests-a11y',
    title: 'Axe Panel Smoke',
    category: 'tests',
    family: 'quality',
    description:
      '[Done] A11y panneau Quest + scanner (dialog, focus trap, close, reward) — non-régression shell.',
    rewardM4T3R: 65,
    rarity: 'common',
    status: 'completed',
    connections: ['sc-a11y-focus', 'sc-tests-unit', 'sc-r4v3-market'],
    slot: { u: 0.92, depth: 0.25 },
  },
  {
    id: 'sc-r4v3-market',
    title: 'R4V3 Market',
    category: 'showcase',
    family: 'quality',
    description:
      '[Ready · live] Ouvrir le market R4V3 (chart + token) — surface produit, pas de claim magique.',
    rewardM4T3R: 50,
    rarity: 'common',
    status: 'available',
    connections: ['sc-tests-unit', 'sc-map-pickup', 'sc-three-depth'],
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

/** Taille actuelle du catalogue design — le runtime accepte N quêtes. */
export const STAR_CONQUEST_QUEST_COUNT = STAR_CONQUEST_MOCK_QUESTS.length;
export const STAR_CONQUEST_QUESTS_PER_FAMILY = 7;
