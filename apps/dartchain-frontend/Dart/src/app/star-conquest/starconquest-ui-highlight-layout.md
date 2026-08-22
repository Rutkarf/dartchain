# StarConquest UI — highlight & décoratif (250×550)

## Labels +M4T3R

- **Repos** : aucun label flottant sur la nébuleuse (évite le bruit `+140`…).
- **Hover / sélection** : un seul chip compact au-dessus du nœud.
- **Toujours** : valeur dans `app-star-quest-panel` + récompense dans le scanner hors-vue.

## Formes géométriques

| Élément | Décision | Raison |
|---|---|---|
| Hexagones hive (`sc-hive-cell-*`) | **Retiré** (Ruche) | Aucun clic, aucune info, aucune hiérarchie utile |
| Bol galactique (`sc-galaxy-bowl`) | **Retiré** | Contour décoratif sans interaction |
| Anneaux orbitaux (`sc-orbit-ring-*`) | **Retiré** (Ruche) | Arcs décoratifs sans feedback UX |
| Pulse synaptique | **Conservé** (atténué) | Ancré aux quêtes — vie légère du graphe |
| Motes swarm | **Conservés** (1/quête, faible) | Micro-particules liées aux nœuds |
| Aurora bowl (shader cercle) | **Conservé** | Fond de profondeur de la nébuleuse |
| Echoes far/mid/near | **Conservés** | Plans de profondeur |
| Filaments / liens | **Repos** presque invisibles ; **focus** visibles | Hiérarchie sélection |
| Guides constellation | **Repos** cachés ; **focus** visibles | Silhouette famille seulement à la sélection |
| Ghost / bloom | **Repos** très bas ; **focus** relevé | Évite les flares qui aplatissent la scène |

## Rest glow

`STAR_CONQUEST_REST_GLOW` : core 0.34, halo 0.22, bloom 0.12, aurora ×0.38.
