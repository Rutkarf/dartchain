import { R4v3HubPillar } from '../models/r4v3-hub.model';

export const R4V3_HUB_PILLARS: readonly R4v3HubPillar[] = [
  {
    id: 'peg-chf',
    label: 'CHF / GBP',
    detail: 'Parité de référence affichée en temps réel',
    icon: '₣',
    accent: 'cyan',
    drawerTitle: '1 R4V3 = 1 franc suisse ou 1 livre sterling',
    drawerSummary:
      'Le R4V3 est présenté avec une parité pédagogique à 1 CHF / 1 GBP pour simplifier la lecture des montants.',
    sections: [
      {
        title: 'Pourquoi CHF et GBP ?',
        body: 'Le franc suisse et la livre sterling offrent des références stables et familières. Sur testnet, cette double parité permet de comprendre instantanément l’ordre de grandeur d’un montant sans conversion mentale.',
      },
      {
        title: 'Mécanisme de stabilité',
        body: 'L’ancrage est d’abord un mécanisme d’affichage : le hub, le graphique et l’exchange panel synchronisent la cotation R4V3/CHF et R4V3/GBP. Les tokens LaunchLab restent exprimés relativement au R4V3.',
      },
      {
        title: 'Garanties affichées',
        body: 'Ce n’est pas une promesse financière régulée. La transparence repose sur le white paper, la FAQ officielle et la traçabilité testnet — pas sur une réserve bancaire.',
      },
    ],
  },
  {
    id: 'fast',
    label: 'Rapide',
    detail: 'Transactions testnet quasi instantanées',
    icon: '⏱',
    accent: 'green',
    drawerTitle: 'Rapidité & débit',
    drawerSummary: 'Le R4V3 est optimisé pour des interactions fluides dans l’application DartChain.',
    sections: [
      {
        title: 'Temps de transaction',
        body: 'Sur testnet, les opérations (faucet, swap, transferts) sont confirmées en quelques secondes. La latence API est affichée dynamiquement dans le header du hub.',
      },
      {
        title: 'Débit',
        body: 'Le réseau de démonstration supporte un flux continu d’opérations LaunchLab sans file d’attente perceptible pour l’utilisateur.',
      },
      {
        title: 'Cas d’usage',
        body: 'Swap R4V3 ↔ LaunchLab, crédit faucet, navigation graphique + exchange : chaque action est pensée pour rester instantanée côté UX.',
      },
    ],
  },
  {
    id: 'utility',
    label: 'Utility',
    detail: 'Monnaie native de l’écosystème DartChain',
    icon: '⚡',
    accent: 'magenta',
    drawerTitle: 'Utility coin R4V3',
    drawerSummary: 'Le R4V3 n’est pas un memecoin : c’est la monnaie de référence de l’application.',
    sections: [
      {
        title: 'À quoi sert-il ?',
        body: 'Quote LaunchLab, swap, faucet, affichage des prix et synchronisation navbar ↔ graphique ↔ exchange panel.',
      },
      {
        title: 'Où l’utiliser ?',
        body: 'Exchange panel (m4t3r), sélecteur navbar, graphique R4V3, hub FAQ et barre repliée pour un accès rapide.',
      },
      {
        title: 'Dans l’écosystème',
        body: 'Tous les tokens LaunchLab (PXD, NVFI, LAB3, ORB) sont cotés vs R4V3. C’est le pivot économique testnet.',
      },
    ],
  },
  {
    id: 'transparent',
    label: 'Transparent',
    detail: 'White paper, traçabilité et gouvernance documentée',
    icon: '◉',
    accent: 'gold',
    drawerTitle: 'Transparence & traçabilité',
    drawerSummary: 'Documentation ouverte et mécanismes expliqués publiquement.',
    sections: [
      {
        title: 'Documentation',
        body: 'White paper téléchargeable, FAQ officielle et hub interactif — trois niveaux de profondeur pour le même sujet.',
      },
      {
        title: 'Traçabilité',
        body: 'Les opérations testnet sont consultables via l’explorateur et le fil TOUS. Aucune zone grise sur l’origine des données affichées.',
      },
      {
        title: 'Gouvernance',
        body: 'La FAQ communautaire permet aux utilisateurs de poser des questions ; le staff valide les réponses officielles.',
      },
    ],
  },
  {
    id: 'secure',
    label: 'Sécurisé',
    detail: 'Bonnes pratiques wallet et protocole testnet',
    icon: '🛡',
    accent: 'violet',
    drawerTitle: 'Sécurité du protocole',
    drawerSummary: 'Principes de sécurité pour utiliser le R4V3 en environnement testnet.',
    sections: [
      {
        title: 'Protocole',
        body: 'DartChain testnet isole les fonds de démonstration du mainnet. Les clés privées restent sous contrôle utilisateur via le wallet intégré.',
      },
      {
        title: 'Wallet',
        body: 'Ne partagez jamais seed phrase ou clé privée. Utilisez des mots de passe forts pour votre compte application.',
      },
      {
        title: 'Testnet',
        body: 'Les R4V3 testnet n’ont aucune valeur réelle. Traitez-les comme des jetons de démo — la sécurité vise la bonne hygiène crypto.',
      },
    ],
  },
  {
    id: 'ecosystem',
    label: 'Écosystème',
    detail: 'LaunchLab, swap et hub connectés',
    icon: '◎',
    accent: 'blue',
    drawerTitle: 'R4V3 dans l’écosystème',
    drawerSummary: 'Le token natif au centre de LaunchLab, du graphique et du swap.',
    sections: [
      {
        title: 'LaunchLab',
        body: 'Création et cotation de tokens vs R4V3. Sélection navbar → sync graphique + paire exchange automatique.',
      },
      {
        title: 'Hub & FAQ',
        body: 'Ce showcase centralise l’information officielle et la FAQ communautaire — complémentaire au fil TOUS et au chart.',
      },
      {
        title: 'Évolution',
        body: 'Architecture prête pour une FAQ administrable, des deep-links et des notifications protocolaires depuis la barre repliée.',
      },
    ],
  },
] as const;
