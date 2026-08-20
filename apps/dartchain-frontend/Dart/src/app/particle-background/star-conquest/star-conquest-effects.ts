import * as THREE from 'three';
import type { StarConquestEffectKind, StarConquestUniverseTheme } from './star-conquest-universe.types';
import { createSoftDiscTexture } from './star-conquest-visuals';
import { STAR_QUEST_FAMILIES, STAR_QUEST_FAMILY_ORDER } from './star-conquest-families';
import { STAR_CONQUEST_SCALE } from './star-conquest-scale';
import {
  questEchoOffset,
  type StarQuestAnchor,
} from './star-conquest-anchors';
import {
  hiveCellCenter,
  hiveHexPoints,
  starConquestHiveCells,
} from './star-conquest-hive.layout';
import {
  starConquestGalaxyRadius,
  starConquestMobileQuality,
  starConquestRingDepthAmp,
} from './star-conquest-ui-maturity.config';

/**
 * Effets visuels décoratifs par univers.
 * Ruche : anneaux + pulse + motes, tous ancrés sur des Quests.
 */
export class StarConquestEffects {
  readonly group = new THREE.Group();
  private effectKind: StarConquestEffectKind = 'none';
  private readonly discTexture: THREE.CanvasTexture;
  private orbitalRings: THREE.Line[] = [];
  private structureRing: THREE.Line | null = null;
  private galaxyOrbitPhase = 0;
  private gridLines: THREE.LineSegments | null = null;
  private portalRing: THREE.Line | null = null;
  private portalShards: THREE.Points | null = null;
  private spiralArms: THREE.LineSegments | null = null;
  private timelineAxis: THREE.Line | null = null;
  private nebulaClouds: THREE.Points | null = null;
  private synapticPulse: THREE.Points | null = null;
  private swarmMotes: THREE.Points | null = null;
  private hiveCells: THREE.Line[] = [];
  private galaxyBowl: THREE.Line | null = null;
  private time = 0;
  private anchors: readonly StarQuestAnchor[] = [];
  private fxSignature = '';

  constructor() {
    this.group.name = 'star-conquest-effects';
    this.discTexture = createSoftDiscTexture(32);
  }

  applyUniverse(theme: StarConquestUniverseTheme): void {
    this.clearAll();
    this.effectKind = theme.effectKind;
    this.fxSignature = '';
    switch (theme.effectKind) {
      case 'orbital-rings':
        this.buildOrbitalRings();
        break;
      case 'm4t3r-grid':
        this.buildM4t3rGrid();
        break;
      case 'nexus-portal':
        this.buildNexusPortal();
        break;
      case 'agent-swarm':
        // Cercle structurel des 5 galaxies (pas d’hex / bol confus).
        this.buildGalaxyStructureRing();
        break;
      case 'galaxy-spiral':
        this.buildGalaxySpiral();
        break;
      case 'timeline-axis':
        this.buildTimelineAxis();
        break;
      case 'nebula-clouds':
        this.buildNebulaClouds();
        break;
      case 'synaptic-pulse':
        break;
      case 'aurora-waves':
      case 'zodiac-guides':
      case 'none':
        break;
    }
    this.ensureQuestFx(this.anchors);
  }

  /** Pulse + motes : une (ou deux) particule par Quest, jamais d’orphelin. */
  followQuestAnchors(anchors: readonly StarQuestAnchor[]): void {
    this.anchors = anchors;
    const signature = `${this.effectKind}:${anchors.length}`;
    if (signature !== this.fxSignature) {
      this.fxSignature = signature;
      this.ensureQuestFx(anchors);
    }
    this.writeQuestFx(anchors);
    this.recenterRings(anchors);
  }

  tick(deltaMs: number): void {
    this.time += deltaMs * 0.001;

    for (let ri = 0; ri < this.orbitalRings.length; ri++) {
      const ring = this.orbitalRings[ri];
      const isStructure = ring === this.structureRing;
      if (isStructure) {
        // Micro-bascule en profondeur (cercle vivant) — galaxies restent sur la courbe via setOrbitPhase
        const breath = Math.sin(this.time * 0.28 + this.galaxyOrbitPhase * 0.2) * 0.055;
        ring.rotation.x = breath;
        ring.rotation.y = Math.cos(this.time * 0.21) * 0.028;
        const mat = ring.material as THREE.LineBasicMaterial;
        mat.opacity = 0.17 + Math.sin(this.time * 0.4) * 0.04;
        continue;
      }
      ring.rotation.z += deltaMs * 0.00006 * (1 + ri * 0.25);
      ring.rotation.x = Math.sin(this.time * 0.22) * 0.16;
      ring.rotation.y = Math.cos(this.time * 0.17) * 0.07;
      const mat = ring.material as THREE.LineBasicMaterial;
      mat.opacity = 0.11 + Math.sin(this.time * 0.35 + ri) * 0.025;
    }

    if (this.portalRing) {
      this.portalRing.rotation.z += deltaMs * 0.00015;
    }
    if (this.portalShards) {
      const pos = this.portalShards.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const angle = (i / pos.count) * Math.PI * 2 + this.time * 0.25;
        const r = (38 + Math.sin(this.time + i) * 4) * STAR_CONQUEST_SCALE.layout;
        pos.setXYZ(i, Math.cos(angle) * r, Math.sin(angle) * r * 0.6, -6);
      }
      pos.needsUpdate = true;
    }

    if (this.synapticPulse) {
      const mat = this.synapticPulse.material as THREE.PointsMaterial;
      mat.opacity = 0.035 + Math.sin(this.time * 1.6) * 0.02;
    }

    if (this.swarmMotes) {
      const mat = this.swarmMotes.material as THREE.PointsMaterial;
      mat.opacity = 0.04 + Math.sin(this.time * 1.1) * 0.02;
    }

    if (this.nebulaClouds) {
      const pos = this.nebulaClouds.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        pos.setX(i, pos.getX(i) + Math.sin(this.time * 0.3 + i) * 0.008);
        pos.setY(i, pos.getY(i) + Math.cos(this.time * 0.25 + i * 0.7) * 0.006);
      }
      pos.needsUpdate = true;
    }
    void this.effectKind;
  }

  dispose(): void {
    this.clearAll();
    this.discTexture.dispose();
  }

  private clearAll(): void {
    while (this.group.children.length) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child instanceof THREE.Line || child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      } else if (child instanceof THREE.Points) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }
    this.orbitalRings = [];
    this.structureRing = null;
    this.galaxyOrbitPhase = 0;
    this.hiveCells = [];
    this.galaxyBowl = null;
    this.gridLines = null;
    this.portalRing = null;
    this.portalShards = null;
    this.spiralArms = null;
    this.timelineAxis = null;
    this.nebulaClouds = null;
    this.synapticPulse = null;
    this.swarmMotes = null;
  }

  private buildGalaxyBowl(): void {
    const segments = 80;
    const r = starConquestGalaxyRadius();
    const pts: THREE.Vector3[] = [];
    for (let s = 0; s <= segments; s++) {
      const a = (s / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r * 0.82, -22));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: 0x6ad4f0,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.galaxyBowl = new THREE.Line(geom, mat);
    this.galaxyBowl.name = 'sc-galaxy-bowl';
    this.galaxyBowl.raycast = () => {};
    this.group.add(this.galaxyBowl);
  }

  private buildHiveCells(): void {
    const mq = starConquestMobileQuality('medium');
    const cells = starConquestHiveCells();
    for (const cell of cells) {
      const c = hiveCellCenter(cell);
      const hexR = starConquestGalaxyRadius() * 0.2;
      const pts = hiveHexPoints(c.x, c.y, c.z, hexR).map(
        (p) => new THREE.Vector3(p.x, p.y, p.z)
      );
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const fam = STAR_QUEST_FAMILIES[cell.family];
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color(fam.rgb[0], fam.rgb[1], fam.rgb[2]),
        transparent: true,
        opacity: mq.hiveOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const line = new THREE.Line(geom, mat);
      line.name = `sc-hive-cell-${cell.family}`;
      line.raycast = () => {};
      this.hiveCells.push(line);
      this.group.add(line);
    }
  }

  /** Anneau unique = orbite des 5 galaxies (même courbe / profondeur). */
  private buildGalaxyStructureRing(): void {
    const r = starConquestGalaxyRadius() * 0.62;
    const depthAmp = starConquestRingDepthAmp();
    const segments = 96;
    const pts: THREE.Vector3[] = [];
    for (let s = 0; s <= segments; s++) {
      // Aligné sur starConquestGalaxiesOnRing (phase 0) — rotation sync via setOrbitPhase
      const a = -Math.PI / 2 + (s / segments) * Math.PI * 2;
      pts.push(
        new THREE.Vector3(
          Math.cos(a) * r,
          Math.sin(a) * r * 0.72,
          Math.sin(a) * depthAmp
        )
      );
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: 0x7ad4f0,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Line(geom, mat);
    ring.name = 'sc-galaxy-structure-ring';
    ring.raycast = () => {};
    this.structureRing = ring;
    this.orbitalRings.push(ring);
    this.group.add(ring);
  }

  /** Sync le cercle 3D avec l’orbite des 5 galaxies (même paramétrage). */
  setOrbitPhase(phase: number): void {
    this.galaxyOrbitPhase = phase;
    if (!this.structureRing) return;
    const r = starConquestGalaxyRadius() * 0.62;
    const depthAmp = starConquestRingDepthAmp();
    const pos = this.structureRing.geometry.getAttribute('position') as THREE.BufferAttribute;
    const segments = Math.max(1, pos.count - 1);
    for (let s = 0; s < pos.count; s++) {
      const a = -Math.PI / 2 + (s / segments) * Math.PI * 2 + phase;
      pos.setXYZ(
        s,
        Math.cos(a) * r,
        Math.sin(a) * r * 0.72,
        Math.sin(a) * depthAmp
      );
    }
    pos.needsUpdate = true;
    // Pas de rotation.z : la courbe est déjà en phase avec les galaxies
    this.structureRing.rotation.set(0, 0, 0);
  }

  private buildOrbitalRings(): void {
    const radii = [22, 36, 52].map((r) => r * STAR_CONQUEST_SCALE.layout);
    for (let i = 0; i < radii.length; i++) {
      const segments = 64;
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= segments; s++) {
        const a = (s / segments) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * radii[i], Math.sin(a) * radii[i], -14 - i * 5));
      }
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: i % 2 === 0 ? 0x52e6ed : 0xb078f0,
        transparent: true,
        opacity: 0.16 + i * 0.05,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ring = new THREE.Line(geom, mat);
      ring.name = `sc-orbit-ring-${i}`;
      ring.raycast = () => {};
      this.orbitalRings.push(ring);
      this.group.add(ring);
    }
  }

  private buildM4t3rGrid(): void {
    const size = 80 * STAR_CONQUEST_SCALE.layout;
    const step = 8 * STAR_CONQUEST_SCALE.layout;
    const verts: number[] = [];
    for (let x = -size; x <= size; x += step) {
      verts.push(x, -size, -20, x, size, -20);
    }
    for (let y = -size; y <= size; y += step) {
      verts.push(-size, y, -20, size, y, -20);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xe8b86d,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.gridLines = new THREE.LineSegments(geom, mat);
    this.gridLines.name = 'sc-m4t3r-grid';
    this.gridLines.raycast = () => {};
    this.group.add(this.gridLines);
  }

  private buildNexusPortal(): void {
    const segments = 80;
    const pts: THREE.Vector3[] = [];
    const radius = 28 * STAR_CONQUEST_SCALE.layout;
    for (let s = 0; s <= segments; s++) {
      const a = (s / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius * 0.55, -8));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: 0x66ffee,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.portalRing = new THREE.Line(geom, mat);
    this.portalRing.name = 'sc-nexus-portal';
    this.portalRing.raycast = () => {};
    this.group.add(this.portalRing);

    const shardCount = STAR_QUEST_FAMILY_ORDER.length;
    const positions = new Float32Array(shardCount * 3);
    const colors = new Float32Array(shardCount * 3);
    for (let i = 0; i < shardCount; i++) {
      const theme = STAR_QUEST_FAMILIES[STAR_QUEST_FAMILY_ORDER[i % 5]];
      const i3 = i * 3;
      colors[i3] = theme.rgb[0];
      colors[i3 + 1] = theme.rgb[1];
      colors[i3 + 2] = theme.rgb[2];
    }
    const shardGeom = new THREE.BufferGeometry();
    shardGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    shardGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const shardMat = new THREE.PointsMaterial({
      size: 3.5 * STAR_CONQUEST_SCALE.visual,
      map: this.discTexture,
      transparent: true,
      opacity: 0.75,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.portalShards = new THREE.Points(shardGeom, shardMat);
    this.portalShards.name = 'sc-nexus-shards';
    this.portalShards.raycast = () => {};
    this.group.add(this.portalShards);
  }

  private buildGalaxySpiral(): void {
    const arms = 5;
    const ptsPerArm = 40;
    const verts: number[] = [];
    for (let arm = 0; arm < arms; arm++) {
      for (let i = 0; i < ptsPerArm; i++) {
        const t = i / ptsPerArm;
        const angle = t * Math.PI * 3 + (arm / arms) * Math.PI * 2;
        const r = 8 + t * 55;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r * 0.65;
        const z = -18 - t * 20;
        if (i > 0) {
          const prevT = (i - 1) / ptsPerArm;
          const prevAngle = prevT * Math.PI * 3 + (arm / arms) * Math.PI * 2;
          const prevR = 8 + prevT * 55;
          verts.push(
            Math.cos(prevAngle) * prevR,
            Math.sin(prevAngle) * prevR * 0.65,
            -18 - prevT * 20,
            x,
            y,
            z
          );
        }
      }
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0x9966ff,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.spiralArms = new THREE.LineSegments(geom, mat);
    this.spiralArms.name = 'sc-galaxy-spiral';
    this.spiralArms.raycast = () => {};
    this.group.add(this.spiralArms);
  }

  private buildTimelineAxis(): void {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -120, -45),
      new THREE.Vector3(0, 120, 45),
    ]);
    const mat = new THREE.LineBasicMaterial({
      color: 0x8899ff,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.timelineAxis = new THREE.Line(geom, mat);
    this.timelineAxis.name = 'sc-timeline-axis';
    this.timelineAxis.raycast = () => {};
    this.group.add(this.timelineAxis);
  }

  private buildNebulaClouds(): void {
    const count = 24;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 180;
      positions[i3 + 1] = (Math.random() - 0.5) * 380;
      positions[i3 + 2] = -40 - Math.random() * 60;
      colors[i3] = 0.4 + Math.random() * 0.3;
      colors[i3 + 1] = 0.2 + Math.random() * 0.25;
      colors[i3 + 2] = 0.6 + Math.random() * 0.35;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 18,
      map: this.discTexture,
      transparent: true,
      opacity: 0.12,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.nebulaClouds = new THREE.Points(geom, mat);
    this.nebulaClouds.name = 'sc-nebula-clouds';
    this.nebulaClouds.raycast = () => {};
    this.group.add(this.nebulaClouds);
  }

  private ensureQuestFx(anchors: readonly StarQuestAnchor[]): void {
    const n = anchors.length;
    const wantPulse =
      this.effectKind === 'agent-swarm' || this.effectKind === 'synaptic-pulse';
    const wantMotes = this.effectKind === 'agent-swarm';
    if (wantPulse) this.ensureSynapticPulse(n);
    else this.disposePulse();
    if (wantMotes) this.ensureSwarmMotes(n);
    else this.disposeMotes();
    this.writeQuestFx(anchors);
  }

  private writeQuestFx(anchors: readonly StarQuestAnchor[]): void {
    const n = anchors.length;
    if (n === 0) return;
    const layout = STAR_CONQUEST_SCALE.layout;
    if (this.synapticPulse) {
      const pos = this.synapticPulse.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const quest = anchors[i % n];
        const off = questEchoOffset(quest.id, 'pulse', 6 * layout);
        pos.setXYZ(i, quest.x + off.x, quest.y + off.y, quest.z + off.z - 4);
      }
      pos.needsUpdate = true;
    }
    if (this.swarmMotes) {
      const pos = this.swarmMotes.geometry.getAttribute('position') as THREE.BufferAttribute;
      const colors = this.swarmMotes.geometry.getAttribute('color') as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const quest = anchors[i % n];
        const off = questEchoOffset(quest.id, `mote:${i}`, 7 * layout);
        const spin = this.time * 0.35 + i * 0.7;
        pos.setXYZ(
          i,
          quest.x + off.x + Math.cos(spin) * 1.2,
          quest.y + off.y + Math.sin(spin) * 1.2,
          quest.z + off.z - 3
        );
        colors.setXYZ(i, quest.rgb[0], quest.rgb[1], quest.rgb[2]);
      }
      pos.needsUpdate = true;
      colors.needsUpdate = true;
    }
  }

  private recenterRings(anchors: readonly StarQuestAnchor[]): void {
    if (this.orbitalRings.length === 0 || anchors.length === 0) return;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (const a of anchors) {
      cx += a.x;
      cy += a.y;
      cz += a.z;
    }
    const inv = 1 / anchors.length;
    for (const ring of this.orbitalRings) {
      // Structure ring déjà en coords monde (sync phase) — ne pas recentrer
      if (ring === this.structureRing) {
        ring.position.set(0, 0, 0);
        continue;
      }
      ring.position.set(cx * inv, cy * inv, cz * inv - 8);
    }
    if (this.galaxyBowl) {
      this.galaxyBowl.position.set(cx * inv, cy * inv, cz * inv - 16);
    }
    for (const cell of this.hiveCells) {
      cell.position.set(cx * inv * 0.15, cy * inv * 0.15, 0);
    }
  }

  private ensureSynapticPulse(count: number): void {
    if (this.synapticPulse) {
      const current = this.synapticPulse.geometry.getAttribute('position').count;
      if (current === Math.max(count, 1) && count > 0) return;
      this.disposePulse();
    }
    if (count <= 0) return;
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const mat = new THREE.PointsMaterial({
      size: 1.4 * STAR_CONQUEST_SCALE.visual,
      map: this.discTexture,
      color: 0x52e6ed,
      transparent: true,
      opacity: 0.05,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.synapticPulse = new THREE.Points(geom, mat);
    this.synapticPulse.name = 'sc-synaptic-pulse';
    this.synapticPulse.raycast = () => {};
    this.group.add(this.synapticPulse);
  }

  private ensureSwarmMotes(count: number): void {
    if (this.swarmMotes) {
      const current = this.swarmMotes.geometry.getAttribute('position').count;
      if (current === Math.max(count, 1) && count > 0) return;
      this.disposeMotes();
    }
    if (count <= 0) return;
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const mat = new THREE.PointsMaterial({
      size: 0.95 * STAR_CONQUEST_SCALE.visual,
      map: this.discTexture,
      transparent: true,
      opacity: 0.06,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.swarmMotes = new THREE.Points(geom, mat);
    this.swarmMotes.name = 'sc-agent-swarm-motes';
    this.swarmMotes.raycast = () => {};
    this.group.add(this.swarmMotes);
  }

  private disposePulse(): void {
    if (!this.synapticPulse) return;
    this.group.remove(this.synapticPulse);
    this.synapticPulse.geometry.dispose();
    (this.synapticPulse.material as THREE.Material).dispose();
    this.synapticPulse = null;
  }

  private disposeMotes(): void {
    if (!this.swarmMotes) return;
    this.group.remove(this.swarmMotes);
    this.swarmMotes.geometry.dispose();
    (this.swarmMotes.material as THREE.Material).dispose();
    this.swarmMotes = null;
  }
}
