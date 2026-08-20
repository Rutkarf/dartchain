# MetaverseBB Marseille — coordinate system

Inspected 2026-08-20 from existing exclusive + shared config (read-only on shared files).

## Unit scale (verified in code)

```text
1 Three.js world unit = 1 metre
```

Evidence:

- `WORLD_METERS_PER_UNIT = 1` (`map-configuration.ts`, shared — do not edit)
- `GEO_REFERENCE_CONFIG.metersPerWorldUnit = 1`
- `GEO_REFERENCE_CONFIG.worldCrs = 'local-equirectangular-meters'`
- `MARSEILLE_COORDINATE_SYSTEM_VERSION = 'marseille-local-v1'`

Do not change `worldScale` to zoom. Zoom is camera-only.

## Axis convention (metaverseBB)

```text
east  → +X
north → −Z
up    → +Y
```

`GEO_REFERENCE_CONFIG.northRotationRadians = 0` (no heading offset).

## Pipeline

```text
WGS84 (EPSG:4326) lat / lon / alt
  → local equirectangular metres about Ombrière origin
     x = Δlon × metersPerDegreeLongitude(latOrigin)
     z = −Δlat × 111_320
     y = Δalt
  → Three.js world (same numbers; 1 unit = 1 m)
  → spawn / building / floor anchors
```

Origin: Ombrière OSM way/200273945  
`latitude 43.2945995`, `longitude 5.3741227`, `altitude 0`

Quality: origin is PROJECTED from OSM (not a cadastral monument).  
Internal round-trip near origin is centimetre-stable (see `geo-precision.spec.ts`).  
Vs WGS84 ellipsoid, drift grows with distance (~20 cm / 100 m, metres at km scale).

## Spawn (existing, preserved)

Gameplay spawn is **not** the geographic origin. It is:

```text
world = mirror(0, 5.6, 0) + spawnOffsetFromMirror(−6.2, 0, −2.4)
heading Y = 0 (face north / −Z)
camera yaw = π (south of avatar, Vieux-Port water at +Z behind the player)
```

An additive `MarseilleSpawnAnchor` documents this without replacing `METRO_SPAWN_ANCHOR`.
