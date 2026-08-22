/**
 * Phase 1 — Inventaire structurel UI (refonte visuelle DartChain / R4V3).
 *
 * Référence canonique : rien ne doit être supprimé lors des phases 2–20.
 * Mise à jour si un composant est ajouté au shell (app.html).
 */

import { READING_ORDER, TARGET_VIEWPORT } from './ui-layout-zones.constants';

export interface UiElementRef {
  id: string;
  label: string;
  kind: 'button' | 'tab' | 'input' | 'badge' | 'label' | 'icon' | 'chart' | 'table' | 'panel' | 'text' | 'canvas' | 'link';
}

export interface UiComponentManifest {
  selector: string;
  template: string;
  styles: string[];
  elements: UiElementRef[];
  interactions: string[];
  dataFields: string[];
  gatedBy?: string;
}

export interface UiZoneManifest {
  id: string;
  readingOrder: number;
  label: string;
  components: UiComponentManifest[];
  notes?: string[];
}

/** Phase 9 — viewport exclusif 250×500, zero-scroll, finition fintech. */
export const UI_REDESIGN_PHASE = 9;

export const UI_STRUCTURE_MANIFEST: readonly UiZoneManifest[] = [
  {
    id: 'background',
    readingOrder: -1,
    label: 'Fond (particules + floor + scène)',
    notes: [
      'Conservé intégralement — fond WebGL (Pass 2+ pourra réduire la compétition visuelle via opacity tokens)',
    ],
    components: [
      {
        selector: 'app-particle-background',
        template: 'particle-background/particle-background.html',
        styles: ['particle-background/particle-background.css'],
        elements: [
          { id: 'space-overlay', label: 'Overlay radial cyan/magenta', kind: 'panel' },
          { id: 'particle-canvas', label: 'Canvas WebGL particules', kind: 'canvas' },
        ],
        interactions: ['Animation passive', 'Resize viewport', 'Pause tab hidden / reduced-motion'],
        dataFields: [],
      },
      {
        selector: 'app-three-floor',
        template: 'three-floor/three-floor.html',
        styles: ['three-floor/three-floor.css'],
        elements: [{ id: 'floor-canvas', label: 'Grille 3D perspective cyan/magenta', kind: 'canvas' }],
        interactions: ['Scroll illusion floor', 'Resize', 'Pause visibility'],
        dataFields: [],
      },
      {
        selector: 'app-r4v3-scene',
        template: 'r4v3-scene/r4v3-scene.html',
        styles: ['r4v3-scene/r4v3-scene.css'],
        elements: [{ id: 'r4v3-scene-canvas', label: 'Scène 3D logo plein écran', kind: 'canvas' }],
        interactions: ['OrbitControls', 'Double-tap navbar logo toggle', 'Click palette randomize'],
        dataFields: ['rotationChange', 'r4v3SceneVisible'],
        gatedBy: 'ShellFeedbackService.r4v3SceneVisible',
      },
      {
        selector: 'app-r4v3-three',
        template: 'features/r4v3-three/r4v3-three.html',
        styles: ['features/r4v3-three/r4v3-three.css'],
        elements: [{ id: 'navbar-logo-three', label: 'Gem logo 3D navbar', kind: 'canvas' }],
        interactions: ['logoTapped', 'Orbit', 'Double-tap → r4v3-scene'],
        dataFields: ['modelTargetSize', 'cameraFitFactor', 'presentation'],
      },
    ],
  },
  {
    id: 'navbar',
    readingOrder: 0,
    label: 'Navbar + bandeau',
    components: [
      {
        selector: 'app-navbar',
        template: 'navbar/navbar.html',
        styles: ['navbar/navbar.css', 'navbar/navbar-chrome.css', 'navbar/navbar-viewport-compact.css'],
        elements: [
          { id: 'logo-shell', label: 'Logo R4V3 interactif', kind: 'button' },
          { id: 'brand-crypto-select', label: 'Sélecteur token marque', kind: 'button' },
          { id: 'navbar-network-status', label: 'LED + latence ms', kind: 'badge' },
          { id: 'bandeau-accueil', label: 'Ticker défilant', kind: 'text' },
          { id: 'navbar-node-panel', label: 'NODE SYNC % + sparkline', kind: 'button' },
          { id: 'navbar-locale-btn', label: 'FR / EN', kind: 'button' },
          { id: 'navbar-auth', label: 'Login / Register / Logout', kind: 'button' },
          { id: 'navbar-peer-status', label: 'Peers actifs', kind: 'badge' },
          { id: 'searchbar', label: 'Explorer + raccourci Pending', kind: 'input' },
          { id: 'explorer-search', label: 'Recherche block/hash/address', kind: 'input' },
        ],
        interactions: [
          'Logo pulse / keyboard',
          'NODE panel → status drawer',
          'Locale toggle',
          'Auth drawer open',
          'exploreBlock / explorePending emit',
        ],
        dataFields: ['syncPercentLabel', 'health.ok', 'health.latencyMs', 'auth.user', 'locale.localeLabel', 'peer stats'],
      },
      {
        selector: 'app-bandeau-accueil',
        template: 'features/bandeau-accueil/bandeau-accueil.html',
        styles: ['features/bandeau-accueil/bandeau-accueil.css'],
        elements: [
          { id: 'message1', label: 'Annonce bannière', kind: 'text' },
          { id: 'lastTransactionShort', label: 'Dernière transaction', kind: 'text' },
          { id: 'userCount', label: 'Peers connectés', kind: 'text' },
        ],
        interactions: ['Marquee auto-scroll', 'Pointer drag scrub', 'WebSocket live'],
        dataFields: ['message1', 'lastTransactionShort', 'userCount'],
      },
      {
        selector: 'app-auth-drawer',
        template: 'features/auth-drawer/auth-drawer.html',
        styles: ['features/auth-drawer/auth-drawer.css'],
        elements: [
          { id: 'auth-tabs', label: 'Inscription | Connexion', kind: 'tab' },
          { id: 'login-form', label: 'identifier, password', kind: 'input' },
          { id: 'register-form', label: 'username, email, password', kind: 'input' },
        ],
        interactions: ['switchMode', 'submitLogin', 'submitRegister', 'togglePassword', 'closeDrawer'],
        dataFields: ['drawerMode', 'loading', 'error'],
      },
    ],
  },
  {
    id: 'hub',
    readingOrder: 1,
    label: 'Hub marché (graphique + exchange)',
    components: [
      {
        selector: 'app-exchange-panel',
        template: 'features/exchange-panel/exchange-panel.html',
        styles: ['features/exchange-panel/exchange-panel.css'],
        elements: [
          { id: 'pair-eyebrow', label: 'PAIR / TOKEN', kind: 'label' },
          { id: 'testnet-badge', label: 'Testnet', kind: 'badge' },
          { id: 'flip-pair', label: 'Inverser paire ⇅', kind: 'button' },
          { id: 'token-select', label: 'Sélecteur FROM/TO', kind: 'button' },
          { id: 'amount-input', label: 'MONTANT + MAX', kind: 'input' },
          { id: 'estimated-to', label: 'Conversion ≈', kind: 'text' },
          { id: 'solde-row', label: 'SOLDE + USD', kind: 'text' },
          { id: 'prix-row', label: 'PRIX + USD', kind: 'text' },
          { id: 'change-24h', label: '24H CHANGE', kind: 'badge' },
          { id: 'swap-cta', label: 'Swap / Wallet / Connexion', kind: 'button' },
        ],
        interactions: ['flipPair', 'selectFromToken', 'setMaxAmount', 'onSwapClick', 'BrandCrypto sync'],
        dataFields: [
          'fromToken',
          'toToken',
          'amount',
          'estimatedTo',
          'fromBalance',
          'toBalance',
          'rate',
          'change24hLabel',
          'unitUsdPriceTo',
          'swapButtonLabel',
        ],
      },
      {
        selector: 'app-rate-panel',
        template: 'features/rate-panel/rate-panel.html',
        styles: ['features/rate-panel/rate-panel.css'],
        elements: [{ id: 'hub-graph-zone', label: 'Zone graphique hubGraphOnly', kind: 'chart' }],
        interactions: ['Délègue à showcase-chart en mode hub'],
        dataFields: ['hubGraphOnly'],
      },
      {
        selector: 'app-showcase-chart',
        template: 'showcase/components/showcase-chart/showcase-chart.html',
        styles: ['showcase/components/showcase-chart/showcase-chart.css'],
        elements: [
          { id: 'hub-title', label: 'Graphique • PAIR/CURRENCY', kind: 'label' },
          { id: 'period-pills', label: '1H 24H 7D 30D', kind: 'tab' },
          { id: 'chart-svg', label: 'Candlestick + line + volume', kind: 'chart' },
          { id: 'hub-footer-stats', label: 'VOL HIGH LOW CAP TVL', kind: 'text' },
        ],
        interactions: ['selectHubPeriod', 'hover crosshair', 'refresh 30s'],
        dataFields: [
          'selectedSymbol',
          'chartCurrency',
          'activeRange',
          'chartCollapsed',
          'chartPrice',
          'chartDelta',
          'hubFooterVol',
          'hubFooterCap',
          'hubFooterTvl',
        ],
      },
    ],
  },
  {
    id: 'showcase',
    readingOrder: 2,
    label: 'Showcase (tabs + seam collapse + panel)',
    notes: [
      'Tabs niveau A : TOUS R4V3 CHAT LABZ D.A.O MARCHÉ (showcase-tabs)',
      'Tabs niveau B : filtres catégories news (showcase-news) — logique distincte, rendu à différencier Phase 8–9',
      'Chevron discret haut-droite (showcase-toggle / app-panel-collapse-control) : collapse/expand — ne pas supprimer',
    ],
    components: [
      {
        selector: 'app-showcase-tabs',
        template: 'features/showcase-tabs/showcase-tabs.html',
        styles: ['features/showcase-tabs/showcase-tabs.css'],
        elements: [
          { id: 'tab-tours', label: 'TOUS', kind: 'tab' },
          { id: 'tab-r4v3', label: 'R4V3', kind: 'tab' },
          { id: 'tab-rv23', label: 'CHAT', kind: 'tab' },
          { id: 'tab-dao', label: 'LABZ', kind: 'tab' },
          { id: 'tab-daonews', label: 'D.A.O', kind: 'tab' },
          { id: 'tab-market', label: 'MARCHÉ', kind: 'tab' },
        ],
        interactions: ['selectTab → tabChange'],
        dataFields: ['activeTab', 'unreadNewsCount'],
      },
      {
        selector: 'showcase-toggle',
        template: 'features/panel-collapse-control/panel-collapse-control.html',
        styles: ['features/panel-collapse-control/panel-collapse-control.css'],
        elements: [
          {
            id: 'showcase-chevron',
            label: 'Chevron collapse haut-droite (header tabs)',
            kind: 'button',
          },
        ],
        interactions: ['toggleShowcaseCollapsed', 'aria-expanded'],
        dataFields: ['showcaseCollapsed', 'showcaseCollapseLabel'],
      },
      {
        selector: 'app-showcase-panel',
        template: 'features/showcase-panel/showcase-panel.html',
        styles: ['features/showcase-panel/showcase-panel.css'],
        elements: [{ id: 'showcase-window', label: 'Router contenu par onglet', kind: 'panel' }],
        interactions: ['selectBlock emit', 'collapsed handle smart tabs'],
        dataFields: ['activeTab', 'collapsed', 'panelTitle'],
      },
      {
        selector: 'app-showcase-news',
        template: 'features/showcase-news/showcase-news.html',
        styles: ['features/showcase-news/showcase-news.css'],
        elements: [
          { id: 'live-meta', label: 'Bloc #N · chaîne active · age', kind: 'text' },
          { id: 'unread-badge', label: 'Compteur non lues', kind: 'badge' },
          { id: 'news-search', label: 'Rechercher…', kind: 'input' },
          { id: 'news-refresh', label: 'Actualiser', kind: 'button' },
          { id: 'news-meta-bar', label: 'Live, badge, search, refresh, filtre select', kind: 'panel' },
          { id: 'news-list', label: 'Entrées fil actualités', kind: 'table' },
          { id: 'load-more', label: 'CHARGER PLUS', kind: 'button' },
        ],
        interactions: ['selectCategory', 'refresh', 'loadMore', 'openItem drawer', 'runAction navigation'],
        dataFields: ['items', 'categories', 'activeCategory', 'searchQuery', 'liveActivity', 'hasMore'],
      },
      {
        selector: 'app-showcase-chat',
        template: 'features/showcase-chat/showcase-chat.html',
        styles: ['features/showcase-chat/showcase-chat.css'],
        elements: [
          { id: 'chat-room', label: 'Room + status LED', kind: 'label' },
          { id: 'chat-formatting', label: 'Ribbon B/I/U/S couleurs', kind: 'button' },
          { id: 'chat-messages', label: 'Liste messages', kind: 'table' },
          { id: 'chat-composer', label: 'Input + send', kind: 'input' },
        ],
        interactions: ['send message', 'style prefs', 'search filter'],
        dataFields: ['filteredMessages', 'roomLabel', 'connected', 'unreadCount'],
      },
      {
        selector: 'app-showcase-launch',
        template: 'features/showcase-launch/showcase-launch.html',
        styles: ['features/showcase-launch/showcase-launch.css'],
        elements: [
          { id: 'launch-status-pill', label: 'Phase LIVE/SOON/ENDED', kind: 'badge' },
          { id: 'launch-filters', label: 'Filtres statut projet', kind: 'tab' },
          { id: 'launch-list', label: 'Liste projets + SWAP', kind: 'table' },
          { id: 'launch-cta', label: 'CTA Lancer', kind: 'button' },
        ],
        interactions: ['selectStatus', 'swapProject', 'openDrawer LaunchForm'],
        dataFields: ['filteredProjects', 'launchState', 'searchQuery'],
      },
    ],
  },
  {
    id: 'bottom-stack',
    readingOrder: 3,
    label: 'Panel inférieur (contenu dock)',
    components: [
      {
        selector: 'app-wallet-panel',
        template: 'features/wallet-panel/wallet-panel.html',
        styles: ['features/wallet-panel/wallet-panel.css'],
        elements: [
          { id: 'wallet-title', label: 'WALLET / EXPLORER', kind: 'label' },
          { id: 'wallet-network', label: 'RÉSEAU R4V3 MAINNET', kind: 'text' },
          { id: 'wallet-balance', label: 'SOLDE TOTAL', kind: 'text' },
          { id: 'wallet-address', label: 'Adresse + copy', kind: 'button' },
          { id: 'wallet-metrics', label: 'DISPONIBLE / TESTNET', kind: 'text' },
          { id: 'wallet-actions', label: 'ENVOYER RECEVOIR MINE', kind: 'button' },
          { id: 'send-receive-panels', label: 'Formulaires envoi/réception', kind: 'panel' },
        ],
        interactions: ['createWallet', 'refreshAll', 'copyWalletAddress', 'submitSend', 'mine'],
        dataFields: ['formattedTotalBalance', 'walletAddress', 'hasWallet', 'sendForm'],
      },
      {
        selector: 'app-faucet',
        template: 'features/faucet/faucet.html',
        styles: ['features/faucet/faucet.css'],
        elements: [
          { id: 'faucet-balance', label: 'Balance m4t3r', kind: 'text' },
          { id: 'faucet-cooldown', label: 'Cooldown ring', kind: 'badge' },
          { id: 'faucet-claim', label: 'CLAIM', kind: 'button' },
          { id: 'faucet-history', label: 'Claims history + VIEW ALL', kind: 'table' },
        ],
        interactions: ['claim', 'cooldown countdown'],
        dataFields: ['displayLine', 'cooldownLabel', 'history', 'eligible'],
        gatedBy: 'product.faucetEnabled',
      },
      {
        selector: 'app-pending-transactions',
        template: 'features/pending-transactions/pending-transactions.html',
        styles: ['features/pending-transactions/pending-transactions.css'],
        elements: [
          { id: 'pending-count', label: 'N en attente + total R4V3', kind: 'badge' },
          { id: 'pending-filter', label: 'Filtrer', kind: 'input' },
          { id: 'pending-list', label: 'Liste tx + Mine', kind: 'table' },
          { id: 'create-tx-cta', label: 'CRÉER UNE TX', kind: 'button' },
        ],
        interactions: ['refresh', 'mineTransaction', 'mineAll', 'openComposerDock'],
        dataFields: ['filteredTransactions', 'transactionCount', 'totalAmount'],
      },
      {
        selector: 'app-block-composer',
        template: 'features/block-composer/block-composer.html',
        styles: ['features/block-composer/block-composer.css'],
        elements: [
          { id: 'composer-tip', label: 'Tip #N / Sync / Mempool', kind: 'text' },
          { id: 'composer-form', label: 'FROM TO AMOUNT MESSAGE', kind: 'input' },
          { id: 'composer-actions', label: 'Mon wallet Reset Voir pending Créer TX', kind: 'button' },
        ],
        interactions: ['submit', 'fillFromWallet', 'openLatestBlock', 'openPendingDock'],
        dataFields: ['form', 'latestBlock', 'rawTextLength'],
      },
      {
        selector: 'app-blocks-list',
        template: 'features/blocks-list/blocks-list.html',
        styles: ['features/blocks-list/blocks-list.css'],
        elements: [
          { id: 'chain-view-toggle', label: 'LISTE | GRAPHE', kind: 'tab' },
          { id: 'chain-filters', label: 'Filtrer Wallet De À', kind: 'input' },
          { id: 'chain-export', label: 'EXPORT JSON COPY TIP', kind: 'button' },
          { id: 'block-rows', label: 'Liste blocs', kind: 'table' },
          { id: 'chain-graph', label: 'Graphe nodes', kind: 'chart' },
        ],
        interactions: ['setViewMode', 'exportFilteredBlocks', 'openBlock', 'refresh'],
        dataFields: ['blocks', 'filteredBlocks', 'viewMode', 'chainStatusLabel'],
      },
      {
        selector: 'app-market-panel',
        template: 'features/market-panel/market-panel.html',
        styles: ['features/market-panel/market-panel.css'],
        elements: [
          { id: 'market-featured', label: 'Ticker hero MTS/USD', kind: 'text' },
          { id: 'market-chart', label: 'Mini candlestick', kind: 'chart' },
          { id: 'market-filters', label: 'ALL MTS FAV ★', kind: 'tab' },
          { id: 'market-table', label: 'ASSET PRICE 24H VOLUME BUY SELL', kind: 'table' },
        ],
        interactions: ['setChartRange', 'toggleFavorite', 'onBuy', 'onSell'],
        dataFields: ['featuredAsset', 'filteredRows', 'searchQuery'],
      },
      {
        selector: 'app-quests-panel',
        template: 'features/quests-panel/quests-panel.html',
        styles: ['features/quests-panel/quests-panel.css'],
        elements: [
          { id: 'quests-xp', label: 'TOTAL XP + RÉCOMPENSES', kind: 'badge' },
          { id: 'quests-mission', label: 'Network Guardian + progress', kind: 'panel' },
          { id: 'quests-daily', label: 'DAILY TASKS + reset timer', kind: 'table' },
          { id: 'quests-weekly', label: 'WEEKLY REWARD + XP BOOST', kind: 'panel' },
        ],
        interactions: ['onClaimMission', 'onClaim task', 'onGo navigation', 'onClaimWeekly'],
        dataFields: ['totalXp', 'mission', 'tasks', 'weekly', 'resetCountdown'],
      },
      {
        selector: 'app-peer-panel',
        template: 'features/peer-panel/peer-panel.html',
        styles: ['features/peer-panel/peer-panel.css'],
        elements: [
          { id: 'peer-kpi', label: 'NETWORK PEERS LATENCY LOAD', kind: 'badge' },
          { id: 'peer-filters', label: 'ALL CONNECTED FAVORITES +', kind: 'tab' },
          { id: 'peer-table', label: 'PEER STATUS LATENCY ACTIVITY', kind: 'table' },
        ],
        interactions: ['refreshAll', 'addPeer', 'toggleFavorite', 'reconnectPeer'],
        dataFields: ['networkStats', 'filteredRows', 'peerInput'],
      },
      {
        selector: 'app-admin-panel',
        template: 'features/admin-panel/admin-panel.html',
        styles: ['features/admin-panel/admin-panel.css'],
        elements: [
          { id: 'admin-snapshot', label: 'Ops gauges latency counters events', kind: 'panel' },
        ],
        interactions: ['refresh ops snapshot'],
        dataFields: ['snapshot'],
        gatedBy: 'auth.isAdmin()',
      },
    ],
  },
  {
    id: 'bottom-dock',
    readingOrder: 4,
    label: 'Navigation bas (bottom-dock)',
    components: [
      {
        selector: '.bottom-dock',
        template: 'app.html',
        styles: ['app.css'],
        elements: [
          { id: 'dock-wallet', label: 'Wallet', kind: 'tab' },
          { id: 'dock-faucet', label: 'Faucet', kind: 'tab' },
          { id: 'dock-pending', label: 'Pending', kind: 'tab' },
          { id: 'dock-block', label: 'Block', kind: 'tab' },
          { id: 'dock-chain', label: 'Chain', kind: 'tab' },
          { id: 'dock-quests', label: 'Quêtes', kind: 'tab' },
          { id: 'dock-peers', label: 'Peers', kind: 'tab' },
          { id: 'dock-admin', label: 'Admin', kind: 'tab' },
        ],
        interactions: ['onBottomTabChange', 'dock-open-panel event', 'DockNavigationService'],
        dataFields: ['activeBottomTab'],
      },
    ],
  },
  {
    id: 'overlays',
    readingOrder: 5,
    label: 'Overlays et drawers',
    components: [
      {
        selector: 'app-block-detail-drawer',
        template: 'features/block-detail-drawer/block-detail-drawer.html',
        styles: ['features/block-detail-drawer/block-detail-drawer.css'],
        elements: [{ id: 'block-detail-grid', label: 'Index Hash Nonce Difficulté…', kind: 'panel' }],
        interactions: ['closeDrawer', 'open from explorer/blocks'],
        dataFields: ['block', 'open'],
      },
      {
        selector: 'app-launch-form-drawer',
        template: 'features/launch-form-drawer/launch-form-drawer.html',
        styles: ['features/launch-form-drawer/launch-form-drawer.css'],
        elements: [{ id: 'launch-form', label: 'Formulaire token LaunchLab', kind: 'input' }],
        interactions: ['submit create', 'logo upload', 'closeDrawer'],
        dataFields: ['form', 'logoPreview', 'submitting'],
      },
      {
        selector: 'app-status-overlay',
        template: 'features/status-overlay/status-overlay.html',
        styles: ['features/status-overlay/status-overlay.css'],
        elements: [{ id: 'network-health', label: 'Latence service endpoint', kind: 'panel' }],
        interactions: ['refresh health', 'close status drawer'],
        dataFields: ['health', 'latencyLabel'],
      },
      {
        selector: 'app-error-banner',
        template: 'features/error-banner/error-banner.html',
        styles: ['features/error-banner/error-banner.css'],
        elements: [{ id: 'shell-error', label: 'Message erreur bannière', kind: 'text' }],
        interactions: ['Affichage seul'],
        dataFields: ['message'],
      },
      {
        selector: '.app-quest-feedback',
        template: 'app.html',
        styles: ['app.css'],
        elements: [{ id: 'quest-toast', label: 'Feedback quête info/error', kind: 'badge' }],
        interactions: ['Auto QuestsProgressService'],
        dataFields: ['feedback.kind', 'feedback.message'],
      },
    ],
  },
] as const;

/** Composants legacy présents dans le repo mais non montés dans app.html actuel. */
export const LEGACY_ORPHAN_COMPONENTS = [
  'app-dock-tabs (features/dock-tabs/)',
  'app-dock-panel (features/dock-panel/)',
  'app-dock-summary/* (dock-*-summary)',
] as const;

export function countManifestElements(): number {
  return UI_STRUCTURE_MANIFEST.reduce(
    (sum, zone) => sum + zone.components.reduce((s, c) => s + c.elements.length, 0),
    0,
  );
}

export function countManifestInteractions(): number {
  return UI_STRUCTURE_MANIFEST.reduce(
    (sum, zone) => sum + zone.components.reduce((s, c) => s + c.interactions.length, 0),
    0,
  );
}

export function getZoneById(id: string): UiZoneManifest | undefined {
  return UI_STRUCTURE_MANIFEST.find((z) => z.id === id);
}

/** Valide que l’ordre de lecture Phase 1 est documenté. */
export function assertReadingOrderCoverage(): void {
  const documented = new Set(
    UI_STRUCTURE_MANIFEST.filter((z) => z.readingOrder >= 0).map((z) => {
      const map: Record<string, (typeof READING_ORDER)[number]> = {
        navbar: 'navbar',
        hub: 'exchange',
        showcase: 'showcase-header',
        'bottom-stack': 'bottom-panel',
        'bottom-dock': 'bottom-dock',
      };
      return map[z.id];
    }),
  );
  for (const zone of READING_ORDER) {
    if (zone === 'chart' || zone === 'showcase-panel' || zone === 'floor-peek') {
      continue;
    }
    if (!documented.has(zone) && zone !== 'exchange') {
      throw new Error(`Phase 1: zone de lecture non documentée: ${zone}`);
    }
  }
}

export const PHASE1_SUMMARY = {
  phase: UI_REDESIGN_PHASE,
  targetViewport: TARGET_VIEWPORT,
  readingOrder: READING_ORDER,
  zoneCount: UI_STRUCTURE_MANIFEST.length,
  componentCount: UI_STRUCTURE_MANIFEST.reduce((s, z) => s + z.components.length, 0),
  elementCount: countManifestElements(),
  interactionCount: countManifestInteractions(),
  legacyOrphans: LEGACY_ORPHAN_COMPONENTS.length,
} as const;
