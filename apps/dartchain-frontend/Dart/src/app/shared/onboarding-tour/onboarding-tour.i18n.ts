import type { AppLocale } from '@core/i18n/locale.messages';

export interface OnboardingStepCopy {
  readonly title: string;
  readonly body: string;
}

export interface OnboardingUiCopy {
  readonly kicker: string;
  readonly skip: string;
  readonly back: string;
  readonly next: string;
  readonly ok: string;
  readonly pausedHint: string;
  readonly replay: string;
}

export const ONBOARDING_UI_COPY: Record<AppLocale, OnboardingUiCopy> = {
  fr: {
    kicker: 'Tutoriel',
    skip: 'Passer',
    back: 'Précédent',
    next: 'Suivant',
    ok: 'OK',
    pausedHint: 'Ferme le tiroir pour continuer.',
    replay: 'Rejouer le tutoriel',
  },
};

export const ONBOARDING_STEP_COPY: Record<
  AppLocale,
  Record<string, OnboardingStepCopy>
> = {
  fr: {
    'network-status': {
      title: 'LED et Activité',
      body: 'LED orange : Anonyme. LED verte : Connecter. LED rouge : Indisponible.',
    },
    register: {
      title: 'Inscription',
      body: 'Inscrit ton compte Ici pour pouvoir utiliser la blockchain et bien plus encore ! D.Y.O.R',
    },
    login: {
      title: 'Connexion',
      body: 'Si tu as déjà un compte, connecte-toi ici.',
    },
    'brand-crypto': {
      title: 'Jeton actif',
      body: 'Choisis ici le jeton affiché dans le hub, il synchronise le graphique et l’exchange.',
    },
    bandeau: {
      title: 'Pouls du réseau',
      body: 'Cet espace d’information en direct sur le hub blockchain peut aller d’avant en arrière en restant cliqué dessus.\nClique sur l’un de ces composants pour obtenir plus d’information.',
    },
    'collapse-panels': {
      title: 'Réduire / agrandir',
      body: 'Ces chevrons replient ou ouvrent chaque panneau — utile pour libérer l’écran.',
    },
    'dock-overview': {
      title: 'Barre',
      body: 'La barre du bas regroupe portefeuille, robinet, quêtes et l’explorateur de chaîne.',
    },
    'dock-admin': {
      title: 'Administration',
      body: 'Panneau d’exploitation — réservé aux comptes autorisés.',
    },
    'dock-chain': {
      title: 'Chaîne',
      body: 'Explorateur de blocs et de la chaîne DartChain.',
    },
    'dock-transactions': {
      title: 'Transactions',
      body: 'File d’attente et compositeur — suis les transactions en cours et prépare les tiennes.',
    },
    'dock-peers': {
      title: 'Pairs',
      body: 'Les nœuds connectés au réseau — santé et présence des pairs.',
    },
    swap: {
      title: 'Convertir',
      body: 'Ici tu convertis tes R4V3 vers un jeton du laboratoire : paire, montant, puis Convertir.',
    },
    'exchange-max': {
      title: 'Montant maximum',
      body: 'Le maximum remplit le solde disponible en un clic — pratique avant de convertir.',
    },
    'exchange-cta': {
      title: 'Bouton Convertir',
      body: 'Quand le montant est prêt, lance la conversion ici.',
    },
    'showcase-tabs': {
      title: 'Onglets hub',
      body: 'Discussion, organisation, laboratoire, marché, R4V3… change d’onglet pour explorer tout le hub.',
    },
    'showcase-chat': {
      title: 'Discussion',
      body: 'L’onglet Discussion pour échanger et suivre l’activité communautaire.',
    },
    'showcase-dao': {
      title: 'D.A.O',
      body: 'Actualités et gouvernance de l’écosystème DAO.',
    },
    'showcase-labz': {
      title: 'Laboratoire',
      body: 'Laboratoire : projets et jetons lancés sur le hub.',
    },
    'showcase-market': {
      title: 'Marché',
      body: 'Vue marché des jetons — lectures et tendances.',
    },
    'showcase-tours': {
      title: 'Actualités',
      body: 'Le fil d’actus du hub — nouveautés et annonces.',
    },
    'showcase-r4v3': {
      title: 'Hub R4V3',
      body: 'Le hub R4V3 : livre blanc, wiki et questions, et tout le contexte du jeton natif.',
    },
    'peg-chf': {
      title: '1 R4V3 = 1 CHF',
      body: 'Parité de référence affichée ici — lecture simple des montants en francs.',
    },
    'pillar-chf': {
      title: 'Pilier CHF',
      body: 'Parité de référence affichée en temps réel — lecture simple des montants.',
    },
    'pillar-fast': {
      title: 'Pilier Rapide',
      body: 'Transactions de réseau de test quasi instantanées pour les échanges, le robinet et les transferts.',
    },
    'pillar-utility': {
      title: 'Pilier Utilité',
      body: 'Monnaie native de l’écosystème — pivot du laboratoire, du graphique et de l’échange.',
    },
    'pillar-transparent': {
      title: 'Pilier Transparent',
      body: 'Livre blanc, traçabilité et gouvernance documentée — rien en zone grise.',
    },
    'pillar-secure': {
      title: 'Pilier Sécurisé',
      body: 'Bonnes pratiques de portefeuille et protocole de réseau de test — prudence d’abord.',
    },
    'pillar-ecosystem': {
      title: 'Pilier Écosystème',
      body: 'Laboratoire, échange et hub connectés autour du R4V3.',
    },
    whitepaper: {
      title: 'Livre blanc',
      body: 'Le document officiel du projet — ouvre-le pour la thèse, la tokenomics et le protocole.',
    },
    wiki: {
      title: 'Wiki',
      body: 'Le wiki officiel R4V3 — documentation et FAQ structurée.',
    },
    'faq-community': {
      title: 'FAQ communautaire',
      body: 'Pose une question ou lis les réponses partagées par la communauté.',
    },
    wallet: {
      title: 'Portefeuille',
      body: 'Ton portefeuille : adresses, soldes, envoi et réception.',
    },
    'wallet-create': {
      title: 'Créer un portefeuille',
      body: 'Clique ici pour créer ton portefeuille après l’inscription — c’est ton coffre sur la chaîne.',
    },
    faucet: {
      title: 'Robinet',
      body: 'Le robinet te donne des jetons de réseau de test gratuitement pour expérimenter sans risque.',
    },
    'faucet-claim': {
      title: 'Réclamer',
      body: 'Réclamer = récupérer ta dose gratuite quand le délai est prêt.',
    },
    quests: {
      title: 'Quêtes',
      body: 'Les quêtes te guident pas à pas sur la chaîne et débloquent des récompenses — regarde la mission active.',
    },
    graph: {
      title: 'Graphique',
      body: 'Mesures en direct des cryptomonnaies courantes et du R4V3 — pour lire le marché avant d’échanger.',
    },
    arena: {
      title: 'MetaVerseBB',
      body: 'Éliminer pour gagner : élimine des joueurs pour une part de leurs jetons du robinet.',
    },
    'star-conquest': {
      title: 'Conquête stellaire',
      body: 'Galaxie IA — fais avancer le projet via des quêtes spatiales.',
    },
    'logo-3d': {
      title: 'Logo R4V3',
      body: 'Cinq clics rapides sur le logo relancent le tutoriel du hub.',
    },
    park: {
      title: 'Rejouer le tutoriel',
      body: 'Tu peux relancer ce guide à tout moment en cliquant cinq fois rapidement sur le logo R4V3 en haut à gauche.',
    },
  },
};

export function onboardingUi(locale: AppLocale): OnboardingUiCopy {
  return ONBOARDING_UI_COPY[locale] ?? ONBOARDING_UI_COPY.fr;
}

export function onboardingStepCopy(
  locale: AppLocale,
  stepId: string,
  fallback: OnboardingStepCopy,
): OnboardingStepCopy {
  return (
    ONBOARDING_STEP_COPY[locale]?.[stepId] ??
    ONBOARDING_STEP_COPY.fr[stepId] ??
    fallback
  );
}
