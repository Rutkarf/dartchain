export type AppLocale = 'fr';

export type LocaleKey =
  | 'skip.main'
  | 'locale.toggle'
  | 'panel.collapse'
  | 'panel.expand'
  | 'dock.wallet'
  | 'dock.faucet'
  | 'dock.pending'
  | 'dock.block'
  | 'dock.transactions'
  | 'transactions.composer'
  | 'transactions.mempool'
  | 'transactions.viewMempool'
  | 'transactions.createTx'
  | 'transactions.refreshAll'
  | 'transactions.refreshPending'
  | 'transactions.filter'
  | 'transactions.mineAll'
  | 'transactions.miningAll'
  | 'transactions.mempoolEmpty'
  | 'transactions.mempoolCount'
  | 'dock.chain'
  | 'dock.market'
  | 'dock.quests'
  | 'dock.peers'
  | 'peers.title'
  | 'peers.networkPeers'
  | 'peers.avgLatency'
  | 'peers.networkLoad'
  | 'peers.search'
  | 'peers.filterAll'
  | 'peers.filterConnected'
  | 'peers.filterFavorites'
  | 'peers.connect'
  | 'peers.connectPeer'
  | 'peers.loginRequired'
  | 'peers.refresh'
  | 'peers.copy'
  | 'peers.retry'
  | 'peers.empty'
  | 'peers.emptyFilter'
  | 'peers.summary'
  | 'peers.statusConnected'
  | 'peers.statusConnecting'
  | 'peers.statusDisconnected'
  | 'peers.statusError'
  | 'peers.errorLoad'
  | 'peers.errorConnect'
  | 'peers.errorReconnect'
  | 'peers.errorCopy'
  | 'peers.errorLoginAdd'
  | 'peers.errorLoginReconnect'
  | 'peers.errorInvalidUrl'
  | 'peers.errorInvalidFormat'
  | 'peers.successAdded'
  | 'peers.successReconnected'
  | 'peers.successCopied'
  | 'peers.connectPlaceholder'
  | 'peers.favAdd'
  | 'peers.favRemove'
  | 'peers.disconnect'
  | 'peers.errorDisconnect'
  | 'peers.errorLoginDisconnect'
  | 'peers.successDisconnected'
  | 'peers.estimated'
  | 'peers.errorRateLimit'
  | 'peers.errorStats'
  | 'peers.detailTitle'
  | 'peers.detailClose'
  | 'peers.detailUrl'
  | 'peers.detailStatus'
  | 'peers.detailMessage'
  | 'peers.detailLatency'
  | 'peers.detailSync'
  | 'peers.detailLastSync'
  | 'peers.detailChainHeight'
  | 'peers.openDetail'
  | 'dock.admin'
  | 'admin.title'
  | 'admin.subtitle'
  | 'admin.refresh'
  | 'admin.collected'
  | 'admin.alerts'
  | 'admin.noAlerts'
  | 'admin.gauges'
  | 'admin.latency'
  | 'admin.counters'
  | 'admin.events'
  | 'admin.noEvents'
  | 'admin.loading'
  | 'admin.error'
  | 'admin.seedTitle'
  | 'admin.seedHint'
  | 'admin.seedLabel'
  | 'admin.seedNotConfigured'
  | 'admin.unlock'
  | 'admin.unlocking'
  | 'admin.lock'
  | 'admin.sessionUntil'
  | 'admin.socLead'
  | 'admin.exportLead'
  | 'admin.exportAll'
  | 'admin.opsOptional'
  | 'chain.title'
  | 'chain.view.list'
  | 'chain.view.graph'
  | 'chain.filter.wallet'
  | 'chain.filter.from'
  | 'chain.filter.to'
  | 'chain.filter.search'
  | 'chain.filter.reset'
  | 'chain.filter.results'
  | 'chain.export'
  | 'chain.copyTip'
  | 'chain.copySuccess'
  | 'chain.copyError'
  | 'chain.exportSuccess'
  | 'chain.valid'
  | 'chain.invalid'
  | 'chain.syncing'
  | 'chain.errorSync'
  | 'chain.empty'
  | 'chain.noMatch'
  | 'chain.retry'
  | 'chain.refresh'
  | 'chain.viewMode'
  | 'chain.blocksLabel'
  | 'chain.syncedLabel'
  | 'chain.syncingLabel'
  | 'quests.title'
  | 'quests.xp'
  | 'quests.pendingRewards'
  | 'quests.pendingRewardsHint'
  | 'quests.reset'
  | 'quests.refresh'
  | 'quests.error'
  | 'quests.errorState'
  | 'quests.errorCatalog'
  | 'quests.errorRateLimit'
  | 'quests.mission'
  | 'quests.claim'
  | 'quests.details'
  | 'quests.daily'
  | 'quests.auto'
  | 'quests.autoHint'
  | 'quests.weekly'
  | 'quests.xpBoost'
  | 'quests.claimWeekly'
  | 'quests.crateLocked'
  | 'quests.login'
  | 'quests.go'
  | 'quests.walletLink'
  | 'quests.walletRequired'
  | 'quests.claimSuccess'
  | 'quests.claimFailed'
  | 'quests.missionSuccess'
  | 'quests.missionFailed'
  | 'quests.weeklySuccess'
  | 'quests.weeklyFailed'
  | 'quests.autoDone'
  | 'quests.done'
  | 'quests.completed'
  | 'quests.newQuestsIn'
  | 'quests.guardianRole'
  | 'quests.guardianTagline'
  | 'quests.weeklyClaimBtn'
  | 'quests.weeklyLockedHint'
  | 'wallet.title'
  | 'wallet.network'
  | 'wallet.refresh'
  | 'wallet.create'
  | 'wallet.creating'
  | 'wallet.noWallet'
  | 'wallet.totalBalance'
  | 'wallet.holdings.title'
  | 'wallet.holdings.others'
  | 'wallet.holdings.toggle'
  | 'wallet.holdings.swapHint'
  | 'wallet.fiatApprox'
  | 'wallet.available'
  | 'wallet.networkMetric'
  | 'wallet.account'
  | 'wallet.noAddress'
  | 'wallet.send'
  | 'wallet.swap'
  | 'wallet.receive'
  | 'wallet.mine'
  | 'wallet.mining'
  | 'wallet.login'
  | 'wallet.explorer.title'
  | 'wallet.explorer.address'
  | 'wallet.explorer.lookup'
  | 'wallet.explorer.useMine'
  | 'wallet.explorer.result'
  | 'wallet.recent.title'
  | 'wallet.recent.empty'
  | 'wallet.recent.hint'
  | 'wallet.keys.title'
  | 'wallet.keys.public'
  | 'wallet.keys.private'
  | 'wallet.keys.show'
  | 'wallet.keys.hide'
  | 'wallet.keys.copy'
  | 'wallet.keys.showPrivate'
  | 'wallet.keys.privateWarning'
  | 'wallet.keys.confirmReveal'
  | 'wallet.keys.confirmReveal.ok'
  | 'wallet.keys.confirmReveal.cancel'
  | 'wallet.send.title'
  | 'wallet.send.recipient'
  | 'wallet.send.amount'
  | 'wallet.send.memo'
  | 'wallet.send.confirm'
  | 'wallet.send.sending'
  | 'wallet.send.confirmTitle'
  | 'wallet.send.confirmHint'
  | 'wallet.send.confirmYes'
  | 'wallet.send.confirmCancel'
  | 'wallet.receive.title'
  | 'wallet.receive.addressLabel'
  | 'wallet.receive.copy'
  | 'wallet.validation.recipient'
  | 'wallet.validation.amount'
  | 'faucet.title'
  | 'faucet.subtitle'
  | 'faucet.refresh'
  | 'faucet.cooldown'
  | 'faucet.timeLeft'
  | 'faucet.claim'
  | 'faucet.claiming'
  | 'faucet.loginRequired'
  | 'faucet.walletRequired'
  | 'faucet.history'
  | 'faucet.historyEmpty'
  | 'faucet.viewAll'
  | 'faucet.viewLess'
  | 'faucet.network'
  | 'faucet.peers'
  | 'faucet.block'
  | 'faucet.txCopy'
  | 'faucet.walletLinked'
  | 'faucet.networkUnknown'
  | 'faucet.networkOnline'
  | 'faucet.networkOffline'
  | 'faucet.claimAmountLabel'
  | 'faucet.claimPerDrop'
  | 'faucet.cooldownConfig'
  | 'faucet.nextEligibleAt'
  | 'faucet.nextEligibleAtEmpty'
  | 'faucet.claimSuccess'
  | 'faucet.claimSuccessBalance'
  | 'faucet.txExplorer'
  | 'faucet.txCopied'
  | 'faucet.txCopyFailed'
  | 'faucet.error.loginRequired'
  | 'faucet.error.walletRequired'
  | 'faucet.error.claimFailed'
  | 'faucet.error.loadFailed'
  | 'faucet.error.loadConfigFailed'
  | 'faucet.claimIncrementHint'
  | 'faucet.networkHint'
  | 'faucet.peersHint'
  | 'faucet.blockHint'
  | 'faucet.peersConnectedOnly'
  | 'faucet.peersConnectedTotal'
  | 'faucet.disabled'
  | 'faucet.offline'
  | 'faucet.retry'
  | 'faucet.atMaxClaim'
  | 'faucet.blockExplorer'
  | 'faucet.exportHistory'
  | 'faucet.loadMore'
  | 'faucet.walletInvalidHint'
  | 'faucet.error.walletInvalid'
  | 'faucet.error.rateLimited'
  | 'faucet.error.featureDisabled'
  | 'faucet.error.offline'
  | 'auth.eyebrow'
  | 'auth.loginTitle'
  | 'auth.registerTitle'
  | 'auth.tabLogin'
  | 'auth.tabRegister'
  | 'auth.tabListLabel'
  | 'auth.identifier'
  | 'auth.username'
  | 'auth.email'
  | 'auth.password'
  | 'auth.identifierPlaceholder'
  | 'auth.usernamePlaceholder'
  | 'auth.emailPlaceholder'
  | 'auth.passwordPlaceholder'
  | 'auth.passwordRegisterPlaceholder'
  | 'auth.showPassword'
  | 'auth.hidePassword'
  | 'auth.submitLogin'
  | 'auth.submitLoginLoading'
  | 'auth.submitRegister'
  | 'auth.submitRegisterLoading'
  | 'auth.orContinueWith'
  | 'auth.google'
  | 'auth.meta'
  | 'auth.apple'
  | 'auth.microsoft'
  | 'auth.github'
  | 'auth.x'
  | 'auth.discord'
  | 'auth.oauthUnavailable'
  | 'auth.oauthMock'
  | 'auth.oauthRedirecting'
  | 'auth.close'
  | 'auth.emailCodeTitle'
  | 'auth.emailCodeHint'
  | 'auth.emailCodeLabel'
  | 'auth.emailCodeSubmit'
  | 'auth.emailResend'
  | 'auth.twoFactorTitle'
  | 'auth.twoFactorHint'
  | 'auth.twoFactorLabel'
  | 'auth.twoFactorSubmit'
  | 'auth.twoFactorOpen'
  | 'auth.twoFactorSetupHint'
  | 'auth.twoFactorSecret'
  | 'auth.twoFactorEnable'
  | 'auth.twoFactorDisableHint'
  | 'auth.twoFactorDisable'
  | 'auth.challengeBack'
  | 'auth.validation.required'
  | 'auth.validation.identifierMin'
  | 'auth.validation.usernamePattern'
  | 'auth.validation.email'
  | 'auth.validation.passwordMin'
  | 'auth.switchToRegister'
  | 'auth.switchToLogin';

const MESSAGES: Record<AppLocale, Record<LocaleKey, string>> = {
  fr: {
    'skip.main': 'Aller au contenu principal',
    'locale.toggle': 'Changer la langue',
    'panel.collapse': 'Replier',
    'panel.expand': 'Déplier',
    'dock.wallet': 'Portefeuille',
    'dock.faucet': 'Robinet',
    'dock.pending': 'Transactions en attente',
    'dock.block': 'Composeur de bloc',
    'dock.transactions': 'File',
    'transactions.composer': 'Composer',
    'transactions.mempool': 'File',
    'transactions.viewMempool': 'Voir la file',
    'transactions.createTx': 'CRÉER',
    'transactions.refreshAll': 'Actualiser la file',
    'transactions.refreshPending': 'Actualiser',
    'transactions.filter': 'Filtrer',
    'transactions.mineAll': 'Miner tout',
    'transactions.miningAll': 'Minage…',
    'transactions.mempoolEmpty': 'File vide',
    'transactions.mempoolCount': '{count} en attente',
    'dock.chain': 'Explorateur de chaîne',
    'dock.market': 'Marché',
    'dock.quests': 'Quêtes',
    'dock.peers': 'Pairs',
    'dock.admin': 'Administration',
    'admin.title': 'Panneau de gestion',
    'admin.subtitle': 'Contrôles de type 1 et 2 — déverrouillage de la graine',
    'admin.refresh': 'Rafraîchir les métriques',
    'admin.collected': 'Collecté',
    'admin.alerts': 'Alertes',
    'admin.noAlerts': 'Aucune alerte active',
    'admin.gauges': 'Jauges',
    'admin.latency': 'Latence HTTP',
    'admin.counters': 'Compteurs',
    'admin.events': 'Événements récents',
    'admin.noEvents': 'Aucun événement récent',
    'admin.loading': 'Chargement des métriques…',
    'admin.error': 'Impossible de charger l’instantané des opérations.',
    'admin.seedTitle': 'Administration — graine requise',
    'admin.seedHint':
      'Saisissez la graine de 24 mots (fichier local deploy/admin-seed.local.txt). Aucune clé de portefeuille.',
    'admin.seedLabel': 'Graine d’administration',
    'admin.seedNotConfigured': 'Empreinte de graine non configurée côté serveur (DARTCHAIN_ADMIN_SEED_SHA256).',
    'admin.unlock': 'Déverrouiller',
    'admin.unlocking': 'Vérification…',
    'admin.lock': 'Verrouiller',
    'admin.sessionUntil': 'session jusqu’à',
    'admin.socLead':
      'Cartographie des contrôles techniques. Prévu = code ; écart d’organisation = processus d’audit.',
    'admin.exportLead':
      'Dossier de preuves : utilisateurs (sans mots de passe), audit d’authentification, robinet, blocs, en attente, opérations, contrôles.',
    'admin.exportAll': 'Tout (fichiers)',
    'admin.opsOptional':
      'Instantané des opérations réservé au rôle administrateur — les exports de la graine restent disponibles.',
    'chain.title': 'Chaîne',
    'chain.view.list': 'Liste',
    'chain.view.graph': 'Graphe',
    'chain.filter.wallet': 'Portefeuille',
    'chain.filter.from': 'De',
    'chain.filter.to': 'À',
    'chain.filter.search': 'Rechercher',
    'chain.filter.reset': 'Réinitialiser',
    'chain.filter.results': '{count} résultats',
    'chain.export': 'Exporter',
    'chain.copyTip': 'Sommet',
    'chain.copySuccess': 'Empreinte du sommet copiée.',
    'chain.copyError': 'Copie impossible.',
    'chain.exportSuccess': 'Fichier téléchargé.',
    'chain.valid': 'Valide',
    'chain.invalid': 'Invalide',
    'chain.syncing': 'Synchro…',
    'chain.errorSync': 'Erreur de synchronisation',
    'chain.empty': 'Chaîne vide',
    'chain.noMatch': 'Aucun bloc pour ces filtres.',
    'chain.retry': 'Réessayer',
    'chain.refresh': 'Actualiser la chaîne',
    'chain.viewMode': 'Mode d\'affichage',
    'chain.blocksLabel': 'blocs',
    'chain.syncedLabel': 'synchronisé',
    'chain.syncingLabel': 'synchronisation',
    'quests.title': 'Quêtes',
    'quests.xp': 'XP',
    'quests.pendingRewards': 'R4V3',
    'quests.pendingRewardsHint': 'Récompenses quêtes en attente — solde du portefeuille = sur la chaîne',
    'quests.reset': 'Réinitialisation quotidienne',
    'quests.refresh': 'Actualiser les quêtes',
    'quests.error': 'Quêtes indisponibles — réessayez ↻',
    'quests.errorState': 'État quêtes indisponible — mode local',
    'quests.errorCatalog': 'Catalogue indisponible — quêtes par défaut',
    'quests.errorRateLimit': 'Trop de requêtes — pause {seconds}',
    'quests.mission': 'Mission en cours',
    'quests.claim': 'Claim',
    'quests.details': 'Détails',
    'quests.daily': 'Quotidiennes',
    'quests.auto': 'AUTO',
    'quests.autoHint': 'Progression serveur — récompense à réclamer',
    'quests.weekly': 'Hebdo',
    'quests.xpBoost': 'XP',
    'quests.claimWeekly': 'Réclamer la récompense hebdomadaire',
    'quests.crateLocked': 'Coffre hebdomadaire',
    'quests.login': 'Connexion',
    'quests.go': 'Aller',
    'quests.walletLink': 'Lier le portefeuille',
    'quests.walletRequired': 'Créez un portefeuille pour recevoir la récompense',
    'quests.claimSuccess': 'Récompense réclamée : {reward}',
    'quests.claimFailed': 'Réclamation impossible.',
    'quests.missionSuccess': 'Mission : {mts} R4V3 + {xp} XP',
    'quests.missionFailed': 'Mission non réclamable.',
    'quests.weeklySuccess': 'Récompense hebdo : {mts} R4V3',
    'quests.weeklyFailed': 'Récompense hebdo indisponible.',
    'quests.autoDone': 'Crédité automatiquement',
    'quests.done': 'Terminé',
    'quests.completed': 'complétées',
    'quests.newQuestsIn': 'Dans',
    'quests.guardianRole': 'Rôle actif',
    'quests.guardianTagline': 'Vigile · Intégrité · Récompenses',
    'quests.weeklyClaimBtn': 'Réclamer',
    'quests.weeklyLockedHint': '{progress}',
    'wallet.title': 'Portefeuille / Explorateur',
    'wallet.network': 'Réseau',
    'wallet.refresh': 'Actualiser le portefeuille',
    'wallet.create': 'Créer un portefeuille',
    'wallet.creating': 'Création…',
    'wallet.noWallet': 'Aucun portefeuille actif.',
    'wallet.totalBalance': 'Solde total',
    'wallet.holdings.title': 'Autres tokens',
    'wallet.holdings.others': 'autres',
    'wallet.holdings.toggle': 'Afficher ou masquer les tokens swap',
    'wallet.holdings.swapHint': 'Ouvrir l’échange pour ce token',
    'wallet.fiatApprox': '{chf} CHF',
    'wallet.available': 'Disponible',
    'wallet.networkMetric': 'Réseau',
    'wallet.account': 'Compte',
    'wallet.noAddress': 'Aucun portefeuille',
    'wallet.send': 'Envoyer',
    'wallet.swap': 'Échange',
    'wallet.receive': 'Recevoir',
    'wallet.mine': 'Miner',
    'wallet.mining': 'Minage…',
    'wallet.login': 'Connexion',
    'wallet.explorer.title': 'Explorer une adresse',
    'wallet.explorer.address': 'Adresse R4V3',
    'wallet.explorer.lookup': 'Consulter',
    'wallet.explorer.useMine': 'Mon portefeuille',
    'wallet.explorer.result': 'Solde exploré',
    'wallet.recent.title': 'Consultations récentes',
    'wallet.recent.empty': 'Aucune consultation récente',
    'wallet.recent.hint': 'Colle une adresse pour consulter',
    'wallet.keys.title': 'Clés du portefeuille',
    'wallet.keys.public': 'Clef publique',
    'wallet.keys.private': 'Clef privée',
    'wallet.keys.show': 'Afficher Clef',
    'wallet.keys.hide': 'Masquer',
    'wallet.keys.copy': 'Copier clef',
    'wallet.keys.showPrivate': 'Afficher la clé privée',
    'wallet.keys.privateWarning':
      'Clé privée sensible : ne la partagez jamais et sauvegardez-la hors ligne.',
    'wallet.keys.confirmReveal': 'J’ai compris que cette clé donne accès aux fonds.',
    'wallet.keys.confirmReveal.ok': 'Afficher',
    'wallet.keys.confirmReveal.cancel': 'Annuler',
    'wallet.send.title': 'Envoyer',
    'wallet.send.recipient': 'Destinataire',
    'wallet.send.amount': 'Montant',
    'wallet.send.memo': 'Mémo',
    'wallet.send.confirm': 'Confirmer envoi',
    'wallet.send.sending': 'Envoi…',
    'wallet.send.confirmTitle': 'Confirmer la transaction',
    'wallet.send.confirmHint': 'Vérifiez le destinataire et le montant avant validation.',
    'wallet.send.confirmYes': 'Oui, envoyer',
    'wallet.send.confirmCancel': 'Annuler',
    'wallet.receive.title': 'Recevoir',
    'wallet.receive.addressLabel': 'Réception',
    'wallet.receive.copy': "Copier l'adresse",
    'wallet.validation.recipient': 'Adresse destinataire invalide.',
    'wallet.validation.amount': 'Montant minimum 0.0001 R4V3.',
    'faucet.title': 'Robinet',
    'faucet.subtitle': 'Réclamation sur le réseau de test m4t3r (microcents R4V3) — connexion et portefeuille requis',
    'faucet.refresh': 'Actualiser le robinet',
    'faucet.cooldown': 'Délai',
    'faucet.timeLeft': 'Temps restant',
    'faucet.claim': 'Réclamer',
    'faucet.claiming': 'Réclamation…',
    'faucet.loginRequired': 'Connexion requise',
    'faucet.walletRequired': 'Portefeuille requis',
    'faucet.history': 'Historique des réclamations',
    'faucet.historyEmpty': 'Aucune réclamation pour le moment',
    'faucet.viewAll': 'Tout voir',
    'faucet.viewLess': 'Réduire',
    'faucet.network': 'Réseau',
    'faucet.peers': 'Pairs',
    'faucet.block': 'Bloc',
    'faucet.txCopy': 'Copier le hash de transaction',
    'faucet.walletLinked': 'Portefeuille',
    'faucet.networkUnknown': 'Hors ligne',
    'faucet.networkOnline': 'Réseau connecté',
    'faucet.networkOffline': 'Réseau hors ligne',
    'faucet.claimAmountLabel': 'Montant de la réclamation',
    'faucet.claimPerDrop': '{amount} m4t3r / réclamation',
    'faucet.cooldownConfig': 'Délai {seconds} s',
    'faucet.nextEligibleAt': 'Prochaine réclamation : {datetime}',
    'faucet.nextEligibleAtEmpty': 'Réclamation disponible',
    'faucet.claimSuccess': 'Réclamation en file — mine depuis File pour valider le bloc.',
    'faucet.claimSuccessBalance': 'Nouveau solde : {balance} R4V3',
    'faucet.txExplorer': 'Voir dans l’explorateur',
    'faucet.txCopied': 'Hash de transaction copié.',
    'faucet.txCopyFailed': 'Copie du hash impossible.',
    'faucet.error.loginRequired': 'Connectez-vous pour utiliser le robinet.',
    'faucet.error.walletRequired': 'Créez et liez un portefeuille depuis l’onglet Portefeuille.',
    'faucet.error.claimFailed': 'Impossible de faire la réclamation.',
    'faucet.error.loadFailed': 'Impossible de charger le robinet.',
    'faucet.error.loadConfigFailed': 'Impossible de charger la configuration du robinet.',
    'faucet.claimIncrementHint': '+1 m4t3r / seconde jusqu’à la réclamation',
    'faucet.networkHint': 'Réseau auquel le robinet est connecté',
    'faucet.peersHint': 'Nœuds pair à pair synchronisés (1 = ce nœud seul en local)',
    'faucet.blockHint': 'Hauteur de chaîne : nombre de blocs minés (#18 = 18 blocs)',
    'faucet.peersConnectedOnly': '{count} connecté(s)',
    'faucet.peersConnectedTotal': '{connected} / {total} connectés',
    'faucet.disabled': 'Le robinet est désactivé sur ce déploiement.',
    'faucet.offline': 'Réseau indisponible — nouvelle tentative automatique…',
    'faucet.retry': 'Réessayer',
    'faucet.atMaxClaim': 'Plafond {max} {token} atteint',
    'faucet.blockExplorer': 'Voir le bloc',
    'faucet.exportHistory': 'Exporter l’historique',
    'faucet.loadMore': 'Charger plus',
    'faucet.walletInvalidHint': 'Adresse {prefix} requise pour ce robinet.',
    'faucet.error.walletInvalid': 'Adresse de portefeuille invalide pour le réseau R4V3.',
    'faucet.error.rateLimited': 'Trop de requêtes — réessayez dans quelques instants.',
    'faucet.error.featureDisabled': 'Le robinet est désactivé (403).',
    'faucet.error.offline': 'Connexion au robinet impossible.',
    'peers.title': 'Pairs',
    'peers.networkPeers': 'Pairs',
    'peers.avgLatency': 'Latence',
    'peers.networkLoad': 'Charge',
    'peers.search': 'Filtrer',
    'peers.filterAll': 'TOUS',
    'peers.filterConnected': 'OK',
    'peers.filterFavorites': 'FAVORIS',
    'peers.connect': 'Connecter',
    'peers.connectPeer': 'Connecter un pair',
    'peers.loginRequired': 'Connexion',
    'peers.refresh': 'Actualiser les pairs',
    'peers.copy': 'Copier',
    'peers.retry': 'Réessayer',
    'peers.empty': 'Aucun pair. Utilise + pour en ajouter.',
    'peers.emptyFilter': 'Aucun pair pour ce filtre.',
    'peers.summary': '{connected}/{total} connectés',
    'peers.statusConnected': 'OK',
    'peers.statusConnecting': '…',
    'peers.statusDisconnected': 'HORS',
    'peers.statusError': 'ERREUR',
    'peers.errorLoad': 'Impossible de charger les pairs.',
    'peers.errorConnect': 'Impossible de connecter ce pair.',
    'peers.errorReconnect': 'Impossible de reconnecter ce pair.',
    'peers.errorCopy': 'Copie URL impossible.',
    'peers.errorLoginAdd': 'Connectez-vous pour ajouter un pair.',
    'peers.errorLoginReconnect': 'Connectez-vous pour reconnecter un pair.',
    'peers.errorInvalidUrl': 'Adresse de pair invalide.',
    'peers.errorInvalidFormat': 'Format invalide — utilise ws:// ou wss://.',
    'peers.successAdded': 'Pair ajouté',
    'peers.successReconnected': 'Pair reconnecté',
    'peers.successCopied': 'URL copiée.',
    'peers.connectPlaceholder': 'ws://host:port/ws/peers',
    'peers.favAdd': 'Ajouter aux favoris',
    'peers.favRemove': 'Retirer des favoris',
    'peers.disconnect': 'Déconnecter',
    'peers.errorDisconnect': 'Impossible de déconnecter ce pair.',
    'peers.errorLoginDisconnect': 'Connectez-vous pour déconnecter un pair.',
    'peers.successDisconnected': 'Pair déconnecté',
    'peers.estimated': 'estimé',
    'peers.errorRateLimit': 'Trop de requêtes — nouvel essai dans {seconds}.',
    'peers.errorStats': 'Statistiques réseau indisponibles.',
    'peers.detailTitle': 'Détail du pair',
    'peers.detailClose': 'Fermer le détail du pair',
    'peers.detailUrl': 'URL',
    'peers.detailStatus': 'Statut',
    'peers.detailMessage': 'Message',
    'peers.detailLatency': 'Latence',
    'peers.detailSync': 'Synchronisation',
    'peers.detailLastSync': 'Dernière synchronisation',
    'peers.detailChainHeight': 'Hauteur chaîne',
    'peers.openDetail': 'Voir le détail du pair',
    'auth.eyebrow': 'Compte R4V3',
    'auth.loginTitle': 'Connexion',
    'auth.registerTitle': 'Inscription',
    'auth.tabLogin': 'Connexion',
    'auth.tabRegister': 'Inscription',
    'auth.tabListLabel': 'Inscription ou connexion',
    'auth.identifier': 'Identifiant',
    'auth.username': 'Nom d\'utilisateur',
    'auth.email': 'Courriel',
    'auth.password': 'Mot de passe',
    'auth.identifierPlaceholder': 'rutkarf ou vous@exemple.com',
    'auth.usernamePlaceholder': 'rutkarf',
    'auth.emailPlaceholder': 'vous@exemple.com',
    'auth.passwordPlaceholder': '••••••••',
    'auth.passwordRegisterPlaceholder': '8 caractères minimum',
    'auth.showPassword': 'Voir',
    'auth.hidePassword': 'Masquer',
    'auth.submitLogin': 'Se connecter',
    'auth.submitLoginLoading': 'Connexion…',
    'auth.submitRegister': 'Créer mon compte',
    'auth.submitRegisterLoading': 'Création…',
    'auth.orContinueWith': 'ou continuer avec',
    'auth.google': 'Google',
    'auth.meta': 'Meta',
    'auth.apple': 'Apple',
    'auth.microsoft': 'Microsoft',
    'auth.github': 'GitHub',
    'auth.x': 'X',
    'auth.discord': 'Discord',
    'auth.oauthUnavailable': 'Non configuré sur ce serveur',
    'auth.oauthMock': 'Connexion démo locale — compte créé en base (sans fournisseur réel)',
    'auth.oauthRedirecting': 'Redirection…',
    'auth.close': 'Fermer',
    'auth.emailCodeTitle': 'Confirmez votre courriel',
    'auth.emailCodeHint': 'Un code à 6 chiffres a été envoyé à',
    'auth.emailCodeLabel': 'Code reçu par courriel',
    'auth.emailCodeSubmit': 'Confirmer',
    'auth.emailResend': 'Renvoyer le code',
    'auth.twoFactorTitle': 'Double authentification',
    'auth.twoFactorHint': 'Saisissez le code à 6 chiffres de votre application d’authentification.',
    'auth.twoFactorLabel': 'Code à deux facteurs',
    'auth.twoFactorSubmit': 'Valider',
    'auth.twoFactorOpen': 'Activer la double authentification',
    'auth.twoFactorSetupHint': 'Ajoutez cette clé dans une application d’authentification, puis entrez le code affiché.',
    'auth.twoFactorSecret': 'Clé secrète',
    'auth.twoFactorEnable': 'Activer',
    'auth.twoFactorDisableHint': 'Entrez un code de votre application pour désactiver la double authentification.',
    'auth.twoFactorDisable': 'Désactiver',
    'auth.challengeBack': 'Retour',
    'auth.validation.required': 'Champ requis',
    'auth.validation.identifierMin': '3 caractères minimum',
    'auth.validation.usernamePattern': 'Lettres, chiffres et _ uniquement',
    'auth.validation.email': 'Courriel invalide',
    'auth.validation.passwordMin': '8 caractères minimum',
    'auth.switchToRegister': 'Pas encore de compte ? Inscription',
    'auth.switchToLogin': 'Déjà un compte ? Connexion',
  },
};

export function translate(locale: AppLocale, key: LocaleKey): string {
  return MESSAGES[locale][key] ?? key;
}

export function nextLocale(_locale: AppLocale): AppLocale {
  return 'fr';
}
