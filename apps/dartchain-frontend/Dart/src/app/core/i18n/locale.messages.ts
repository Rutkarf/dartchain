export type AppLocale = 'fr' | 'en';

export type LocaleKey =
  | 'skip.main'
  | 'locale.toggle'
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
  | 'wallet.noWallet'
  | 'wallet.totalBalance'
  | 'wallet.fiatApprox'
  | 'wallet.available'
  | 'wallet.networkMetric'
  | 'wallet.account'
  | 'wallet.noAddress'
  | 'wallet.send'
  | 'wallet.receive'
  | 'wallet.mine'
  | 'wallet.mining'
  | 'wallet.login'
  | 'wallet.explorer.title'
  | 'wallet.explorer.address'
  | 'wallet.explorer.lookup'
  | 'wallet.explorer.useMine'
  | 'wallet.explorer.result'
  | 'wallet.keys.title'
  | 'wallet.keys.public'
  | 'wallet.keys.private'
  | 'wallet.keys.show'
  | 'wallet.keys.hide'
  | 'wallet.keys.copy'
  | 'wallet.send.title'
  | 'wallet.send.recipient'
  | 'wallet.send.amount'
  | 'wallet.send.memo'
  | 'wallet.send.confirm'
  | 'wallet.send.sending'
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
  | 'auth.oauthRedirecting'
  | 'auth.close'
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
    'dock.wallet': 'Wallet',
    'dock.faucet': 'Faucet',
    'dock.pending': 'Transactions en attente',
    'dock.block': 'Composeur de bloc',
    'dock.transactions': 'Transaction',
    'transactions.composer': 'Composer',
    'transactions.mempool': 'Mempool',
    'transactions.viewMempool': 'Voir mempool',
    'transactions.createTx': 'CRÉER TX',
    'transactions.refreshAll': 'Actualiser composer et mempool',
    'transactions.mempoolEmpty': 'Mempool vide',
    'transactions.mempoolCount': '{count} tx en attente',
    'dock.chain': 'Explorateur de chaîne',
    'dock.market': 'Marché',
    'dock.quests': 'Quêtes',
    'dock.peers': 'Peers',
    'dock.admin': 'Admin',
    'admin.title': 'Panel admin',
    'admin.subtitle': 'Observabilité native — sans Prometheus',
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
    'admin.error': 'Impossible de charger le snapshot ops.',
    'chain.title': 'Chain',
    'chain.view.list': 'Liste',
    'chain.view.graph': 'Graphe',
    'chain.filter.wallet': 'Wallet',
    'chain.filter.from': 'De',
    'chain.filter.to': 'À',
    'chain.filter.search': 'Rechercher',
    'chain.filter.reset': 'Reset',
    'chain.filter.results': '{count} résultats',
    'chain.export': 'Export',
    'chain.copyTip': 'Tip',
    'chain.copySuccess': 'Hash tip copié.',
    'chain.copyError': 'Copie impossible.',
    'chain.exportSuccess': 'Export JSON téléchargé.',
    'chain.valid': 'Valid',
    'chain.invalid': 'Invalid',
    'chain.syncing': 'Sync…',
    'chain.errorSync': 'Erreur sync',
    'chain.empty': 'Chaîne vide',
    'chain.noMatch': 'Aucun bloc pour ces filtres.',
    'chain.retry': 'Réessayer',
    'chain.refresh': 'Actualiser la blockchain',
    'chain.viewMode': 'Mode d\'affichage',
    'chain.blocksLabel': 'blocs',
    'chain.syncedLabel': 'synced',
    'chain.syncingLabel': 'syncing',
    'quests.title': 'Quêtes',
    'quests.xp': 'XP',
    'quests.pendingRewards': 'R4V3',
    'quests.pendingRewardsHint': 'Récompenses quêtes en attente — solde wallet = on-chain',
    'quests.reset': 'Reset quotidien',
    'quests.refresh': 'Actualiser les quêtes',
    'quests.error': 'Quêtes indisponibles — réessayez ↻',
    'quests.errorState': 'État quêtes indisponible — mode local',
    'quests.errorCatalog': 'Catalogue indisponible — quêtes par défaut',
    'quests.errorRateLimit': 'Trop de requêtes — pause {seconds}',
    'quests.mission': 'Mission en cours',
    'quests.claim': 'Réclamer',
    'quests.details': 'Détails',
    'quests.daily': 'Quotidiennes',
    'quests.auto': 'AUTO',
    'quests.autoHint': 'Progression validée côté serveur',
    'quests.weekly': 'Hebdo',
    'quests.xpBoost': 'XP',
    'quests.claimWeekly': 'Réclamer la récompense hebdomadaire',
    'quests.crateLocked': 'Coffre hebdomadaire',
    'quests.login': 'Connexion',
    'quests.go': 'Aller',
    'quests.walletLink': 'Lier wallet',
    'quests.walletRequired': 'Créez un wallet pour recevoir la récompense',
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
    'wallet.title': 'Wallet / Explorer',
    'wallet.network': 'Réseau',
    'wallet.refresh': 'Actualiser le wallet',
    'wallet.create': 'Créer un wallet',
    'wallet.noWallet': 'Aucun wallet actif.',
    'wallet.totalBalance': 'Solde total',
    'wallet.fiatApprox': '{chf} CHF · {gbp} GBP',
    'wallet.available': 'Disponible',
    'wallet.networkMetric': 'Réseau',
    'wallet.account': 'Compte',
    'wallet.noAddress': 'Aucun wallet',
    'wallet.send': 'Envoyer',
    'wallet.receive': 'Recevoir',
    'wallet.mine': 'Miner',
    'wallet.mining': 'Minage…',
    'wallet.login': 'Connexion',
    'wallet.explorer.title': 'Explorer une adresse',
    'wallet.explorer.address': 'Adresse R4V3',
    'wallet.explorer.lookup': 'Consulter',
    'wallet.explorer.useMine': 'Mon wallet',
    'wallet.explorer.result': 'Solde exploré',
    'wallet.keys.title': 'Clés du wallet',
    'wallet.keys.public': 'Clé publique',
    'wallet.keys.private': 'Clé privée',
    'wallet.keys.show': 'Afficher clef',
    'wallet.keys.hide': 'Masquer',
    'wallet.keys.copy': 'Copier clef',
    'wallet.send.title': 'Envoyer',
    'wallet.send.recipient': 'Adresse destinataire',
    'wallet.send.amount': 'Montant (R4V3)',
    'wallet.send.memo': 'Mémo (optionnel)',
    'wallet.send.confirm': 'Confirmer envoi',
    'wallet.send.sending': 'Envoi…',
    'wallet.receive.title': 'Recevoir',
    'wallet.receive.addressLabel': 'Adresse de réception',
    'wallet.receive.copy': "Copier l'adresse",
    'wallet.validation.recipient': 'Adresse destinataire invalide.',
    'wallet.validation.amount': 'Montant minimum 0.0001 R4V3.',
    'faucet.title': 'Faucet',
    'faucet.subtitle': 'Claim testnet m4t3r (microcents R4V3) — connexion et wallet requis',
    'faucet.refresh': 'Actualiser le faucet',
    'faucet.cooldown': 'Cooldown',
    'faucet.timeLeft': 'Temps restant',
    'faucet.claim': 'Claim m4t3r',
    'faucet.claiming': 'Claim…',
    'faucet.loginRequired': 'Connexion requise',
    'faucet.walletRequired': 'Wallet requis',
    'faucet.history': 'Historique des claims',
    'faucet.historyEmpty': 'Aucun Claim pour le moment',
    'faucet.viewAll': 'Tout voir',
    'faucet.viewLess': 'Réduire',
    'faucet.network': 'Réseau',
    'faucet.peers': 'Peers',
    'faucet.block': 'Bloc',
    'faucet.txCopy': 'Copier le hash de transaction',
    'faucet.walletLinked': 'Wallet',
    'faucet.networkUnknown': 'Hors ligne',
    'faucet.networkOnline': 'Réseau connecté',
    'faucet.networkOffline': 'Réseau hors ligne',
    'faucet.claimAmountLabel': 'Montant du claim',
    'faucet.claimPerDrop': '{amount} m4t3r / claim',
    'faucet.cooldownConfig': 'Cooldown {seconds}s',
    'faucet.nextEligibleAt': 'Prochain claim : {datetime}',
    'faucet.nextEligibleAtEmpty': 'Claim disponible',
    'faucet.claimSuccess': 'Claim crédité on-chain.',
    'faucet.claimSuccessBalance': 'Nouveau solde : {balance} R4V3',
    'faucet.txExplorer': 'Voir dans l’explorateur',
    'faucet.txCopied': 'Hash de transaction copié.',
    'faucet.txCopyFailed': 'Copie du hash impossible.',
    'faucet.error.loginRequired': 'Connectez-vous pour utiliser le faucet.',
    'faucet.error.walletRequired': 'Créez et liez un wallet depuis l’onglet Wallet.',
    'faucet.error.claimFailed': 'Impossible de faire le claim faucet.',
    'faucet.error.loadFailed': 'Impossible de charger le faucet.',
    'faucet.error.loadConfigFailed': 'Impossible de charger la configuration faucet.',
    'faucet.claimIncrementHint': '+1 m4t3r / seconde jusqu’au claim',
    'faucet.networkHint': 'Réseau blockchain auquel le faucet est connecté',
    'faucet.peersHint': 'Nœuds P2P synchronisés (1 = ce nœud seul en local)',
    'faucet.blockHint': 'Hauteur de chaîne : nombre de blocs minés (#18 = 18 blocs)',
    'faucet.peersConnectedOnly': '{count} connecté(s)',
    'faucet.peersConnectedTotal': '{connected} / {total} connectés',
    'faucet.disabled': 'Le faucet est désactivé sur ce déploiement.',
    'faucet.offline': 'Réseau indisponible — nouvelle tentative automatique…',
    'faucet.retry': 'Réessayer',
    'faucet.atMaxClaim': 'Plafond {max} {token} atteint',
    'faucet.blockExplorer': 'Voir le bloc',
    'faucet.exportHistory': 'Exporter JSON',
    'faucet.loadMore': 'Charger plus',
    'faucet.walletInvalidHint': 'Adresse {prefix} requise pour ce faucet.',
    'faucet.error.walletInvalid': 'Adresse wallet invalide pour le réseau R4V3.',
    'faucet.error.rateLimited': 'Trop de requêtes — réessayez dans quelques instants.',
    'faucet.error.featureDisabled': 'Le faucet est désactivé (403).',
    'faucet.error.offline': 'Connexion au faucet impossible.',
    'peers.title': 'Peers',
    'peers.networkPeers': 'Peers',
    'peers.avgLatency': 'Latence',
    'peers.networkLoad': 'Charge',
    'peers.search': 'Filtrer',
    'peers.filterAll': 'TOUS',
    'peers.filterConnected': 'OK',
    'peers.filterFavorites': 'FAV',
    'peers.connect': 'Connecter',
    'peers.connectPeer': 'Connecter un peer',
    'peers.loginRequired': 'Connexion',
    'peers.refresh': 'Actualiser les peers',
    'peers.copy': 'Copier',
    'peers.retry': 'Retry',
    'peers.empty': 'Aucun peer. Utilise + pour en ajouter.',
    'peers.emptyFilter': 'Aucun peer pour ce filtre.',
    'peers.summary': '{connected}/{total} connectés',
    'peers.statusConnected': 'OK',
    'peers.statusConnecting': '…',
    'peers.statusDisconnected': 'OFF',
    'peers.statusError': 'ERR',
    'peers.errorLoad': 'Impossible de charger les peers.',
    'peers.errorConnect': 'Impossible de connecter ce peer.',
    'peers.errorReconnect': 'Impossible de reconnecter ce peer.',
    'peers.errorCopy': 'Copie URL impossible.',
    'peers.errorLoginAdd': 'Connectez-vous pour ajouter un peer.',
    'peers.errorLoginReconnect': 'Connectez-vous pour reconnecter un peer.',
    'peers.errorInvalidUrl': 'Adresse peer invalide.',
    'peers.errorInvalidFormat': 'Format invalide — utilise ws:// ou wss://.',
    'peers.successAdded': 'Peer ajouté',
    'peers.successReconnected': 'Peer reconnecté',
    'peers.successCopied': 'URL copiée.',
    'peers.connectPlaceholder': 'ws://localhost:8080/ws/peers',
    'peers.favAdd': 'Ajouter aux favoris',
    'peers.favRemove': 'Retirer des favoris',
    'peers.disconnect': 'Déconnecter',
    'peers.errorDisconnect': 'Impossible de déconnecter ce peer.',
    'peers.errorLoginDisconnect': 'Connectez-vous pour déconnecter un peer.',
    'peers.successDisconnected': 'Peer déconnecté',
    'peers.estimated': 'estimé',
    'peers.errorRateLimit': 'Trop de requêtes — nouvel essai dans {seconds}.',
    'peers.errorStats': 'Statistiques réseau indisponibles.',
    'peers.detailTitle': 'Détail peer',
    'peers.detailClose': 'Fermer le détail peer',
    'peers.detailUrl': 'URL',
    'peers.detailStatus': 'Statut',
    'peers.detailMessage': 'Message',
    'peers.detailLatency': 'Latence',
    'peers.detailSync': 'Synchronisation',
    'peers.detailLastSync': 'Dernière sync',
    'peers.detailChainHeight': 'Hauteur chaîne',
    'peers.openDetail': 'Voir le détail du peer',
    'auth.eyebrow': 'Compte R4V3',
    'auth.loginTitle': 'Connexion',
    'auth.registerTitle': 'Inscription',
    'auth.tabLogin': 'Connexion',
    'auth.tabRegister': 'Inscription',
    'auth.tabListLabel': 'Connexion ou inscription',
    'auth.identifier': 'Identifiant',
    'auth.username': 'Nom d\'utilisateur',
    'auth.email': 'Email',
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
    'auth.oauthRedirecting': 'Redirection…',
    'auth.close': 'Fermer',
    'auth.validation.required': 'Champ requis',
    'auth.validation.identifierMin': '3 caractères minimum',
    'auth.validation.usernamePattern': 'Lettres, chiffres et _ uniquement',
    'auth.validation.email': 'Email invalide',
    'auth.validation.passwordMin': '8 caractères minimum',
    'auth.switchToRegister': 'Pas encore de compte ? Inscription',
    'auth.switchToLogin': 'Déjà un compte ? Connexion',
  },
  en: {
    'skip.main': 'Skip to main content',
    'locale.toggle': 'Switch language',
    'dock.wallet': 'Wallet',
    'dock.faucet': 'Faucet',
    'dock.pending': 'Pending transactions',
    'dock.block': 'Block composer',
    'dock.transactions': 'Transaction',
    'transactions.composer': 'Composer',
    'transactions.mempool': 'Mempool',
    'transactions.viewMempool': 'View mempool',
    'transactions.createTx': 'Create tx',
    'transactions.refreshAll': 'Refresh composer and mempool',
    'transactions.mempoolEmpty': 'Mempool empty',
    'transactions.mempoolCount': '{count} pending tx',
    'dock.chain': 'Chain explorer',
    'dock.market': 'Market',
    'dock.quests': 'Quests',
    'dock.peers': 'Peers',
    'dock.admin': 'Admin',
    'admin.title': 'Admin panel',
    'admin.subtitle': 'Native observability — no Prometheus',
    'admin.refresh': 'Refresh metrics',
    'admin.collected': 'Collected',
    'admin.alerts': 'Alerts',
    'admin.noAlerts': 'No active alerts',
    'admin.gauges': 'Gauges',
    'admin.latency': 'HTTP latency',
    'admin.counters': 'Counters',
    'admin.events': 'Recent events',
    'admin.noEvents': 'No recent events',
    'admin.loading': 'Loading metrics…',
    'admin.error': 'Unable to load ops snapshot.',
    'chain.title': 'Chain',
    'chain.view.list': 'List',
    'chain.view.graph': 'Graph',
    'chain.filter.wallet': 'Wallet',
    'chain.filter.from': 'From',
    'chain.filter.to': 'To',
    'chain.filter.search': 'Search',
    'chain.filter.reset': 'Reset',
    'chain.filter.results': '{count} results',
    'chain.export': 'Export',
    'chain.copyTip': 'Tip',
    'chain.copySuccess': 'Tip hash copied.',
    'chain.copyError': 'Copy failed.',
    'chain.exportSuccess': 'JSON export downloaded.',
    'chain.valid': 'Valid',
    'chain.invalid': 'Invalid',
    'chain.syncing': 'Syncing…',
    'chain.errorSync': 'Sync error',
    'chain.empty': 'Empty chain',
    'chain.noMatch': 'No blocks match filters.',
    'chain.retry': 'Retry',
    'chain.refresh': 'Refresh blockchain',
    'chain.viewMode': 'View mode',
    'chain.blocksLabel': 'blocks',
    'chain.syncedLabel': 'synced',
    'chain.syncingLabel': 'syncing',
    'quests.title': 'Quests',
    'quests.xp': 'XP',
    'quests.pendingRewards': 'R4V3',
    'quests.pendingRewardsHint': 'Pending quest rewards — wallet balance is on-chain',
    'quests.reset': 'Daily reset',
    'quests.refresh': 'Refresh quests',
    'quests.error': 'Quests unavailable — retry ↻',
    'quests.errorState': 'Quest state unavailable — local mode',
    'quests.errorCatalog': 'Catalog unavailable — default quests',
    'quests.errorRateLimit': 'Too many requests — pause {seconds}',
    'quests.mission': 'Current mission',
    'quests.claim': 'Claim',
    'quests.details': 'Details',
    'quests.daily': 'Daily',
    'quests.auto': 'AUTO',
    'quests.autoHint': 'Server-validated progression',
    'quests.weekly': 'Weekly',
    'quests.xpBoost': 'XP',
    'quests.claimWeekly': 'Claim weekly reward',
    'quests.crateLocked': 'Weekly crate',
    'quests.login': 'Sign in',
    'quests.go': 'Go',
    'quests.walletLink': 'Link wallet',
    'quests.walletRequired': 'Create a wallet to receive the reward',
    'quests.claimSuccess': 'Reward claimed: {reward}',
    'quests.claimFailed': 'Unable to claim reward.',
    'quests.missionSuccess': 'Mission: {mts} R4V3 + {xp} XP',
    'quests.missionFailed': 'Mission not claimable.',
    'quests.weeklySuccess': 'Weekly reward: {mts} R4V3',
    'quests.weeklyFailed': 'Weekly reward unavailable.',
    'quests.autoDone': 'Auto-credited',
    'quests.done': 'Done',
    'quests.completed': 'completed',
    'quests.newQuestsIn': 'In',
    'quests.guardianRole': 'Active role',
    'quests.guardianTagline': 'Sentinel · Integrity · Rewards',
    'quests.weeklyClaimBtn': 'Claim',
    'quests.weeklyLockedHint': '{progress}',
    'wallet.title': 'Wallet / Explorer',
    'wallet.network': 'Network',
    'wallet.refresh': 'Refresh wallet',
    'wallet.create': 'Create wallet',
    'wallet.noWallet': 'No active wallet.',
    'wallet.totalBalance': 'Total balance',
    'wallet.fiatApprox': '{chf} CHF · {gbp} GBP',
    'wallet.available': 'Available',
    'wallet.networkMetric': 'Network',
    'wallet.account': 'Account',
    'wallet.noAddress': 'No wallet',
    'wallet.send': 'Send',
    'wallet.receive': 'Receive',
    'wallet.mine': 'Mine',
    'wallet.mining': 'Mining…',
    'wallet.login': 'Sign in',
    'wallet.explorer.title': 'Explore an address',
    'wallet.explorer.address': 'R4V3 address',
    'wallet.explorer.lookup': 'Lookup',
    'wallet.explorer.useMine': 'My wallet',
    'wallet.explorer.result': 'Explored balance',
    'wallet.keys.title': 'Wallet keys',
    'wallet.keys.public': 'Public key',
    'wallet.keys.private': 'Private key',
    'wallet.keys.show': 'Show key',
    'wallet.keys.hide': 'Hide',
    'wallet.keys.copy': 'Copy key',
    'wallet.send.title': 'Send',
    'wallet.send.recipient': 'Recipient address',
    'wallet.send.amount': 'Amount (R4V3)',
    'wallet.send.memo': 'Memo (optional)',
    'wallet.send.confirm': 'Confirm send',
    'wallet.send.sending': 'Sending…',
    'wallet.receive.title': 'Receive',
    'wallet.receive.addressLabel': 'Receiving address',
    'wallet.receive.copy': 'Copy address',
    'wallet.validation.recipient': 'Invalid recipient address.',
    'wallet.validation.amount': 'Minimum amount 0.0001 R4V3.',
    'faucet.title': 'Faucet',
    'faucet.subtitle': 'Claim testnet m4t3r (R4V3 microcents) — sign-in and wallet required',
    'faucet.refresh': 'Refresh faucet',
    'faucet.cooldown': 'Cooldown',
    'faucet.timeLeft': 'Time left',
    'faucet.claim': 'Claim m4t3r',
    'faucet.claiming': 'Claiming…',
    'faucet.loginRequired': 'Sign-in required',
    'faucet.walletRequired': 'Wallet required',
    'faucet.history': 'Claims history',
    'faucet.historyEmpty': 'No claims yet',
    'faucet.viewAll': 'View all',
    'faucet.viewLess': 'Show less',
    'faucet.network': 'Network',
    'faucet.peers': 'Peers',
    'faucet.block': 'Block',
    'faucet.txCopy': 'Copy transaction hash',
    'faucet.walletLinked': 'Wallet',
    'faucet.networkUnknown': 'Offline',
    'faucet.networkOnline': 'Network online',
    'faucet.networkOffline': 'Network offline',
    'faucet.claimAmountLabel': 'Claim amount',
    'faucet.claimPerDrop': '{amount} m4t3r / claim',
    'faucet.cooldownConfig': 'Cooldown {seconds}s',
    'faucet.nextEligibleAt': 'Next claim: {datetime}',
    'faucet.nextEligibleAtEmpty': 'Claim available',
    'faucet.claimSuccess': 'Claim credited on-chain.',
    'faucet.claimSuccessBalance': 'New balance: {balance} R4V3',
    'faucet.txExplorer': 'View in explorer',
    'faucet.txCopied': 'Transaction hash copied.',
    'faucet.txCopyFailed': 'Unable to copy hash.',
    'faucet.error.loginRequired': 'Sign in to use the faucet.',
    'faucet.error.walletRequired': 'Create and link a wallet from the Wallet tab.',
    'faucet.error.claimFailed': 'Unable to complete faucet claim.',
    'faucet.error.loadFailed': 'Unable to load faucet.',
    'faucet.error.loadConfigFailed': 'Unable to load faucet configuration.',
    'faucet.claimIncrementHint': '+1 m4t3r / second until claim',
    'faucet.networkHint': 'Blockchain network the faucet is connected to',
    'faucet.peersHint': 'Synced P2P nodes (1 = local node only in dev)',
    'faucet.blockHint': 'Chain height: number of mined blocks (#18 = 18 blocks)',
    'faucet.peersConnectedOnly': '{count} connected',
    'faucet.peersConnectedTotal': '{connected} / {total} connected',
    'faucet.disabled': 'The faucet is disabled on this deployment.',
    'faucet.offline': 'Network unavailable — auto-retry in progress…',
    'faucet.retry': 'Retry',
    'faucet.atMaxClaim': 'Cap {max} {token} reached',
    'faucet.blockExplorer': 'View block',
    'faucet.exportHistory': 'Export JSON',
    'faucet.loadMore': 'Load more',
    'faucet.walletInvalidHint': '{prefix} address required for this faucet.',
    'faucet.error.walletInvalid': 'Invalid wallet address for the R4V3 network.',
    'faucet.error.rateLimited': 'Too many requests — try again shortly.',
    'faucet.error.featureDisabled': 'Faucet is disabled (403).',
    'faucet.error.offline': 'Unable to reach the faucet.',
    'peers.title': 'Peers',
    'peers.networkPeers': 'Peers',
    'peers.avgLatency': 'Latency',
    'peers.networkLoad': 'Load',
    'peers.search': 'Filter',
    'peers.filterAll': 'ALL',
    'peers.filterConnected': 'OK',
    'peers.filterFavorites': 'FAV',
    'peers.connect': 'Connect',
    'peers.connectPeer': 'Connect a peer',
    'peers.loginRequired': 'Sign in',
    'peers.refresh': 'Refresh peers',
    'peers.copy': 'Copy',
    'peers.retry': 'Retry',
    'peers.empty': 'No peers yet. Use + to add one.',
    'peers.emptyFilter': 'No peers match this filter.',
    'peers.summary': '{connected}/{total} connected',
    'peers.statusConnected': 'OK',
    'peers.statusConnecting': '…',
    'peers.statusDisconnected': 'OFF',
    'peers.statusError': 'ERR',
    'peers.errorLoad': 'Unable to load peers.',
    'peers.errorConnect': 'Unable to connect this peer.',
    'peers.errorReconnect': 'Unable to reconnect this peer.',
    'peers.errorCopy': 'Unable to copy URL.',
    'peers.errorLoginAdd': 'Sign in to add a peer.',
    'peers.errorLoginReconnect': 'Sign in to reconnect a peer.',
    'peers.errorInvalidUrl': 'Invalid peer address.',
    'peers.errorInvalidFormat': 'Invalid format — use ws:// or wss://.',
    'peers.successAdded': 'Peer added',
    'peers.successReconnected': 'Peer reconnected',
    'peers.successCopied': 'URL copied.',
    'peers.connectPlaceholder': 'ws://localhost:8080/ws/peers',
    'peers.favAdd': 'Add to favorites',
    'peers.favRemove': 'Remove from favorites',
    'peers.disconnect': 'Disconnect',
    'peers.errorDisconnect': 'Unable to disconnect this peer.',
    'peers.errorLoginDisconnect': 'Sign in to disconnect a peer.',
    'peers.successDisconnected': 'Peer disconnected',
    'peers.estimated': 'estimated',
    'peers.errorRateLimit': 'Too many requests — retry in {seconds}.',
    'peers.errorStats': 'Network stats unavailable.',
    'peers.detailTitle': 'Peer detail',
    'peers.detailClose': 'Close peer detail',
    'peers.detailUrl': 'URL',
    'peers.detailStatus': 'Status',
    'peers.detailMessage': 'Message',
    'peers.detailLatency': 'Latency',
    'peers.detailSync': 'Sync',
    'peers.detailLastSync': 'Last sync',
    'peers.detailChainHeight': 'Chain height',
    'peers.openDetail': 'View peer details',
    'auth.eyebrow': 'R4V3 account',
    'auth.loginTitle': 'Sign in',
    'auth.registerTitle': 'Sign up',
    'auth.tabLogin': 'Sign in',
    'auth.tabRegister': 'Sign up',
    'auth.tabListLabel': 'Sign in or sign up',
    'auth.identifier': 'Identifier',
    'auth.username': 'Username',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.identifierPlaceholder': 'rutkarf or you@example.com',
    'auth.usernamePlaceholder': 'rutkarf',
    'auth.emailPlaceholder': 'you@example.com',
    'auth.passwordPlaceholder': '••••••••',
    'auth.passwordRegisterPlaceholder': 'At least 8 characters',
    'auth.showPassword': 'Show',
    'auth.hidePassword': 'Hide',
    'auth.submitLogin': 'Sign in',
    'auth.submitLoginLoading': 'Signing in…',
    'auth.submitRegister': 'Create account',
    'auth.submitRegisterLoading': 'Creating…',
    'auth.orContinueWith': 'or continue with',
    'auth.google': 'Google',
    'auth.meta': 'Meta',
    'auth.apple': 'Apple',
    'auth.microsoft': 'Microsoft',
    'auth.github': 'GitHub',
    'auth.x': 'X',
    'auth.discord': 'Discord',
    'auth.oauthUnavailable': 'Not configured on this server',
    'auth.oauthRedirecting': 'Redirecting…',
    'auth.close': 'Close',
    'auth.validation.required': 'Required field',
    'auth.validation.identifierMin': 'At least 3 characters',
    'auth.validation.usernamePattern': 'Letters, numbers and _ only',
    'auth.validation.email': 'Invalid email',
    'auth.validation.passwordMin': 'At least 8 characters',
    'auth.switchToRegister': 'No account yet? Sign up',
    'auth.switchToLogin': 'Already have an account? Sign in',
  },
};

export function translate(locale: AppLocale, key: LocaleKey): string {
  return MESSAGES[locale][key] ?? key;
}

export function nextLocale(locale: AppLocale): AppLocale {
  return locale === 'fr' ? 'en' : 'fr';
}
