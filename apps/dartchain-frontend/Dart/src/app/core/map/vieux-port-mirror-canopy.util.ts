import * as THREE from 'three';

import type { MapQuality } from './map-configuration';
import { SCENE_COPY } from './map-configuration';

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
  group.name = 'marseille-mirror-canopy-group';
  group.position.set(origin.x, 0, origin.z);

  const segs = quality === 'high' ? 36 : quality === 'low' ? 16 : 24;
  const glassGeo = createCamberedCanopyGeometry(MIRROR_CANOPY.width, MIRROR_CANOPY.depth, segs);
  geometries.push(glassGeo);

  const glassTex = createGlassSkyTexture();
  textures.push(glassTex);
  const glassMat = createCanopyGlassMaterial(quality, glassTex);
  materials.push(glassMat);
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.name = 'marseille-mirror-canopy';
  glass.position.y = origin.y;
  glass.renderOrder = 2;
  group.add(glass);

  const topGeo = glassGeo.clone();
  geometries.push(topGeo);
  const topMat = new THREE.MeshStandardMaterial({
    color: 0xd8e8f4,
    roughness: 0.08,
    metalness: 0.92,
    envMapIntensity: 1.45,
    emissive: 0x1a3048,
    emissiveIntensity: 0.12,
    side: THREE.FrontSide,
  });
  materials.push(topMat);
  const topSheet = new THREE.Mesh(topGeo, topMat);
  topSheet.name = 'marseille-mirror-canopy-top';
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

  const plazaTex = createPlazaStoneTexture();
  textures.push(plazaTex);
  const plazaMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: plazaTex,
    roughness: 0.42,
    metalness: 0.18,
    envMapIntensity: 0.85,
  });
  materials.push(plazaMat);
  const plazaGeo = new THREE.CircleGeometry(13.2, 48);
  geometries.push(plazaGeo);
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
  plaza.name = 'marseille-mirror-plaza';
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(0, 0.36, 0);
  group.add(plaza);

  const causticTex = createCausticPoolTexture();
  textures.push(causticTex);
  const causticMat = new THREE.MeshBasicMaterial({
    map: causticTex,
    color: 0xb8f4ff,
    transparent: true,
    opacity: 0.38,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  materials.push(causticMat);
  const causticGeo = new THREE.CircleGeometry(9.4, 40);
  geometries.push(causticGeo);
  const caustic = new THREE.Mesh(causticGeo, causticMat);
  caustic.name = 'marseille-mirror-caustic';
  caustic.rotation.x = -Math.PI / 2;
  caustic.position.set(0, 0.38, 0);
  caustic.renderOrder = 3;
  group.add(caustic);

  const auraInner = new THREE.Mesh(
    new THREE.RingGeometry(8.2, 9.1, 56),
    new THREE.MeshBasicMaterial({
      color: 0x9ef6ff,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  auraInner.name = 'marseille-mirror-aura';
  auraInner.rotation.x = -Math.PI / 2;
  auraInner.position.set(0, 0.052, 0);
  geometries.push(auraInner.geometry);
  materials.push(auraInner.material);
  group.add(auraInner);

  const auraOuter = new THREE.Mesh(
    new THREE.RingGeometry(10.4, 11.6, 56),
    new THREE.MeshBasicMaterial({
      color: 0x6ad4ff,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  auraOuter.name = 'marseille-mirror-aura-outer';
  auraOuter.rotation.x = -Math.PI / 2;
  auraOuter.position.set(0, 0.05, 0);
  geometries.push(auraOuter.geometry);
  materials.push(auraOuter.material);
  group.add(auraOuter);

  const led = buildUnderCanopyLed(geometries, materials);
  led.position.y = origin.y - 0.08;
  group.add(led);

  const underLight = new THREE.PointLight(0x8eeeff, 1.15, 22, 1.8);
  underLight.name = 'marseille-mirror-under-light';
  underLight.position.set(0, origin.y - 0.55, 0);
  group.add(underLight);

  const rimLightA = new THREE.PointLight(0x40e0ff, 0.42, 16, 2);
  rimLightA.name = 'marseille-mirror-rim-a';
  rimLightA.position.set(-5.2, origin.y - 0.4, 2.4);
  group.add(rimLightA);

  const rimLightB = new THREE.PointLight(0xff7ad9, 0.22, 14, 2);
  rimLightB.name = 'marseille-mirror-rim-b';
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
  if (quality === 'low') {
    return new THREE.MeshStandardMaterial({
      color: 0xc8e8ff,
      map,
      roughness: 0.08,
      metalness: 0.72,
      transparent: true,
      opacity: 0.62,
      envMapIntensity: 1.2,
      emissive: 0x1a3a55,
      emissiveIntensity: 0.18,
      side: THREE.DoubleSide,
    });
  }
  return new THREE.MeshPhysicalMaterial({
    color: 0xe8f7ff,
    map,
    roughness: 0.045,
    metalness: 0.22,
    transmission: 0.72,
    thickness: 0.55,
    ior: 1.52,
    transparent: true,
    opacity: 0.88,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.55,
    reflectivity: 1,
    iridescence: 0.28,
    iridescenceIOR: 1.4,
    emissive: 0x163048,
    emissiveIntensity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

function buildSteelFrame(
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): THREE.Group {
  const frame = new THREE.Group();
  frame.name = 'marseille-mirror-frame';
  const steel = new THREE.MeshStandardMaterial({
    color: 0x8fa0b0,
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

  addBar('marseille-mirror-frame-n', w + 0.22, edgeT, 0, -d * 0.5);
  addBar('marseille-mirror-frame-s', w + 0.22, edgeT, 0, d * 0.5);
  addBar('marseille-mirror-frame-w', edgeT, d, -w * 0.5, 0);
  addBar('marseille-mirror-frame-e', edgeT, d, w * 0.5, 0);
  return frame;
}

function buildSteelPosts(
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): THREE.Group {
  const posts = new THREE.Group();
  posts.name = 'marseille-mirror-posts';
  const chrome = new THREE.MeshStandardMaterial({
    color: 0xc5d2de,
    roughness: 0.16,
    metalness: 0.96,
    envMapIntensity: 1.2,
  });
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x3a4652,
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
    shaft.name = `marseille-mirror-post-${x}-${z}`;
    shaft.position.set(x, MIRROR_CANOPY.postHeight * 0.5, z);
    posts.add(shaft);
    const cap = new THREE.Mesh(capGeo, chrome);
    cap.name = `marseille-mirror-post-cap-${x}-${z}`;
    cap.position.set(x, MIRROR_CANOPY.postHeight - 0.04, z);
    posts.add(cap);
    const foot = new THREE.Mesh(footGeo, baseMat);
    foot.name = `marseille-mirror-post-foot-${x}-${z}`;
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
  led.name = 'marseille-mirror-led';
  const mat = new THREE.MeshBasicMaterial({
    color: 0x7ef6ff,
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
  addStrip('marseille-mirror-led-n', w, stripT, 0, -d * 0.5);
  addStrip('marseille-mirror-led-s', w, stripT, 0, d * 0.5);
  addStrip('marseille-mirror-led-w', stripT, d, -w * 0.5, 0);
  addStrip('marseille-mirror-led-e', stripT, d, w * 0.5, 0);
  return led;
}

function buildMetaVerseBbTitlePlate(
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  textures: THREE.Texture[]
): THREE.Mesh {
  const tex = createMetaVerseBbTitleTexture();
  textures.push(tex);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  materials.push(mat);
  const geo = new THREE.PlaneGeometry(16.4, 4.1);
  geometries.push(geo);
  const plate = new THREE.Mesh(geo, mat);
  plate.name = 'marseille-mirror-glass-title';
  plate.rotation.x = -Math.PI / 2;
  plate.renderOrder = 8;
  return plate;
}

/** Texture « MetaVerseBB » pour le dessus du miroir. */
export function createMetaVerseBbTitleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const fill = ctx.createLinearGradient(0, 0, canvas.width, 0);
    fill.addColorStop(0, '#7ef6ff');
    fill.addColorStop(0.5, '#ffffff');
    fill.addColorStop(1, '#ff7ad9');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 220px Arial Black, Arial, sans-serif';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.shadowColor = 'rgba(0, 40, 70, 0.85)';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = 'rgba(4, 12, 24, 0.95)';
    ctx.lineWidth = 28;
    ctx.strokeText(SCENE_COPY.canopyTitle, canvas.width / 2, canvas.height / 2);
    ctx.shadowColor = '#40e0ff';
    ctx.shadowBlur = 28;
    ctx.fillStyle = fill;
    ctx.fillText(SCENE_COPY.canopyTitle, canvas.width / 2, canvas.height / 2);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(230, 250, 255, 0.9)';
    ctx.lineWidth = 6;
    ctx.strokeText(SCENE_COPY.canopyTitle, canvas.width / 2, canvas.height / 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function createGlassSkyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#8eb8e8');
    g.addColorStop(0.35, '#c8e4f8');
    g.addColorStop(0.7, '#6a9cc8');
    g.addColorStop(1, '#1a3048');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 18; i++) {
      const y = (i / 18) * canvas.height;
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#40c8ff';
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

function createPlazaStoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#c4bbb0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const tiles = 8;
    const tw = canvas.width / tiles;
    for (let iy = 0; iy < tiles; iy++) {
      for (let ix = 0; ix < tiles; ix++) {
        const shade = 180 + ((ix * 13 + iy * 7) % 28);
        ctx.fillStyle = `rgb(${shade}, ${shade - 8}, ${shade - 18})`;
        ctx.fillRect(ix * tw + 1, iy * tw + 1, tw - 2, tw - 2);
      }
    }
    const wet = ctx.createRadialGradient(256, 256, 20, 256, 256, 240);
    wet.addColorStop(0, 'rgba(180, 230, 255, 0.28)');
    wet.addColorStop(0.55, 'rgba(160, 190, 210, 0.1)');
    wet.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = wet;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function createCausticPoolTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.28, 'rgba(160, 240, 255, 0.55)');
    g.addColorStop(0.62, 'rgba(80, 200, 255, 0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}
