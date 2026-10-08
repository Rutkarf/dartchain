# 51 — Sécurité applicative

## Objectif

Cette fiche est une vue complémentaire de la série documentaire 41–60. Elle résume la chaîne de filtres et les règles de `SecurityConfig` telles qu’elles sont écrites : CSRF désactivé, sessions sans état, lectures GET publiques, limite de débit, en-têtes HTTP, et la dépendance BouncyCastle déclarée. L’usage cryptographique de cette dépendance n’est pas développé au-delà du fait qu’elle est déclarée.

## Statut

Élevé. Confirmé par le code.

## Sources analysées

- `io.dartchain.backend.shared.config.SecurityConfig`
- `BearerTokenAuthenticationFilter`, `RateLimitFilter`
- `SecurityHeadersFilter`
- `ActuatorAccessFilter`, `RequestCorrelationFilter`, `RequestTimingFilter`, `LegacyApiDeprecationFilter` (présence confirmée)
- `application.yaml` : rate limit, `restrict-actuator`, `strict-pending-signatures`
- `apps/dartchain-backend/pom.xml` : artefact BouncyCastle `bcprov-jdk18on`
- `WebSocketConfig`

Aucun secret n’est recopié.

## Éléments représentés

- Politique de session `STATELESS`.
- CSRF désactivé.
- CORS branché sur `CorsConfigurationSource`.
- Deux filtres ajoutés devant le filtre login formulaire, qui n’est pas le mécanisme d’authentification du produit.
- `permitAll` explicite, puis `GET /**`, puis `authenticated` pour le reste.
- En-têtes posés par `SecurityHeadersFilter`.
- Plafond 60 requêtes / 60 secondes et table `rate_limit_buckets`.
- BouncyCastle comme dépendance déclarée.

## Diagramme

```mermaid
flowchart TD
  requete[Requête HTTP]
  headers[SecurityHeadersFilter\nX-Content-Type-Options, X-Frame-Options,\nReferrer-Policy, Permissions-Policy,\nX-XSS-Protection, HSTS si HTTPS]
  correlation[RequestCorrelationFilter\nX-Request-Id]
  timing[RequestTimingFilter]
  legacy[LegacyApiDeprecationFilter]
  rate[RateLimitFilter\n60 / 60000 ms]
  bearer[BearerTokenAuthenticationFilter]
  chain[SecurityFilterChain]

  requete --> headers
  headers --> correlation
  correlation --> timing
  timing --> legacy
  legacy --> rate
  rate --> bearer
  bearer --> chain

  chain --> options[OPTIONS /** permitAll]
  chain --> ws[/ws/** permitAll]
  chain --> authPost[POST register login refresh oauth unlock]
  chain --> wallets[POST wallets create verify create-client generate-evm]
  chain --> actuator[actuator health et info permitAll]
  chain --> get[GET /** permitAll]
  chain --> mutationsPubliques[POST chat, trail, overpass, inquiries\nDELETE messages chat]
  chain --> authn[anyRequest authenticated]
```

L’ordre entre les filtres servlet hors `SecurityConfig` et les deux `addFilterBefore` n’est pas un ordre d’exécution mesuré. Le diagramme place les filtres nommés pour les montrer tous. Dans `SecurityConfig`, `BearerTokenAuthenticationFilter` puis `RateLimitFilter` sont enregistrés avec `addFilterBefore(..., UsernamePasswordAuthenticationFilter.class)`.

## Explication

`SecurityConfig` désactive le CSRF (`AbstractHttpConfigurer::disable`), active le CORS, et fixe `SessionCreationPolicy.STATELESS`. Les erreurs d’authentification et d’accès passent par `SecurityProblemSupport`. Il n’y a pas de session HTTP de formulaire : le commentaire d’architecture utile est « JWT et filtres », pas « login Spring MVC ».

Règles `permitAll` lues, dans l’ordre du fichier :

- `OPTIONS /**`
- `/ws/**`
- POST `/api/auth/register` et `/api/auth/login`
- POST `/api/v1/auth/register`, `/login`, `/refresh`, `/oauth/exchange`, `/api/v1/admin/unlock`
- GET `/api/v1/auth/oauth/**`
- POST `/api/v1/auth/oauth/connect/apple/callback`
- POST `/api/wallets/create`, `/verify`, `/create-client`
- POST `/api/v1/wallets/generate-evm`
- `/actuator/health`, `/actuator/health/**`, `/actuator/info`
- GET `/**`
- POST et DELETE `/api/showcase/chat/messages`
- POST `/api/m4t3r/trail-pickup`
- POST `/api/metaverse/overpass`
- POST `/api/metaverse/placements/*/inquiries`

Tout le reste est `authenticated`. Les mutations de minage, par exemple, ne sont pas dans cette liste : `BlockchainController.minePendingTransactions` appelle en plus `RoleAuthorizationService.authorizeMutation`.

`SecurityHeadersFilter` ajoute `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, une `Permissions-Policy` qui vide géolocalisation, micro et caméra, `X-XSS-Protection: 0`, et `Strict-Transport-Security` seulement si la requête est sûre ou si `X-Forwarded-Proto` vaut `https`.

Le rate limit configuré est `max-requests: 60` et `window-ms: 60000`. En mode postgres le compteur est la table `rate_limit_buckets` ; en mode mémoire c’est `InMemoryRateLimitCounterStore`.

`dartchain.ops.restrict-actuator` vaut `false` dans `application.yaml` et `true` dans les profils staging et prod. L’exposition actuator de base est `health,info`. Le profil staging ajoute `metrics,prometheus` ; le profil prod ajoute `metrics`. Ce n’est pas un serveur Prometheus déployé (fiche 60).

`dartchain.security.strict-pending-signatures` vaut `true`. `TransactionValidationService` mentionne un mode permissif conservé lorsque ce drapeau est faux. Le défaut lu est le mode strict.

BouncyCastle : l’artefact `org.bouncycastle:bcprov-jdk18on` est déclaré dans le `pom.xml` (version lue dans `pom.xml` : 1.84). Cette fiche s’arrête à « dépendance déclarée ». Elle ne décrit pas d’algorithme.

Les WebSockets sont `permitAll` au niveau HTTP, et `WebSocketConfig` ajoute `WebSocketAuthHandshakeInterceptor` sur `/ws/peers`, `/ws/live`, `/ws/chat` et `/ws/metaverse-arena`. L’intercepteur existe ; cette fiche ne détaille pas quelles messages exigent ensuite un compte.

## Correspondance avec le code

| Mécanisme | Classe ou propriété |
| --- | --- |
| Chaîne | `SecurityConfig.securityFilterChain` |
| CSRF off | `.csrf(AbstractHttpConfigurer::disable)` |
| Sans état | `SessionCreationPolicy.STATELESS` |
| Bearer | `BearerTokenAuthenticationFilter` |
| Débit | `RateLimitFilter`, `dartchain.rate-limit` |
| En-têtes | `SecurityHeadersFilter` |
| Actuator | `ActuatorAccessFilter`, `dartchain.ops.restrict-actuator` |
| Corrélation | `RequestCorrelationFilter` |
| Durée | `RequestTimingFilter` |
| Alias legacy | `LegacyApiDeprecationFilter` |
| Signatures mempool | `dartchain.security.strict-pending-signatures` |
| Bibliothèque crypto | dépendance déclarée `bcprov-jdk18on` |

`password-min-length: 6` est une règle auth, pas un filtre servlet. `allow-server-wallet-create: false` coexiste avec le `permitAll` de `POST /api/wallets/create`.

## Hypothèses

- L’ordre d’exécution complet des `OncePerRequestFilter` hors chaîne Spring Security dépend de `@Order` et des `FilterRegistrationBean`. Seuls `SecurityHeadersFilter` (`HIGHEST_PRECEDENCE + 10`) et les deux `addFilterBefore` sont cités avec leur ancrage. Le diagramme ne prétend pas à un trace mesuré.
- HSTS ne s’applique qu’aux requêtes jugées sûres par `isSecureRequest`. Derrière un proxy qui oublie `X-Forwarded-Proto`, l’en-tête n’est pas posé. C’est le code du filtre, pas une hypothèse sur Render.

## Anomalies détectées

- `GET /**` permitAll : toute lecture est anonyme au sens Spring, y compris des ressources qui pourraient être considérées comme privées si l’on ne lit que le nom du contrôleur.
- `POST /api/wallets/create` est autorisé alors que `WalletController` ne mappe pas cette route (fiche 56).
- CSRF désactivé. Cohérent avec un API stateless sans cookie de session, risqué si un cookie d’authentification était ajouté plus tard.
- Actuator non restreint dans le fichier de base (`restrict-actuator: false`), restreint en staging et prod.
- Dépendance BouncyCastle déclarée sans que cette fiche puisse, par consigne, en décrire l’usage exact.

## Recommandations

- Remplacer `GET /**` par une liste de lectures réellement publiques, et laisser le reste `authenticated` ou filtré dans le contrôleur de façon uniforme.
- Retirer `/api/wallets/create` du `permitAll` tant que le contrôleur ne l’expose pas, ou restaurer la méthode si le drapeau `allow-server-wallet-create` doit un jour la rouvrir.
- En profil autre que la démo locale, refuser le démarrage lorsque `restrict-actuator` est faux.
- Tenir le registre de la dépendance BouncyCastle à part (version `bcprov-jdk18on`) sans lui prêter un rôle non relu.
