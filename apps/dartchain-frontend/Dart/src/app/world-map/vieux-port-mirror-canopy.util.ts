import * as THREE from 'three';

import type { MapQuality } from './map-configuration';
import {
  MIRROR_SPAWN_SAFE_ZONE,
  SCENE_COPY,
  SPAWN_CIRCLE_GROUND_COLOR,
  SPAWN_CIRCLE_GROUND_DEEP_COLOR,
} from './map-configuration';

/** Emprise gameplay de l’Ombrière — spawn juste au sud du centre, avant l’eau. */
export const MIRROR_CANOPY = {
  width: 18.4,
  depth: 12.2,
  thickness: 0.09,
  /** Y monde du plan verre (METRO_SPAWN_ANCHOR.mirror.y). */
  deckY: 8.0,
  /** Cambrure max du verre + marge — titre MetaVerseBB au-dessus. */
  titleClearance: 0.52,
  postInsetX: 7.35,
  postInsetZ: 4.55,
  postRadius: 0.13,
  postHeight: 7.82,
} as const;

export interface MirrorCanopyBuildResult {
  group: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  textures: THREE.Texture[];
}

/**
 * Ombrière Foster — dalle de verre cambrée, cadre acier, poteaux cylindriques,
 * esplanade humide et caustiques. Le Reflector (dessous miroir) reste côté provider.
 */
export function buildVieuxPortMirrorCanopy(
  quality: MapQuality,
  origin: { x: number; y: number; z: number }
): MirrorCanopyBuildResult {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const group = new THREE.Group();
  group.name = 'metaverse-mirror-canopy-group';
  group.position.set(origin.x, 0, origin.z);

  const segs = quality === 'high' ? 36 : quality === 'low' ? 16 : 24;
  const glassGeo = createCamberedCanopyGeometry(MIRROR_CANOPY.width, MIRROR_CANOPY.depth, segs);
  geometries.push(glassGeo);

  const glassTex = createGlassSkyTexture();
  textures.push(glassTex);
  const glassMat = createCanopyGlassMaterial(quality, glassTex);
  materials.push(glassMat);
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.name = 'metaverse-mirror-canopy';
  glass.position.y = origin.y;
  glass.renderOrder = 2;
  group.add(glass);

  const topGeo = glassGeo.clone();
  geometries.push(topGeo);
  // Face externe — chrome cyber clair (ne se fond pas dans le sol night-tech).
  const topMat =
    quality === 'high'
      ? new THREE.MeshPhysicalMaterial({
          color: 0xede7d9,
          roughness: 0.04,
          metalness: 0.82,
          envMapIntensity: 1.65,
          clearcoat: 1,
          clearcoatRoughness: 0.04,
          reflectivity: 0.9,
          iridescence: 0.45,
          iridescenceIOR: 1.3,
          emissive: 0x8a95a5,
          emissiveIntensity: 0.42,
          side: THREE.FrontSide,
        })
      : new THREE.MeshStandardMaterial({
          color: quality === 'low' ? 0xede7d9 : 0xede7d9,
          roughness: quality === 'low' ? 0.08 : 0.05,
          metalness: 0.78,
          envMapIntensity: quality === 'low' ? 1.25 : 1.45,
          emissive: 0x8a95a5,
          emissiveIntensity: quality === 'low' ? 0.38 : 0.48,
          side: THREE.FrontSide,
        });
  materials.push(topMat);
  const topSheet = new THREE.Mesh(topGeo, topMat);
  topSheet.name = 'metaverse-mirror-canopy-top';
  topSheet.position.y = origin.y + MIRROR_CANOPY.thickness * 0.55;
  group.add(topSheet);

  const titlePlate = buildMetaVerseBbTitlePlate(geometries, materials, textures);
  titlePlate.position.y = origin.y + MIRROR_CANOPY.titleClearance;
  group.add(titlePlate);

  const frame = buildSteelFrame(geometries, materials);
  frame.position.y = origin.y;
  group.add(frame);

  const posts = buildSteelPosts(geometries, materials);
  group.add(posts);

  // Remplissage sol spawn sous ombrière — même vert bouteille exclusif (intérieur du cercle).
  const plazaMat = new THREE.MeshLambertMaterial({
    color: SPAWN_CIRCLE_GROUND_COLOR,
    emissive: new THREE.Color(SPAWN_CIRCLE_GROUND_DEEP_COLOR),
    emissiveIntensity: 0.16,
    fog: true,
  });
  materials.push(plazaMat);
  const plazaGeo = new THREE.CircleGeometry(MIRROR_SPAWN_SAFE_ZONE.radiusMeters, 64);
  geometries.push(plazaGeo);
  const plaza = new THREE.Mesh(plazaGeo, plazaMat);
  plaza.name = 'metaverse-mirror-plaza';
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(0, 0.38, 0);
  plaza.renderOrder = 2;
  group.add(plaza);

  const led = buildUnderCanopyLed(geometries, materials);
  led.position.y = origin.y - 0.08;
  group.add(led);

  const underLight = new THREE.PointLight(0xede7d9, 1.15, 22, 1.8);
  underLight.name = 'metaverse-mirror-under-light';
  underLight.position.set(0, origin.y - 0.55, 0);
  group.add(underLight);

  const rimLightA = new THREE.PointLight(0x8a95a5, 0.42, 16, 2);
  rimLightA.name = 'metaverse-mirror-rim-a';
  rimLightA.position.set(-5.2, origin.y - 0.4, 2.4);
  group.add(rimLightA);

  const rimLightB = new THREE.PointLight(0x7b0d1e, 0.22, 14, 2);
  rimLightB.name = 'metaverse-mirror-rim-b';
  rimLightB.position.set(5.4, origin.y - 0.4, -2.1);
  group.add(rimLightB);

  return { group, geometries, materials, textures };
}

/** Dalle cambrée type Ombrière (légère voûte centrale + ondulation). */
export function createCamberedCanopyGeometry(
  width: number,
  depth: number,
  segments: number
): THREE.BufferGeometry {
  const segsZ = Math.max(8, Math.round(segments * (depth / width)));
  const geo = new THREE.PlaneGeometry(width, depth, segments, segsZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.getAttribute('position');
  const hw = width * 0.5;
  const hd = depth * 0.5;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const nx = x / hw;
    const nz = z / hd;
    const camber = (1 - nx * nx * 0.38) * (1 - nz * nz * 0.48) * 0.32;
    const ripple = Math.sin(nx * Math.PI) * Math.cos(nz * Math.PI * 0.85) * 0.07;
    pos.setY(i, camber + ripple);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function createCanopyGlassMaterial(
  quality: MapQuality,
  map: THREE.Texture
): THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial {
  if (quality !== 'high') {
    return new THREE.MeshStandardMaterial({
      color: quality === 'low' ? 0xede7d9 : 0xede7d9,
      map,
      roughness: quality === 'low' ? 0.05 : 0.035,
      metalness: quality === 'low' ? 0.88 : 0.94,
      transparent: true,
      opacity: quality === 'low' ? 0.72 : 0.78,
      envMapIntensity: quality === 'low' ? 1.55 : 1.85,
      emissive: 0x18314f,
      emissiveIntensity: quality === 'low' ? 0.14 : 0.18,
      side: THREE.DoubleSide,
    });
  }
  return new THREE.MeshPhysicalMaterial({
    color: 0xede7d9,
    map,
    roughness: 0.03,
    metalness: 0.55,
    transmission: 0.55,
    thickness: 0.45,
    ior: 1.48,
    transparent: true,
    opacity: 0.92,
    clearcoat: 1,
    clearcoatRoughness: 0.025,
    envMapIntensity: 2.05,
    reflectivity: 1,
    iridescence: 0.42,
    iridescenceIOR: 1.38,
    emissive: 0x18314f,
    emissiveIntensity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

function buildSteelFrame(
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): THREE.Group {
  const frame = new THREE.Group();
  frame.name = 'metaverse-mirror-frame';
  const steel = new THREE.MeshStandardMaterial({
    color: 0x8a95a5,
    roughness: 0.22,
    metalness: 0.92,
    envMapIntensity: 1.15,
  });
  materials.push(steel);
  const edgeH = 0.16;
  const edgeT = 0.18;
  const w = MIRROR_CANOPY.width;
  const d = MIRROR_CANOPY.depth;

  const addBar = (name: string, sx: number, sz: number, px: number, pz: number): void => {
    const geo = new THREE.BoxGeometry(sx, edgeH, sz);
    geometries.push(geo);
    const bar = new THREE.Mesh(geo, steel);
    bar.name = name;
    bar.position.set(px, 0.02, pz);
    frame.add(bar);
  };

  addBar('metaverse-mirror-frame-n', w + 0.22, edgeT, 0, -d * 0.5);
  addBar('metaverse-mirror-frame-s', w + 0.22, edgeT, 0, d * 0.5);
  addBar('metaverse-mirror-frame-w', edgeT, d, -w * 0.5, 0);
  addBar('metaverse-mirror-frame-e', edgeT, d, w * 0.5, 0);
  return frame;
}

function buildSteelPosts(
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): THREE.Group {
  const posts = new THREE.Group();
  posts.name = 'metaverse-mirror-posts';
  const chrome = new THREE.MeshStandardMaterial({
    color: 0xede7d9,
    roughness: 0.16,
    metalness: 0.96,
    envMapIntensity: 1.2,
  });
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x18314f,
    roughness: 0.45,
    metalness: 0.7,
  });
  materials.push(chrome, baseMat);
  const shaftGeo = new THREE.CylinderGeometry(
    MIRROR_CANOPY.postRadius,
    MIRROR_CANOPY.postRadius * 1.12,
    MIRROR_CANOPY.postHeight,
    12
  );
  const capGeo = new THREE.CylinderGeometry(
    MIRROR_CANOPY.postRadius * 1.55,
    MIRROR_CANOPY.postRadius * 1.35,
    0.18,
    12
  );
  const footGeo = new THREE.CylinderGeometry(0.32, 0.38, 0.16, 12);
  geometries.push(shaftGeo, capGeo, footGeo);

  const corners: Array<readonly [number, number]> = [
    [-MIRROR_CANOPY.postInsetX, -MIRROR_CANOPY.postInsetZ],
    [MIRROR_CANOPY.postInsetX, -MIRROR_CANOPY.postInsetZ],
    [-MIRROR_CANOPY.postInsetX, MIRROR_CANOPY.postInsetZ],
    [MIRROR_CANOPY.postInsetX, MIRROR_CANOPY.postInsetZ],
  ];
  for (const [x, z] of corners) {
    const shaft = new THREE.Mesh(shaftGeo, chrome);
    shaft.name = `metaverse-mirror-post-${x}-${z}`;
    shaft.position.set(x, MIRROR_CANOPY.postHeight * 0.5, z);
    posts.add(shaft);
    const cap = new THREE.Mesh(capGeo, chrome);
    cap.name = `metaverse-mirror-post-cap-${x}-${z}`;
    cap.position.set(x, MIRROR_CANOPY.postHeight - 0.04, z);
    posts.add(cap);
    const foot = new THREE.Mesh(footGeo, baseMat);
    foot.name = `metaverse-mirror-post-foot-${x}-${z}`;
    foot.position.set(x, 0.1, z);
    posts.add(foot);
  }
  return posts;
}

function buildUnderCanopyLed(
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): THREE.Group {
  const led = new THREE.Group();
  led.name = 'metaverse-mirror-led';
  const mat = new THREE.MeshBasicMaterial({
    color: 0xede7d9,
    transparent: true,
    opacity: 0.72,
  });
  materials.push(mat);
  const w = MIRROR_CANOPY.width - 0.55;
  const d = MIRROR_CANOPY.depth - 0.55;
  const stripT = 0.045;
  const stripH = 0.035;
  const addStrip = (name: string, sx: number, sz: number, px: number, pz: number): void => {
    const geo = new THREE.BoxGeometry(sx, stripH, sz);
    geometries.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = name;
    mesh.position.set(px, 0, pz);
    led.add(mesh);
  };
  addStrip('metaverse-mirror-led-n', w, stripT, 0, -d * 0.5);
  addStrip('metaverse-mirror-led-s', w, stripT, 0, d * 0.5);
  addStrip('metaverse-mirror-led-w', stripT, d, -w * 0.5, 0);
  addStrip('metaverse-mirror-led-e', stripT, d, w * 0.5, 0);
  return led;
}

/**
 * Police titre Ombrière — Orbitron 700 seule.
 * On attend la face avant le 1er paint, puis on ne re-peint jamais.
 */
export const METAVERSE_BB_TITLE_FONT = '700 188px Orbitron';
export const METAVERSE_BB_TITLE_FONT_CSS = '700 1em Orbitron';

let titleFontReadyPromise: Promise<boolean> | null = null;

if (typeof document !== 'undefined') {
  void ensureMetaVerseBbTitleFont();
}

/** Résout quand Orbitron 700 est chargeable (ou API fonts absente). */
export function ensureMetaVerseBbTitleFont(): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(true);
  const fonts = document.fonts;
  if (!fonts?.load) return Promise.resolve(true);
  if (fonts.check?.(METAVERSE_BB_TITLE_FONT) || fonts.check?.(METAVERSE_BB_TITLE_FONT_CSS)) {
    return Promise.resolve(true);
  }
  if (!titleFontReadyPromise) {
    titleFontReadyPromise = fonts
      .load(METAVERSE_BB_TITLE_FONT)
      .then(() => true)
      .catch(() => true);
  }
  return titleFontReadyPromise;
}

function buildMetaVerseBbTitlePlate(
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  textures: THREE.Texture[]
): THREE.Mesh {
  // Invisible jusqu’au paint Orbitron — évite d’afficher une police de secours.
  const mat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const tex = createMetaVerseBbTitleTexture(() => {
    mat.opacity = 1;
    mat.needsUpdate = true;
  });
  mat.map = tex;
  textures.push(tex);
  materials.push(mat);
  const geo = new THREE.PlaneGeometry(16.4, 4.1);
  geometries.push(geo);
  const plate = new THREE.Mesh(geo, mat);
  plate.name = 'metaverse-mirror-glass-title';
  plate.rotation.x = -Math.PI / 2;
  plate.renderOrder = 8;
  return plate;
}

/**
 * Texture titre Ombrière — un seul paint, après Orbitron si possible.
 * Jamais de second paint (pas de FOUT / morph).
 */
export function createMetaVerseBbTitleTexture(onPainted?: () => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 512;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;

  const commit = (): void => {
    if (tex.userData['metaverseBbTitlePainted']) return;
    paintMetaVerseBbTitle(canvas);
    tex.userData['metaverseBbTitlePainted'] = true;
    tex.needsUpdate = true;
    onPainted?.();
  };

  const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
  if (
    !fonts?.load ||
    fonts.check?.(METAVERSE_BB_TITLE_FONT) ||
    fonts.check?.(METAVERSE_BB_TITLE_FONT_CSS)
  ) {
    commit();
    return tex;
  }
  void ensureMetaVerseBbTitleFont().then(() => commit());
  return tex;
}

/** Peinture fixe : une police, une couleur, un contour — aucun effet animé. */
function paintMetaVerseBbTitle(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = METAVERSE_BB_TITLE_FONT;
  if ('letterSpacing' in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0.08em';
  }
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  const label = SCENE_COPY.canopyTitle;
  const x = canvas.width / 2;
  const y = canvas.height / 2;
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(10, 18, 32, 0.92)';
  ctx.lineWidth = 28;
  ctx.strokeText(label, x, y);
  ctx.fillStyle = '#ede7d9';
  ctx.fillText(label, x, y);
}

function createGlassSkyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#8b9dad');
    g.addColorStop(0.35, '#ede7d9');
    g.addColorStop(0.7, '#8b9dad');
    g.addColorStop(1, '#235789');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 18; i++) {
      const y = (i / 18) * canvas.height;
      ctx.fillStyle = i % 2 === 0 ? '#ede7d9' : '#8b9dad';
      ctx.fillRect(0, y, canvas.width, 4);
    }
    ctx.globalAlpha = 1;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.2, 1.6);
  tex.needsUpdate = true;
  return tex;
}

