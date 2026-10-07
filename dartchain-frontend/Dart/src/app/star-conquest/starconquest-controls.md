# Star Conquest — contrôles (250×550)

Tous les contrôles existants restent actifs. Cette couche est additive.

## Univers (Star Conquest)

| Entrée | Effet |
|---|---|
| Tap / clic sur une étoile | Ouvre le panneau Quest (inchangé) |
| Drag canvas (orbit) | Pan XY de l’univers ; la vue reste à la position relâchée |
| Double-tap vide | Recentre la vue |
| Stick pan (contrat, overlay masqué) | Conservé pour clavier / réactivation flag |
| Flèches ou WASD | Pan clavier (ignoré dans un champ texte) |
| Recentrer (`resetView`) | Ramène la vue au centre |
| Échap | Ferme aide, puis scanner, puis panneau |
| pointercancel / blur / onglet caché | Stick / orbit neutre |

## Surbrillance

- Repos : glow réduit (`STAR_CONQUEST_REST_GLOW`) — les 35 étoiles restent identifiables.
- Hover / sélection : pulse + voisinage 1-hop.
- Locked / future / completed : tons dédiés (`star-conquest-visual-state.ts`).

## Hors périmètre

Les sticks MOVE (bas-gauche) et VIEW (bas-droite) appartiennent à `app-three-floor` (MetaVerseBB). Ils ne sont pas remplacés.

## Accessibilité

- HUD `role=status` + `aria-live`
- Panneau Quest : ligne `aria-live` statut + CTA
- Overlay erreur WebGL : `role=alert`
- `prefers-reduced-motion` : coupe l’entrée du panneau et le pulse des labels
- CTA / items scanner : zone tactile ≥ 32 px
