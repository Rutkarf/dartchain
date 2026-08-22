import {
  R4v3FaqCategory,
  R4v3FaqCategoryId,
  R4v3FaqEntry,
  R4v3FaqHighlight,
} from '@showcase/models/r4v3-faq.model';

export const R4V3_FAQ_CATEGORIES: readonly R4v3FaqCategory[] = [
  { id: 'essentiel', label: 'Essentiel', icon: '◆' },
  { id: 'utilisation', label: 'Utilisation', icon: '→' },
  { id: 'stabilite', label: 'Stabilité', icon: '≡' },
  { id: 'ecosysteme', label: 'Écosystème', icon: '◎' },
  { id: 'evolution', label: 'Évolution', icon: '↗' },
] as const;

export const R4V3_FAQ_HIGHLIGHTS: readonly R4v3FaqHighlight[] = [
  {
    id: 'peg-chf',
    label: 'CHF',
    detail: 'Ancrage de parité affiché dans l’application',
    icon: '₣',
  },
  {
    id: 'utility',
    label: 'Utility coin',
    detail: 'Monnaie native pour payer, swapper et lancer sur DartChain',
    icon: '⚡',
  },
  {
    id: 'speed',
    label: 'Rapide',
    detail: 'Transactions testnet quasi instantanées',
    icon: '⏱',
  },
  {
    id: 'transparent',
    label: 'Transparent',
    detail: 'White paper et mécanismes documentés',
    icon: '◉',
  },
] as const;

export const R4V3_FAQ_ENTRIES: readonly R4v3FaqEntry[] = [
  {
    id: 'what-is-r4v3',
    categoryId: 'essentiel',
    title: "Qu'est-ce que le R4V3 ?",
    summary: 'Le token natif et stable de DartChain, conçu comme monnaie de référence de l’écosystème.',
    body: `Le R4V3 est le token natif de DartChain. Il sert de monnaie de référence dans l’application : affichage des prix, swaps LaunchLab, faucet testnet et interactions réseau.

Contrairement aux tokens LaunchLab (PXD, NVFI, etc.), le R4V3 n’est pas un memecoin spéculatif : c’est un utility coin pensé pour être compris rapidement et utilisé au quotidien dans l’écosystème.`,
    popular: true,
    tags: ['natif', 'utility', 'dartchain'],
  },
  {
    id: 'peg-chf',
    categoryId: 'essentiel',
    title: 'Pourquoi le R4V3 vaut-il 1 franc suisse ?',
    summary: 'Parité pédagogique à 1 CHF pour simplifier la lecture des montants dans l’interface.',
    body: `Dans DartChain, le R4V3 est présenté avec une parité de référence de **1 R4V3 = 1 franc suisse** (CHF).

Ce n’est pas une promesse financière régulée : c’est un ancrage d’affichage qui permet de lire les montants sans conversion mentale compliquée. Sur testnet, cette parité facilite les démonstrations, les swaps LaunchLab et la comparaison des valeurs entre tokens.

Le graphique et le hub R4V3 affichent cette référence pour que tout utilisateur comprenne immédiatement l’ordre de grandeur d’un montant.`,
    popular: true,
    isNew: true,
    updatedAt: '2026-07-01',
    tags: ['peg', 'chf', 'parité'],
  },
  {
    id: 'role-dartchain',
    categoryId: 'essentiel',
    title: 'À quoi sert le R4V3 dans DartChain ?',
    summary: 'Payer les frais, swapper, alimenter le faucet et servir de quote pour LaunchLab.',
    body: `Le R4V3 remplit plusieurs rôles complémentaires :

• **Monnaie native** — unité de compte par défaut dans l’interface
• **Quote LaunchLab** — les tokens lancés sont cotés vs R4V3
• **Swap** — échange R4V3 ↔ tokens LaunchLab via le panneau Exchange
• **Faucet testnet** — obtention de R4V3 pour tester sans friction
• **Référence graphique** — base de lecture des paires et des tendances

En résumé : le R4V3 est le point d’entrée économique de l’écosystème DartChain.`,
    popular: true,
    tags: ['usage', 'launchlab', 'swap'],
  },
  {
    id: 'get-r4v3',
    categoryId: 'utilisation',
    title: 'Comment obtenir des R4V3 ?',
    summary: 'Via le faucet testnet ou en recevant des tokens après un swap.',
    body: `Sur l’environnement testnet DartChain, le moyen le plus simple d’obtenir des R4V3 est le **faucet** intégré à l’application.

Vous pouvez aussi en recevoir après un swap depuis un token LaunchLab, ou via les flux de démonstration prévus dans l’écosystème.

Connectez-vous ou créez un wallet testnet, ouvrez le faucet et demandez un crédit. Les montants affichés en **m4t3r** dans l’exchange panel correspondent à la micro-unité du R4V3.`,
    actionType: 'OPEN_FAUCET',
    actionLabel: 'Ouvrir le faucet',
    tags: ['faucet', 'obtenir', 'testnet'],
  },
  {
    id: 'use-r4v3',
    categoryId: 'utilisation',
    title: 'Comment utiliser le R4V3 ?',
    summary: 'Swapper, consulter le graphique, explorer les paires LaunchLab.',
    body: `Une fois crédité, vous pouvez :

1. **Consulter** le graphique R4V3 et les paires LaunchLab
2. **Swapper** via le panneau Exchange (R4V3 → token ou inverse)
3. **Sélectionner** R4V3 dans la navbar pour synchroniser graphique et swap
4. **Suivre** l’activité réseau dans les autres onglets du showcase

L’interface est conçue pour que la sélection du R4V3 dans la navbar ouvre directement le contexte token + swap.`,
    actionType: 'OPEN_SWAP',
    actionLabel: 'Ouvrir le swap',
    tags: ['swap', 'graphique', 'navbar'],
  },
  {
    id: 'm4t3r-unit',
    categoryId: 'utilisation',
    title: "Qu'est-ce que le m4t3r ?",
    summary: 'La plus petite unité affichée du R4V3 dans l’exchange panel.',
    body: `Le **m4t3r** est le libellé UI de la micro-unité R4V3 dans le panneau Exchange — aligné sur le faucet et les soldes testnet.

Afficher les montants en m4t3r permet de saisir de très petites quantités sans notation scientifique, tout en gardant le R4V3 comme symbole principal ailleurs dans l’application (navbar, graphique, paires LaunchLab).`,
    tags: ['m4t3r', 'unité', 'exchange'],
  },
  {
    id: 'swap-launchlab',
    categoryId: 'utilisation',
    title: 'Comment échanger R4V3 contre un token LaunchLab ?',
    summary: 'Sélectionnez une paire R4V3 → PXD (ou autre) dans le panneau Exchange.',
    body: `Le swap est **unidirectionnel par défaut** : R4V3 est la source, le token LaunchLab la destination.

1. Ouvrez le panneau Exchange sous le graphique
2. Choisissez le token LaunchLab (PXD, NVFI, LAB3, ORB…)
3. Saisissez un montant en m4t3r
4. Confirmez le swap

Vous pouvez aussi sélectionner un token LaunchLab depuis la navbar : le graphique et le swap se synchronisent automatiquement.`,
    actionType: 'OPEN_SWAP',
    actionLabel: 'Aller au swap',
    tags: ['launchlab', 'exchange', 'pxd'],
  },
  {
    id: 'stability-mechanism',
    categoryId: 'stabilite',
    title: 'Comment fonctionne la stabilité du R4V3 ?',
    summary: 'Mécanisme de peg pédagogique et affichage constant à 1 CHF sur testnet.',
    body: `Sur testnet, la « stabilité » du R4V3 est **pédagogique** : l’interface maintient une parité d’affichage à 1 CHF pour éviter la volatilité visuelle des demos.

Le mécanisme repose sur :
• un **ancrage d’affichage** (1 R4V3 = 1 franc suisse)
• des **quotes LaunchLab** exprimées vs R4V3
• un **white paper** décrivant le modèle visé

Ce n’est pas un stablecoin régulé mainnet : c’est un utility token testnet conçu pour être prévisible dans l’UX.`,
    tags: ['stabilité', 'peg', 'testnet'],
  },
  {
    id: 'peg-explained',
    categoryId: 'stabilite',
    title: 'Comment fonctionne le peg ?',
    summary: 'Référence fixe à 1 CHF pour l’affichage, distincte des tokens LaunchLab volatils.',
    body: `Le **peg** (ancrage) du R4V3 signifie que l’application présente le token comme valant **1 franc suisse** en référence.

Les tokens LaunchLab, eux, fluctuent relativement au R4V3 selon l’activité testnet et les scénarios de démo. Cette séparation permet de comprendre :
• le R4V3 = unité stable de lecture
• les tokens LaunchLab = actifs d’expérimentation

Le graphique R4V3 reflète cette stabilité ; les graphiques LaunchLab montrent la dynamique relative.`,
    popular: true,
    tags: ['peg', 'chf', 'launchlab'],
  },
  {
    id: 'guarantees',
    categoryId: 'stabilite',
    title: 'Quelles garanties existent ?',
    summary: 'Transparence documentaire et environnement testnet — pas de garantie financière.',
    body: `DartChain testnet est un environnement de démonstration. Les garanties portent sur la **transparence** et la **pédagogie**, pas sur une couverture financière :

• White paper accessible depuis le hub R4V3
• Mécanismes décrits dans cette FAQ
• Code et API ouverts pour inspection
• Pas de promesse de rendement ou de parité régulée

Pour toute utilisation au-delà du testnet, consultez la documentation officielle et les mises à jour du projet.`,
    actionType: 'OPEN_WHITEPAPER',
    actionLabel: 'Lire le white paper',
    tags: ['garanties', 'white paper', 'transparence'],
  },
  {
    id: 'advantages',
    categoryId: 'ecosysteme',
    title: 'Quels sont les avantages pour les utilisateurs ?',
    summary: 'Simplicité, prévisibilité des montants, accès LaunchLab et onboarding rapide.',
    body: `• **Lisibilité** — 1 R4V3 = 1 CHF, pas de surprise sur l’ordre de grandeur
• **Onboarding** — faucet + FAQ intégrée pour démarrer sans doc externe
• **Interopérabilité** — swap direct avec les tokens LaunchLab
• **Cohérence UI** — navbar, graphique et exchange synchronisés
• **Évolutivité** — hub d’information mis à jour avec l’écosystème

Le R4V3 est pensé pour réduire la friction cognitive, pas pour promettre un gain spéculatif.`,
    tags: ['avantages', 'ux', 'onboarding'],
  },
  {
    id: 'security',
    categoryId: 'ecosysteme',
    title: 'Le R4V3 est-il sécurisé ?',
    summary: 'Bonnes pratiques wallet testnet ; ne jamais traiter le testnet comme un actif réel.',
    body: `Sur testnet, la sécurité repose sur les mêmes principes que tout wallet crypto :

• Ne partagez jamais votre clé privée ou seed phrase
• Utilisez des mots de passe forts pour votre compte DartChain
• Considérez les R4V3 testnet comme des jetons de démo sans valeur réelle
• Vérifiez les URLs et l’authenticité de l’application

Les transactions sont traçables on-chain dans l’explorateur intégré. Pour un audit complet, référez-vous au white paper et au dépôt source.`,
    tags: ['sécurité', 'wallet', 'testnet'],
  },
  {
    id: 'roadmap',
    categoryId: 'evolution',
    title: 'Quelles sont les prochaines évolutions ?',
    summary: 'FAQ évolutive, enrichissement LaunchLab et documentation officielle continue.',
    body: `Le hub R4V3 est conçu pour évoluer avec l’écosystème :

• Nouvelles questions ajoutées au fil des retours utilisateurs
• Intégration renforcée avec LaunchLab et le graphique
• Documentation officielle (white paper) mise à jour
• Possibilité future d’administration des FAQ via API

Cette FAQ remplace l’ancien panneau technique : l’objectif est un centre d’information vivant, pas une page de doc statique.`,
    isNew: true,
    updatedAt: '2026-07-17',
    tags: ['roadmap', 'faq', 'évolution'],
  },
  {
    id: 'whitepaper',
    categoryId: 'evolution',
    title: 'Où consulter le white paper ?',
    summary: 'Accessible via l’icône document dans le hub R4V3 ou en téléchargement .txt.',
    body: `Le white paper R4V3 est disponible depuis le hub (icône document en haut à droite) et peut être téléchargé au format texte.

Il complète cette FAQ avec le contexte technique, le modèle de token et la vision long terme de DartChain. Consultez-le pour approfondir au-delà des réponses rapides.`,
    actionType: 'OPEN_WHITEPAPER',
    actionLabel: 'Ouvrir le white paper',
    tags: ['white paper', 'documentation'],
  },
] as const;

export function r4v3FaqCategoryLabel(categoryId: R4v3FaqCategoryId): string {
  return R4V3_FAQ_CATEGORIES.find((c) => c.id === categoryId)?.label ?? categoryId;
}

export function r4v3FaqCategoryIcon(categoryId: R4v3FaqCategoryId): string {
  return R4V3_FAQ_CATEGORIES.find((c) => c.id === categoryId)?.icon ?? '·';
}
