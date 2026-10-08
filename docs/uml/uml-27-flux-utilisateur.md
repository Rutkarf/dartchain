# 27 — Flux utilisateur

## Objectif

Décrire le parcours sur l’unique page servie par la SPA : le shell `app.html` et ses zones. Les diagrammes 21 à 40 sont des vues complémentaires. Ils ne font pas partie des 14 diagrammes UML officiels.

Ce n’est pas un routeur. `app.routes.ts` exporte `routes` vide (vue 28).

## Statut

Moyen. La composition du shell est confirmée par `app.html`. L’ordre dans lequel une personne réelle ouvre les tiroirs est déduit des sorties d’événements, pas d’un enregistrement de session.

## Sources analysées

- `apps/dartchain-frontend/Dart/src/app/app.html`
- `apps/dartchain-frontend/Dart/src/app/app.ts` (signaux `activeShowcaseTab`, `activeBottomTab`, `r4v3SceneVisible`)
- `apps/dartchain-frontend/Dart/src/app/app.routes.ts`
- `environments/environment.ts` (`starConquestEnabled: false`)
- `showcase/models/showcase-tab.model.ts`
- `dock/services/dock-navigation.service.ts` (`BottomDockTab`)

## Éléments représentés

Une page, zones permanentes, zones conditionnelles, tiroirs. Pas d’URLs d’écran.

## Diagramme

```mermaid
flowchart TB
  skip[Lien eviter vers app-main-content]
  fond[Fond app-game-background]
  star{starConquestEnabled}
  nav[Navbar et bandeau accueil]
  main[Main Marche]
  swap[Zone swap]
  show[Zone showcase onglets]
  dock[Zone dock onglets]
  graph[Zone graph]
  floor[three-floor]
  scene{r4v3SceneVisible}
  r4[r4v3-scene differee]
  err[Banniere erreur shell]
  block[Tiroir detail bloc]
  launch[Tiroir formulaire launch]
  quest[Retour quete]
  auth[Tiroir auth]
  hud[HUD perf]

  skip --> fond --> star
  star -->|false dans environment.ts| nav
  star -->|true seulement si le flag change| nav
  nav --> main
  main --> swap
  main --> show
  main --> dock
  main --> graph
  main --> floor
  floor --> scene
  scene -->|vrai| r4
  scene -->|faux| err
  err --> block --> launch --> quest --> auth --> hud
```

Légende : une seule colonne d’écran. Les losanges sont des conditions du template, pas des routes.

## Explication

Le document rendu est un `div.app-shell`. Un lien d’évitement pointe vers `#app-main-content`. Le fond `.app-game-background` est décoratif.

Star Conquest (`app-particle-background`, et si `starConquestOverlayEnabled` alors `app-star-quest-panel` et `app-star-quest-scanner`) n’est monté que si `product.starConquestEnabled` est vrai. Dans `environment.ts` ce drapeau est `false`. Le code du dossier `star-conquest/` existe ; la zone n’est pas dans le flux par défaut.

La barre `app-navbar` projette `app-bandeau-accueil`. Elle émet `exploreBlock` et `explorePending`, qui ouvrent le tiroir de bloc ou le panneau pending. Ces actions restent sur la même page.

Le `main` porte `aria-label="Marché"`. Quatre zones y sont toujours dans le template :

1. `app-swap` — échange.
2. `app-showcase-tab-showcase` — onglets showcase. Les identifiants lus sont `tours`, `r4v3`, `rv23`, `dao`, `daonews`, `market` (libellés CHAT, D.A.O, LABZ, MARCHÉ, R4V3, TOUS). Le signal initial dans `app.ts` est `activeShowcaseTab = 'tours'`.
3. `app-dock-tabs-dock-tabs` — dock bas. `BottomDockTab` : `wallet`, `faucet`, `transactions`, `chain`, `quests`, `peers`, `admin`. Signal initial `activeBottomTab = 'wallet'`.
4. `app-graph` — graphique repliable.

Des classes CSS reflètent l’état replié : `is-showcase-collapsed`, `is-chart-collapsed`, `is-exchange-collapsed`, `is-dock-collapsed`, et `is-showcase-disabled` si le produit coupe le showcase.

Sous le main : `app-three-floor` (scène Three). Si `r4v3SceneVisible()` est vrai, `app-r4v3-scene` est chargé en `@defer (on idle)`.

Puis, dans l’ordre du template : bannière `app-error-banner` si `shellBannerError` est défini ; tiroir `app-block-detail-drawer` ; tiroir `app-launch-form-drawer` ; bandeau de retour de quête ; `app-auth-drawer` ; `app-combined-perf-hud`.

Un parcours type déduit des événements du template, sans prétendre qu’il est le seul :

1. Arrivée sur le shell, dock sur `wallet`, showcase sur `tours`.
2. Ouverture du tiroir auth pour `POST /api/v1/auth/register` ou `login` (le service Angular appelle la v1).
3. Dock `faucet` pour le claim, qui reste en mempool tant que le dock transactions / la mine n’a pas tourné.
4. Clic explorateur : `openBlockDrawer` sur le même document, pas une URL `/block/:hash`.

`components/depth-rail/` existe dans le working tree (fichiers non suivis par git). `app.html` relu ne contient pas de balise depth-rail. Cette zone n’est pas dans le flux rendu actuel.

## Correspondance avec le code

- Page : `app.html`, composant déclaré dans `app.ts`.
- Routes : `export const routes: Routes = []`.
- Onglets showcase : `SHOWCASE_TABS` et `normalizeShowcaseTab` (anciens id `news`, `chat`, `launchlab`, `peers`, `reseau` réécrits vers les id courants).
- Onglets dock : `dock-navigation.service.ts`, y compris `OVERLAY_TO_BOTTOM_TAB` (`pending` et `composer` vers l’onglet `transactions`).
- Flag Star Conquest : `environment.ts` et le `@if` de `app.html`.

## Hypothèses

- `product.starConquestEnabled` lit l’environnement au démarrage. Un build dont le flag serait passé à vrai afficherait la zone ; le fichier de dev lu le laisse à faux. `environment.prod.ts` n’a pas été comparé clé par clé au-delà des WebSockets.
- Les tiroirs ouverts par la navbar le sont par des signaux (`showDrawer`, `launchDrawer`). Le nom exact de chaque signal d’ouverture n’est cité que lorsqu’il apparaît dans `app.html`.
- Le dock `admin` est une zone du même shell, pas une application séparée. Le déverrouillage seed reste un appel `POST /api/v1/admin/unlock`.

## Anomalies détectées

- README « Star Conquest live » contre flag `false` et `@if` qui retire la zone.
- `depth-rail` présent sur le disque, absent du shell lu.
- Aucune URL d’écran : un utilisateur ne peut pas partager un lien vers l’onglet faucet ou le tiroir auth. C’est le fait des routes vides, pas un oubli de cette fiche.
- Le `main` annonce « Marché » alors qu’il contient aussi showcase, dock et graph. Le nom accessible est plus étroit que les zones.

## Recommandations

- Si Star Conquest doit rester hors flux, garder le flag faux et aligner le README.
- Si `depth-rail` est une zone voulue, l’insérer dans `app.html` dans un commit ; tant qu’il n’y est pas, le flux utilisateur ne le compte pas.
- Pour un parcours testable, s’appuyer sur `data-testid="app-shell"` et les onglets, pas sur des paths Angular.
