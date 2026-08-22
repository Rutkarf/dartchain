import * as THREE from 'three';

import type { MapQuality } from '../map-configuration';
import { mapPerfProfile } from '../marseille-perf.config';
import {
  HERO_SKYLINE_LANDMARKS,
  heroSkylineWorldAnchor,
  type HeroSkylineLandmarkKind,
} from './landmark-hero.config';

export interface HeroSkylineBuildEntry {
  id: string;
  group: THREE.Group;
  lodCenter: { x: number; z: number };
}

export interface HeroSkylineBuildResult {
  entries: HeroSkylineBuildEntry[];
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  textures: THREE.Texture[];
}

function stoneMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xc8baa4,
    roughness: 0.78,
    metalness: 0.06,
    envMapIntensity: 0.55,
  });
}

function buildFortSaintJean(anchor: { x: number; z: number }, quality: MapQuality): THREE.Group {
  const group = new THREE.Group();
  group.name = 'fort-saint-jean';
  group.position.set(anchor.x, 0, anchor.z);

  const stone = stoneMaterial();
  const towerSegs = quality === 'high' ? 24 : quality === 'low' || quality === 'ultra-low' ? 12 : 18;

  const towerGeo = new THREE.CylinderGeometry(7.5, 8.8, 26, towerSegs);
  const towerA = new THREE.Mesh(towerGeo, stone);
  towerA.name = 'fort-saint-jean-tower-a';
  towerA.position.set(-18, 13, 0);
  towerA.castShadow = quality !== 'ultra-low';
  group.add(towerA);

  const towerB = towerA.clone();
  towerB.name = 'fort-saint-jean-tower-b';
  towerB.position.set(18, 13, 0);
  group.add(towerB);

  const wallGeo = new THREE.BoxGeometry(44, 14, 8);
  const wall = new THREE.Mesh(wallGeo, stone);
  wall.name = 'fort-saint-jean-curtain';
  wall.position.set(0, 7, -6);
  group.add(wall);

  const gateGeo = new THREE.BoxGeometry(10, 9, 3);
  const gateMat = stone.clone();
  gateMat.color.setHex(0xb0a492);
  const gate = new THREE.Mesh(gateGeo, gateMat);
  gate.name = 'fort-saint-jean-gate';
  gate.position.set(0, 4.5, -2);
  group.add(gate);

  const rampartGeo = new THREE.BoxGeometry(52, 3.2, 14);
  const rampart = new THREE.Mesh(rampartGeo, stone);
  rampart.name = 'fort-saint-jean-rampart';
  rampart.position.set(0, 16.5, 2);
  group.add(rampart);

  return group;
}

function buildNotreDameSilhouette(anchor: { x: number; z: number }, quality: MapQuality): THREE.Group {
  const group = new THREE.Group();
  group.name = 'notre-dame-garde';
  group.position.set(anchor.x, 0, anchor.z);

  const hillSegs = quality === 'high' ? 32 : 16;
  const hillGeo = new THREE.ConeGeometry(88, 58, hillSegs);
  const hillMat = new THREE.MeshStandardMaterial({
    color: 0x5a6a52,
    roughness: 0.92,
    metalness: 0.02,
  });
  const hill = new THREE.Mesh(hillGeo, hillMat);
  hill.name = 'notre-dame-garde-hill';
  hill.position.y = 29;
  group.add(hill);

  const naveGeo = new THREE.BoxGeometry(22, 16, 34);
  const naveMat = new THREE.MeshStandardMaterial({
    color: 0xe8e0d0,
    roughness: 0.62,
    metalness: 0.08,
  });
  const nave = new THREE.Mesh(naveGeo, naveMat);
  nave.name = 'notre-dame-garde-nave';
  nave.position.set(0, 62, 4);
  group.add(nave);

  const towerGeo = new THREE.CylinderGeometry(4.2, 5.2, 38, 16);
  const tower = new THREE.Mesh(towerGeo, naveMat);
  tower.name = 'notre-dame-garde-bell-tower';
  tower.position.set(-10, 70, 8);
  group.add(tower);

  const domeGeo = new THREE.SphereGeometry(9.5, quality === 'high' ? 28 : 16, quality === 'high' ? 20 : 12);
  const domeMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.28,
    metalness: 0.72,
    emissive: 0x3a2808,
    emissiveIntensity: quality === 'ultra-low' ? 0.08 : 0.22,
    envMapIntensity: 1.2,
  });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.name = 'notre-dame-garde-dome';
  dome.scale.set(1, 0.62, 1);
  dome.position.set(4, 78, 2);
  group.add(dome);

  const crossGeo = new THREE.BoxGeometry(0.35, 5.5, 0.35);
  const crossMat = new THREE.MeshStandardMaterial({
    color: 0xf0f4ff,
    emissive: 0x8899bb,
    emissiveIntensity: 0.35,
    metalness: 0.4,
  });
  const cross = new THREE.Mesh(crossGeo, crossMat);
  cross.name = 'notre-dame-garde-cross';
  cross.position.set(4, 84, 2);
  group.add(cross);

  return group;
}

function buildMucemSilhouette(anchor: { x: number; z: number }, quality: MapQuality): THREE.Group {
  const group = new THREE.Group();
  group.name = 'mucem';
  group.position.set(anchor.x, 0, anchor.z);

  const shellGeo = new THREE.BoxGeometry(74, 16, 74);
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0x2e3438,
    roughness: 0.55,
    metalness: 0.35,
    envMapIntensity: 0.9,
  });
  const shell = new THREE.Mesh(shellGeo, shellMat);
  shell.name = 'mucem-shell';
  shell.position.y = 8;
  group.add(shell);

  const finCount =
    quality === 'high' ? 14 : quality === 'medium' ? 10 : mapPerfProfile(quality).harborSubdivisions <= 12 ? 6 : 8;
  const finMat = new THREE.MeshStandardMaterial({
    color: 0x4a5258,
    roughness: 0.42,
    metalness: 0.55,
  });
  for (let i = 0; i < finCount; i++) {
    const t = i / Math.max(1, finCount - 1);
    const finGeo = new THREE.BoxGeometry(1.1, 16.5, 74);
    const fin = new THREE.Mesh(finGeo, finMat);
    fin.name = `mucem-fin-${i}`;
    fin.position.set(-36 + t * 72, 8, 0);
    group.add(fin);
  }

  const bridgeGeo = new THREE.BoxGeometry(48, 2.4, 6);
  const bridgeMat = new THREE.MeshStandardMaterial({
    color: 0x8a9098,
    roughness: 0.48,
    metalness: 0.62,
  });
  const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
  bridge.name = 'mucem-bridge';
  bridge.position.set(24, 5.5, 18);
  group.add(bridge);

  return group;
}

function buildPhareSilhouette(anchor: { x: number; z: number }, quality: MapQuality): THREE.Group {
  const group = new THREE.Group();
  group.name = 'phare-joliette';
  group.position.set(anchor.x, 0, anchor.z);

  const shaftGeo = new THREE.CylinderGeometry(3.2, 4.8, 42, quality === 'high' ? 20 : 12);
  const shaftMat = new THREE.MeshStandardMaterial({
    color: 0xd8dce4,
    roughness: 0.38,
    metalness: 0.28,
  });
  const shaft = new THREE.Mesh(shaftGeo, shaftMat);
  shaft.name = 'phare-joliette-shaft';
  shaft.position.y = 21;
  group.add(shaft);

  const lanternGeo = new THREE.CylinderGeometry(5.5, 5.5, 4.2, 16);
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xffe8a8,
    emissive: 0xffaa44,
    emissiveIntensity: quality === 'ultra-low' ? 0.15 : 0.55,
    roughness: 0.2,
    metalness: 0.5,
  });
  const lantern = new THREE.Mesh(lanternGeo, lanternMat);
  lantern.name = 'phare-joliette-lantern';
  lantern.position.y = 44;
  group.add(lantern);

  const capGeo = new THREE.ConeGeometry(6.2, 5, 12);
  const cap = new THREE.Mesh(capGeo, shaftMat);
  cap.name = 'phare-joliette-cap';
  cap.position.y = 48;
  group.add(cap);

  return group;
}

const BUILDERS: Record<
  HeroSkylineLandmarkKind,
  (anchor: { x: number; z: number }, quality: MapQuality) => THREE.Group
> = {
  fort: buildFortSaintJean,
  basilica: buildNotreDameSilhouette,
  museum: buildMucemSilhouette,
  lighthouse: buildPhareSilhouette,
};

/** Silhouettes héros — Fort, Garde, MUCEM, phare (Phase 10). */
export function buildHeroSkylineLandmarkSet(quality: MapQuality): HeroSkylineBuildResult {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const entries: HeroSkylineBuildEntry[] = [];

  for (const def of HERO_SKYLINE_LANDMARKS) {
    const anchor = heroSkylineWorldAnchor(def.id);
    const group = BUILDERS[def.kind](anchor, quality);
    group.userData['skylineLandmark'] = true;
    group.userData['geoBuilding'] = true;
    group.userData['heroLandmark'] = true;

    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        geometries.push(obj.geometry);
        const mat = obj.material;
        if (Array.isArray(mat)) {
          materials.push(...mat);
        } else {
          materials.push(mat);
        }
      }
    });

    entries.push({ id: def.id, group, lodCenter: anchor });
  }

  return { entries, geometries, materials, textures };
}
