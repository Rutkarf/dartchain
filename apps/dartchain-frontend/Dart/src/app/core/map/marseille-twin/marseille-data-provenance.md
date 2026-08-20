# MetaverseBB Marseille — data provenance

No claim of official approval by the City of Marseille, IGN, Foster + Partners, or any merchant.

## Sources in the repository (inventory)

| ID | Type | Licence | Quality | Used at runtime | Notes |
|---|---|---|---|---|---|
| OSM Overpass buildings | OSM ways | ODbL | APPROXIMATE (~2–5 m) | yes | `OSMBuildingProvider` |
| OSM way/200273945 Ombrière | OSM | ODbL | PROJECTED origin | yes | `MARSEILLE_GEO_ORIGIN` |
| OSM ways 67705148, 67704902, 67701479, 67708729 | OSM + cadastre DGI 2010 nodes | ODbL | PROJECTED footprints | yes | landmark heroes, snapshot API 0.6 2026-08-20 |
| Gameplay Ombrière canopy 18.4×12.2 m | project mesh | project | PLACEHOLDER vs published 46×22 target | yes | must not be presented as survey geometry |
| WiGLE professional anchors | project list | project | APPROXIMATE | yes | not a survey |
| Placement fixtures `dev-*` | project | project | PLACEHOLDER | DEV fallback | never a real partner |
| IGN / BD TOPO | — | — | UNKNOWN | no | requires `STOP-EXTERNAL-GEODATA` |
| Google Maps / proprietary 3D tiles | forbidden | — | — | no | do not integrate |
| Foster + Partners drawings | not in repo | proprietary | UNKNOWN | no | do not copy |

## Attribution (OSM)

© OpenStreetMap contributors. Data available under the Open Database Licence (ODbL).  
https://www.openstreetmap.org/copyright

Cadastre-derived OSM nodes: « cadastre-dgi-fr source : Direction Générale des Impôts - Cadastre ».

## Policy

- VERIFIED: only if licensed project data exists in-repo (currently: none at survey grade).
- PROJECTED: OSM lat/lon transformed by local equirectangular metres (`marseille-local-v1`).
- Never label OSM as centimetre-accurate. Internal projection near origin is centimetre-stable; source is not.
