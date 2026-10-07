/** Étapes du tutoriel hub post-intro. */
export type OnboardingTourStatus = 'idle' | 'running' | 'paused' | 'done' | 'skipped';

export type OnboardingTourSkipWhen =
  | 'authenticated'
  | 'showcase-off'
  | 'faucet-off'
  | 'sc-off';

export type OnboardingTourEnterAction =
  | 'none'
  | 'open-register'
  | 'open-login'
  | 'expand-showcase-r4v3'
  | 'expand-showcase-rv23'
  | 'expand-showcase-daonews'
  | 'expand-showcase-dao'
  | 'expand-showcase-market'
  | 'expand-showcase-tours'
  | 'expand-dock-wallet'
  | 'expand-dock-faucet'
  | 'expand-dock-quests'
  | 'expand-dock-chain'
  | 'expand-dock-peers'
  | 'expand-dock-transactions'
  | 'expand-chart'
  | 'collapse-chart'
  | 'scroll-floor'
  | 'park-logo'
  | 'finish-hub';

/** Placement du token / bulle pour éviter les chevauchements. */
export type OnboardingTourLayout =
  | 'default'
  | 'token-left'
  | 'token-right'
  | 'bubble-above'
  | 'bubble-below'
  | 'bubble-left'
  | 'bubble-right';

export interface OnboardingTourStep {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  /** Sélecteur CSS principal pour spotlight / ancre token. */
  readonly targetSelector?: string;
  /** Alternatives si la cible principale est absente. */
  readonly fallbackSelectors?: readonly string[];
  /**
   * Zones défloutées / cliquables en plus de la cible
   * (menus, drawers — uniquement pour l’étape courante, jamais sticky).
   */
  readonly revealSelectors?: readonly string[];
  /** Auto-avance si pas d’interaction (ms). 0 = manuel uniquement (clic Suivant). */
  readonly timeoutMs?: number;
  /** Laisser les clics passer dans le trou spotlight (défaut true si cible). */
  readonly interactive?: boolean;
  readonly enterAction?: OnboardingTourEnterAction;
  readonly skipWhen?: OnboardingTourSkipWhen;
  /**
   * Padding autour du rect spotlight (px).
   * 0 = calé exactement sur l’élément (défaut).
   */
  readonly pad?: number;
  /**
   * Position du token par rapport à la zone nette.
   * below (défaut) | above (ex. arène).
   */
  readonly tokenAnchor?: 'below' | 'above';
  /** Placement anti-chevauchement token / bulle. */
  readonly layout?: OnboardingTourLayout;
  /**
   * En plus de la cible spotlightée (toujours gardée nette),
   * réappliquer le sélecteur à tous les nœuds qui matchent.
   * Défaut = false : seul l’élément réellement montré reste net.
   */
  readonly stickyClear?: boolean;
}

export const ONBOARDING_STORAGE_KEY = 'dartchain.onboarding.v1';

/**
 * Auto-avance entre bulles si l’utilisateur n’agit pas.
 * 0 = désactivé (tutoriel en pause — à rebosser ; pas de défilement auto).
 */
export const ONBOARDING_AUTO_ADVANCE_MS = 0;

/**
 * Parcours utilisateur :
 * Live → auth → navbar → hub → R4V3 → swap → wallet/faucet/quêtes → explorateurs → jeux → logo.
 * Chaque étape interactive laisse faire l’action décrite sans quitter le tutoriel ;
 * `revealSelectors` défloute uniquement menus / drawers de l’étape courante.
 */
export const ONBOARDING_TOUR_STEPS: readonly OnboardingTourStep[] = [
  {
    id: 'network-status',
    title: 'Voyant et direct',
    body: 'Pastille Direct : voyant orange = invité, voyant vert = compte connecté.',
    targetSelector: '.network-trust-chip',
    fallbackSelectors: [
      '[data-tour="network-status"]',
      'app-navbar-network-status',
      '.navbar-brand-row__network',
    ],
    revealSelectors: ['.nv-anchor-drawer--live'],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    pad: 0,
    tokenAnchor: 'below',
    stickyClear: false,
  },
  {
    id: 'register',
    title: 'Inscription',
    body: 'Système d’inscription — crée ton compte ici pour le portefeuille, le robinet et les quêtes.',
    targetSelector: '[data-tour="register"]',
    fallbackSelectors: [
      '.navbar-auth-btn--register',
      '.navbar-auth-strip .navbar-auth-btn--register',
      'button.navbar-auth-btn--register',
    ],
    revealSelectors: ['.auth-drawer'],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    skipWhen: 'authenticated',
    pad: 2,
    tokenAnchor: 'below',
    stickyClear: false,
  },
  {
    id: 'login',
    title: 'Connexion',
    body: 'Système de connexion — si tu as déjà un compte, connecte-toi ici.',
    targetSelector: '[data-tour="login"]',
    fallbackSelectors: [
      '.navbar-auth-btn--login',
      '.navbar-auth-strip .navbar-auth-btn--login',
      'button.navbar-auth-btn--login',
    ],
    revealSelectors: ['.auth-drawer'],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    skipWhen: 'authenticated',
    pad: 2,
    tokenAnchor: 'below',
    stickyClear: false,
  },
  {
    id: 'brand-crypto',
    title: 'Jeton actif',
    body: 'Choisis ici le jeton affiché dans le hub — il synchronise le graphique et l’échange.',
    targetSelector: 'app-brand-crypto-select',
    fallbackSelectors: ['.navbar-brand-select'],
    revealSelectors: ['.token-select__menu'],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    pad: 0,
    tokenAnchor: 'below',
    layout: 'token-left',
    stickyClear: false,
  },
  {
    id: 'bandeau',
    title: 'Pouls du réseau',
    body: 'Ce bandeau affiche le jeton actif, les transactions et l’activité en direct. Touche une pastille pour le détail.',
    targetSelector: 'app-bandeau-accueil',
    fallbackSelectors: ['.bandeau-accueil'],
    revealSelectors: ['.nv-anchor-drawer--ticker'],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    pad: 0,
    tokenAnchor: 'below',
    stickyClear: false,
  },
  {
    id: 'collapse-panels',
    title: 'Réduire / agrandir',
    body: 'Ces chevrons replient ou ouvrent chaque panneau — utile pour libérer l’écran.',
    targetSelector: '.app-hub-showcase-block .panel-collapse-control',
    fallbackSelectors: [
      '.app-hub-showcase-block .collapsed-bar-actions__collapse',
      '.app-bottom-stack .panel-collapse-control',
      '.app-market-stack--rate .panel-collapse-control',
      '.panel-collapse-control',
    ],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    pad: 4,
    tokenAnchor: 'below',
    stickyClear: false,
  },
  {
    id: 'showcase-tabs',
    title: 'Onglets hub',
    body: 'Discussion, organisation, laboratoire, marché, R4V3… change d’onglet pour explorer tout le hub.',
    targetSelector: 'app-showcase-tabs',
    fallbackSelectors: ['.app-hub-showcase-block .showcase-tabs'],
    revealSelectors: ['app-showcase-tabs'],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    skipWhen: 'showcase-off',
    pad: 0,
    tokenAnchor: 'below',
    stickyClear: false,
  },
  {
    id: 'showcase-tours',
    title: 'Actualités',
    body: 'Le fil d’actus du hub — nouveautés et annonces. Les non lues sont mises en surbrillance.',
    targetSelector: '#showcase-tab-tours',
    fallbackSelectors: ['[data-tab="tours"]'],
    revealSelectors: [
      '.showcase-panel__body',
      '#showcase-panel-body',
      'app-showcase-news',
      '.showcase-news',
    ],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    enterAction: 'expand-showcase-tours',
    skipWhen: 'showcase-off',
    pad: 0,
    tokenAnchor: 'below',
    layout: 'bubble-left',
    stickyClear: false,
  },
  {
    id: 'showcase-chat',
    title: 'Discussion',
    body: 'L’onglet Discussion pour échanger et suivre l’activité communautaire.',
    targetSelector: '#showcase-tab-rv23',
    fallbackSelectors: ['[data-tab="rv23"]'],
    revealSelectors: [
      'app-showcase-chat',
      '.showcase-chat',
      '.showcase-chat__composer',
      '.showcase-chat__input',
    ],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    enterAction: 'expand-showcase-rv23',
    skipWhen: 'showcase-off',
    pad: 0,
    tokenAnchor: 'above',
    layout: 'bubble-above',
    stickyClear: false,
  },
  {
    id: 'showcase-dao',
    title: 'D.A.O',
    body: 'Actualités et gouvernance de l’écosystème DAO — ouvre la carte R4V3.',
    targetSelector: '[data-dao-symbol="R4V3"]',
    fallbackSelectors: [
      '.showcase-dao__card[data-symbol="R4V3"]',
      '#showcase-tab-daonews',
      '[data-tab="daonews"]',
    ],
    revealSelectors: [
      '[data-dao-symbol="R4V3"]',
      '.dao-drawer',
      'app-showcase-dao-drawer',
    ],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    enterAction: 'expand-showcase-daonews',
    skipWhen: 'showcase-off',
    pad: 0,
    tokenAnchor: 'below',
    layout: 'bubble-left',
    stickyClear: false,
  },
  {
    id: 'showcase-labz',
    title: 'Laboratoire',
    body: 'Laboratoire : consulte l’entrée R4V3 pour le détail du projet natif.',
    targetSelector: '[data-launch-symbol="R4V3"]',
    fallbackSelectors: [
      '.showcase-launch__item[data-symbol="R4V3"]',
      '#showcase-tab-dao',
      '[data-tab="dao"]',
    ],
    revealSelectors: [
      '[data-launch-symbol="R4V3"]',
      '.launch-project-drawer',
      'app-showcase-launch-project-drawer',
    ],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    enterAction: 'expand-showcase-dao',
    skipWhen: 'showcase-off',
    pad: 0,
    tokenAnchor: 'below',
    layout: 'bubble-left',
    stickyClear: false,
  },
  {
    id: 'showcase-market',
    title: 'Marché',
    body: 'Vue marché des jetons — ouvre la ligne R4V3 pour le détail.',
    targetSelector: '.market-panel__row.is-pinned',
    fallbackSelectors: [
      '.market-panel__row[data-symbol="R4V3"]',
      '#showcase-tab-market',
      '[data-tab="market"]',
    ],
    revealSelectors: [
      '.market-panel__row.is-pinned',
      '.market-token-drawer',
      'app-market-token-drawer',
    ],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    enterAction: 'expand-showcase-market',
    skipWhen: 'showcase-off',
    pad: 0,
    tokenAnchor: 'below',
    layout: 'bubble-left',
    stickyClear: false,
  },
  {
    id: 'showcase-r4v3',
    title: 'Hub R4V3',
    body: 'Le hub R4V3 : livre blanc, wiki et questions, et tout le contexte du jeton natif.',
    targetSelector: '#showcase-tab-r4v3',
    fallbackSelectors: ['[data-tab="r4v3"]'],
    revealSelectors: ['app-showcase-r4v3', '.showcase-view--r4v3'],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    enterAction: 'expand-showcase-r4v3',
    skipWhen: 'showcase-off',
    pad: 0,
    tokenAnchor: 'below',
    stickyClear: false,
  },
  {
    id: 'peg-chf',
    title: '1 R4V3 = 1 CHF',
    body: 'Parité de référence affichée ici — lecture simple des montants en francs.',
    targetSelector: '.showcase-r4v3__peg--hero',
    fallbackSelectors: ['.showcase-r4v3__peg-banner'],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    enterAction: 'expand-showcase-r4v3',
    skipWhen: 'showcase-off',
    pad: 0,
    tokenAnchor: 'below',
    stickyClear: false,
  },
  {
    id: 'pillar-chf',
    title: 'Pilier CHF',
    body: 'Parité de référence affichée en temps réel — lecture simple des montants.',
    targetSelector: '[data-pillar-id="peg-chf"]',
    revealSelectors: ['.r4v3-hub-drawer'],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    enterAction: 'expand-showcase-r4v3',
    skipWhen: 'showcase-off',
    pad: 0,
    tokenAnchor: 'below',
    layout: 'bubble-left',
    stickyClear: false,
  },
  {
    id: 'pillar-fast',
    title: 'Pilier Rapide',
    body: 'Transactions de réseau de test quasi instantanées pour les échanges, le robinet et les transferts.',
    targetSelector: '[data-pillar-id="fast"]',
    revealSelectors: ['.r4v3-hub-drawer'],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    enterAction: 'expand-showcase-r4v3',
    skipWhen: 'showcase-off',
    pad: 0,
    tokenAnchor: 'below',
    layout: 'bubble-left',
    stickyClear: false,
  },
  {
    id: 'pillar-utility',
    title: 'Pilier Utilité',
    body: 'Monnaie native de l’écosystème — pivot du laboratoire, du graphique et de l’échange.',
    targetSelector: '[data-pillar-id="utility"]',
    revealSelectors: ['.r4v3-hub-drawer'],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    enterAction: 'expand-showcase-r4v3',
    skipWhen: 'showcase-off',
    pad: 0,
    tokenAnchor: 'below',
    layout: 'bubble-left',
    stickyClear: false,
  },
  {
    id: 'pillar-transparent',
    title: 'Pilier Transparent',
    body: 'Livre blanc, traçabilité et gouvernance documentée — rien en zone grise.',
    targetSelector: '[data-pillar-id="transparent"]',
    revealSelectors: ['.r4v3-hub-drawer'],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    enterAction: 'expand-showcase-r4v3',
    skipWhen: 'showcase-off',
    pad: 0,
    tokenAnchor: 'below',
    layout: 'bubble-left',
    stickyClear: false,
  },
  {
    id: 'pillar-secure',
    title: 'Pilier Sécurisé',
    body: 'Bonnes pratiques de portefeuille et protocole de réseau de test — prudence d’abord.',
    targetSelector: '[data-pillar-id="secure"]',
    revealSelectors: ['.r4v3-hub-drawer'],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    enterAction: 'expand-showcase-r4v3',
    skipWhen: 'showcase-off',
    pad: 0,
    tokenAnchor: 'below',
    layout: 'bubble-left',
    stickyClear: false,
  },
  {
    id: 'pillar-ecosystem',
    title: 'Pilier Écosystème',
    body: 'Laboratoire, échange et hub connectés autour du R4V3.',
    targetSelector: '[data-pillar-id="ecosystem"]',
    revealSelectors: ['.r4v3-hub-drawer'],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    enterAction: 'expand-showcase-r4v3',
    skipWhen: 'showcase-off',
    pad: 0,
    tokenAnchor: 'below',
    layout: 'bubble-left',
    stickyClear: false,
  },
  {
    id: 'whitepaper',
    title: 'Livre blanc',
    body: 'Le document officiel du projet — ouvre-le pour la thèse, la tokenomics et le protocole.',
    targetSelector: '.showcase-r4v3__wp-btn',
    fallbackSelectors: ['.r4v3-summary-bar__wp-btn'],
    revealSelectors: ['.showcase-r4v3__doc-feedback'],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    enterAction: 'expand-showcase-r4v3',
    skipWhen: 'showcase-off',
    interactive: true,
    pad: 4,
    tokenAnchor: 'below',
    stickyClear: false,
  },
  {
    id: 'wiki',
    title: 'Wiki',
    body: 'Le wiki officiel R4V3 — documentation et FAQ structurée.',
    targetSelector: '.showcase-r4v3__rail-btn--left',
    revealSelectors: ['.r4v3-hub-drawer'],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    enterAction: 'expand-showcase-r4v3',
    skipWhen: 'showcase-off',
    interactive: true,
    pad: 4,
    tokenAnchor: 'below',
    layout: 'bubble-left',
    stickyClear: false,
  },
  {
    id: 'faq-community',
    title: 'FAQ communautaire',
    body: 'Pose une question ou lis les réponses partagées par la communauté.',
    targetSelector: '.showcase-r4v3__section-link--community',
    revealSelectors: ['.r4v3-hub-drawer'],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    enterAction: 'expand-showcase-r4v3',
    skipWhen: 'showcase-off',
    interactive: true,
    pad: 0,
    tokenAnchor: 'below',
    layout: 'bubble-left',
    stickyClear: false,
  },
  {
    id: 'swap',
    title: 'Convertir',
    body: 'Ici tu convertis tes R4V3 vers un jeton du laboratoire : paire, montant, puis Convertir.',
    targetSelector: 'app-exchange-panel',
    fallbackSelectors: ['.app-hub-swap-stack', '.exchange-panel'],
    revealSelectors: ['.exchange-panel', 'app-exchange-panel'],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    pad: 0,
    tokenAnchor: 'below',
    stickyClear: false,
  },
  {
    id: 'exchange-max',
    title: 'Montant maximum',
    body: 'Le maximum remplit le solde disponible en un clic — pratique avant de convertir.',
    targetSelector: '.exchange-panel__max-btn',
    fallbackSelectors: ['.exchange-panel__amount-zone'],
    revealSelectors: [
      '.exchange-panel__amount-zone',
      '.exchange-panel__amount-input',
    ],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    pad: 0,
    tokenAnchor: 'below',
    stickyClear: false,
  },
  {
    id: 'exchange-cta',
    title: 'Bouton Convertir',
    body: 'Quand le montant est prêt, lance la conversion ici.',
    targetSelector: '.exchange-panel__cta',
    revealSelectors: ['.exchange-panel__feedback'],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    pad: 0,
    tokenAnchor: 'below',
    stickyClear: false,
  },
  {
    id: 'dock-overview',
    title: 'Barre',
    body: 'La barre du bas regroupe portefeuille, robinet, quêtes et l’explorateur de chaîne.',
    targetSelector: '.app-bottom-stack__tabs',
    fallbackSelectors: ['.app-bottom-stack'],
    revealSelectors: ['.app-bottom-stack__tabs'],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    pad: 0,
    tokenAnchor: 'below',
    stickyClear: false,
  },
  {
    id: 'wallet',
    title: 'Portefeuille',
    body: 'Ton portefeuille : adresses, soldes, envoi et réception.',
    targetSelector: '[data-dock-tab="wallet"]',
    revealSelectors: ['app-wallet-panel', '.wallet-display'],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    enterAction: 'expand-dock-wallet',
    pad: 0,
    tokenAnchor: 'below',
    stickyClear: false,
  },
  {
    id: 'wallet-create',
    title: 'Créer un portefeuille',
    body: 'Clique ici pour créer ton portefeuille après l’inscription — c’est ton coffre sur la chaîne.',
    targetSelector: '.wallet-display__create-cta',
    fallbackSelectors: ['.wallet-summary-bar__create'],
    revealSelectors: ['.wallet-display__create-cta', '.auth-drawer'],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    enterAction: 'expand-dock-wallet',
    interactive: true,
    pad: 0,
    tokenAnchor: 'below',
    stickyClear: false,
  },
  {
    id: 'faucet',
    title: 'Robinet',
    body: 'Le robinet te donne des jetons de réseau de test gratuitement pour expérimenter sans risque.',
    targetSelector: '[data-dock-tab="faucet"]',
    revealSelectors: ['app-faucet', '.faucet-panel'],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    enterAction: 'expand-dock-faucet',
    skipWhen: 'faucet-off',
    pad: 0,
    tokenAnchor: 'below',
    stickyClear: false,
  },
  {
    id: 'faucet-claim',
    title: 'Réclamer',
    body: 'Réclamer = récupérer ta dose gratuite quand le délai est prêt.',
    targetSelector: '.faucet-panel__claim',
    fallbackSelectors: ['.faucet-summary-bar__claim'],
    revealSelectors: [
      '.faucet-panel__claim',
      '.faucet-panel__toast',
      '.faucet-panel__feedback',
      '.auth-drawer',
      '.wallet-display__create-cta',
    ],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    enterAction: 'expand-dock-faucet',
    skipWhen: 'faucet-off',
    interactive: true,
    pad: 0,
    tokenAnchor: 'below',
    stickyClear: false,
  },
  {
    id: 'quests',
    title: 'Quêtes',
    body: 'Les quêtes te guident pas à pas sur la chaîne et débloquent des récompenses — regarde la mission active.',
    targetSelector: '[data-dock-tab="quests"]',
    fallbackSelectors: ['app-quests-panel'],
    revealSelectors: ['.app-bottom-stack__panel--quests', 'app-quests-panel'],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    enterAction: 'expand-dock-quests',
    pad: 0,
    tokenAnchor: 'below',
    stickyClear: false,
  },
  {
    id: 'dock-chain',
    title: 'Chaîne',
    body: 'Explorateur de blocs et de la chaîne DartChain.',
    targetSelector: '[data-dock-tab="chain"]',
    revealSelectors: [
      '.app-bottom-stack__panel--chain',
      'app-block-detail-drawer',
    ],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    enterAction: 'expand-dock-chain',
    pad: 0,
    tokenAnchor: 'below',
    stickyClear: false,
  },
  {
    id: 'dock-transactions',
    title: 'Transactions',
    body: 'File d’attente et compositeur — suis les transactions en cours et prépare les tiennes.',
    targetSelector: '[data-dock-tab="transactions"]',
    revealSelectors: [
      '.app-bottom-stack__panel--transactions',
      'app-transactions-dock',
      '.transactions-dock',
    ],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    enterAction: 'expand-dock-transactions',
    pad: 0,
    tokenAnchor: 'below',
    stickyClear: false,
  },
  {
    id: 'dock-peers',
    title: 'Pairs',
    body: 'Les nœuds connectés au réseau — santé et présence des pairs.',
    targetSelector: '[data-dock-tab="peers"]',
    revealSelectors: ['.app-bottom-stack__panel--peers'],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    enterAction: 'expand-dock-peers',
    pad: 0,
    tokenAnchor: 'below',
    stickyClear: false,
  },
  {
    id: 'graph',
    title: 'Graphique',
    body: 'Mesures en direct des cryptomonnaies courantes et du R4V3 — pour lire le marché avant d’échanger.',
    targetSelector: '.app-market-stack--rate',
    fallbackSelectors: ['.app-market-card--rate', 'app-graph'],
    revealSelectors: ['app-graph', '.app-market-card--rate', '.rate-panel'],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    enterAction: 'expand-chart',
    pad: 0,
    tokenAnchor: 'below',
    layout: 'token-right',
    stickyClear: false,
  },
  {
    id: 'arena',
    title: 'MetaVerseBB',
    body: 'Éliminer pour gagner : élimine des joueurs pour une part de leurs jetons du robinet.',
    targetSelector: '.arena-hud__strip',
    fallbackSelectors: ['app-three-floor', 'app-arena-hud'],
    revealSelectors: ['app-three-floor', 'app-arena-hud', '.arena-hud'],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    enterAction: 'scroll-floor',
    pad: 0,
    tokenAnchor: 'above',
    stickyClear: false,
  },
  {
    id: 'star-conquest',
    title: 'Conquête stellaire',
    body: 'Galaxie IA — fais avancer le projet via des quêtes spatiales.',
    targetSelector: 'app-particle-background',
    fallbackSelectors: ['.sc-reward-label'],
    revealSelectors: [
      'app-star-quest-panel',
      'app-star-quest-scanner',
      '.sc-reward-label',
    ],
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    skipWhen: 'sc-off',
    pad: 0,
    tokenAnchor: 'below',
    stickyClear: false,
  },
  {
    id: 'park',
    title: 'Rejouer le tutoriel',
    body: 'Tu peux relancer ce guide à tout moment en cliquant cinq fois rapidement sur le logo R4V3 en haut à gauche.',
    targetSelector: '.logo-shell',
    timeoutMs: ONBOARDING_AUTO_ADVANCE_MS,
    interactive: true,
    enterAction: 'park-logo',
    pad: 0,
    tokenAnchor: 'below',
    stickyClear: false,
  },
] as const;

export interface SpotlightRect {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

/** Pose centre (x/y) + taille pour le handoff intro → tutoriel. */
export interface TourEntryPose {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}
