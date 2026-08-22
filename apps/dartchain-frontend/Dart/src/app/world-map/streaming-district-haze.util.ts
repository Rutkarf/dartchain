import * as THREE from 'three';

import { VIEUX_PORT_CORE_BUILDING_RADIUS } from './geo-reference.config';
import { activeAtmospherePreset } from './marseille-atmosphere.config';
import { streamingCoreFadeFactor } from './world-streaming-visual.util';

export interface StreamingDistrictHazeResult {
  group: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  panels: THREE.Mesh[];
}

const RING_RADIUS = VIEUX_PORT_CORE_BUILDING_RADIUS + 72;

/** Anneau de brume — couture geo-accurate ↔ streaming (Phase 12 + 14). */
export function buildStreamingDistrictHaze(panelCount = 10): StreamingDistrictHazeResult {
  const group = new THREE.Group();
  group.name = 'metaverse-streaming-district-haze';

  const preset = activeAtmospherePreset();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const panels: THREE.Mesh[] = [];
  const count = Math.max(4, panelCount);

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const geo = new THREE.PlaneGeometry(140, 72);
    geometries.push(geo);
    const mat = new THREE.MeshBasicMaterial({
      color: preset.fogColor,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
    });
    materials.push(mat);
    const panel = new THREE.Mesh(geo, mat);
    panel.name = `metaverse-streaming-haze-${i}`;
    panel.position.set(Math.cos(angle) * RING_RADIUS, 34, Math.sin(angle) * RING_RADIUS);
    panel.rotation.y = -angle + Math.PI * 0.5;
    group.add(panel);
    panels.push(panel);
  }

  return { group, geometries, materials, panels };
}

/** Intensifie la brume à la frontière streaming (0 = cœur geo, 1 = procédural). */
export function updateStreamingDistrictHaze(
  panels: readonly THREE.Mesh[],
  focusX: number,
  focusZ: number
): void {
  const fade = streamingCoreFadeFactor(focusX, focusZ);
  const edgeBoost = 1 - Math.abs(fade - 0.55) * 2.2;
  const base = THREE.MathUtils.clamp(0.04 + fade * 0.12, 0.04, 0.22);
  const opacity = THREE.MathUtils.clamp(base + Math.max(0, edgeBoost) * 0.08, 0.03, 0.26);

  for (const panel of panels) {
    const mat = panel.material;
    if (mat instanceof THREE.MeshBasicMaterial) {
      mat.opacity = opacity;
    }
  }
}

export function streamingHazeRingRadius(): number {
  return RING_RADIUS;
}
