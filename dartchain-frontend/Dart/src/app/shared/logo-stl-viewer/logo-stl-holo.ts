import { hexToThree } from '../../core/constants/palette';
import type { BufferGeometry, Color, MeshPhysicalMaterial, Scene } from 'three';

/**
 * Palette luluw (7) — source de vérité logo.stl / clic navbar.
 * Chaque clic cycle une teinte distincte (7 clics = 7 couleurs).
 */
export const LULUW_LOGO_HEX = [
  '#0a1220', // Bleu Foncé
  '#235789', // Bleu clair terne
  '#8b9dad', // Bleu gris
  '#ede7d9', // Blanc cassé
  '#d5a021', // Jaune doré
  '#09814a', // Vert sea green
  '#7b0d1e', // Rouge boursier
] as const;

export type LuluwLogoHex = (typeof LULUW_LOGO_HEX)[number];

/** Look de base logo.stl — ancré sur Bleu clair terne + accents luluw. */
export const LOGO_HOLO = {
  base: hexToThree('#235789'),
  emissive: hexToThree('#0a1220'),
  sheen: hexToThree('#8b9dad'),
  rimA: hexToThree('#09814a'),
  rimB: hexToThree('#d5a021'),
  key: hexToThree('#ede7d9'),
  fill: hexToThree('#8b9dad'),
  core: hexToThree('#ede7d9'),
  ambient: hexToThree('#0a1220'),
  edgeBright: hexToThree('#235789'),
  edgeGlow: hexToThree('#8b9dad'),
  /** Accent relief du R (doré luluw — catch light, pas une tache). */
  reliefAccent: hexToThree('#d5a021'),
} as const;

/** Cycle clic navbar — exactement les 7 couleurs luluw, une par index. */
export const LOGO_HOLO_EMISSIVE_HEX = LULUW_LOGO_HEX;

/** Sheen compagnon : couleur suivante dans le cycle luluw. */
export const LOGO_HOLO_SHEEN_HEX = [
  LULUW_LOGO_HEX[1],
  LULUW_LOGO_HEX[2],
  LULUW_LOGO_HEX[3],
  LULUW_LOGO_HEX[4],
  LULUW_LOGO_HEX[5],
  LULUW_LOGO_HEX[6],
  LULUW_LOGO_HEX[0],
] as const;

/** Props matière — sans iridescence (compile WebGL nettement plus rapide). */
export const LOGO_HOLO_PHYSICAL = {
  metalness: 0.42,
  roughness: 0.34,
  clearcoat: 0.85,
  clearcoatRoughness: 0.18,
  sheen: 0.28,
  sheenRoughness: 0.5,
  reflectivity: 0.58,
  emissiveIntensity: 0.42,
} as const;

/** Uniforms : catch light sur le relief embossé (lettre R), pas un disque radial. */
export type LogoHoloReliefUniforms = {
  uFaceHeight: { value: number };
  uCrestHeight: { value: number };
  uStrength: { value: number };
  uThinAxis: { value: number };
  uAccent: { value: Color };
};

/** @deprecated Alias — préférer LogoHoloReliefUniforms. */
export type LogoHoloCenterDarkUniforms = LogoHoloReliefUniforms;

export type LogoHoloThree = typeof import('three');

/**
 * Variante clic / cycle — 7 looks distincts = 7 couleurs luluw.
 * color + emissive = teinte courante (bien visible sur le token).
 * rim / core = teintes voisines du cycle pour le relief.
 */
export function logoHoloPaletteVariant(index: number): {
  color: number;
  emissive: number;
  rim: number;
  core: number;
} {
  const n = LULUW_LOGO_HEX.length;
  const i = ((index % n) + n) % n;
  const rimI = (i + 1) % n;
  const coreI = (i + 2) % n;
  return {
    color: hexToThree(LULUW_LOGO_HEX[i]),
    emissive: hexToThree(LULUW_LOGO_HEX[i]),
    rim: hexToThree(LULUW_LOGO_HEX[rimI]),
    core: hexToThree(LULUW_LOGO_HEX[coreI]),
  };
}

export function detectLogoThinAxis(
  THREE: LogoHoloThree,
  geometry: BufferGeometry,
): { thin: InstanceType<LogoHoloThree['Vector3']>; axisCode: number; faceRadius: number; thickness: number } {
  geometry.computeBoundingBox();
  const size = new THREE.Vector3();
  geometry.boundingBox?.getSize(size);
  const thin = new THREE.Vector3(0, 0, 1);
  let axisCode = 2;
  let thickness = size.z;
  if (size.x > 0 && size.x <= size.y && size.x <= size.z) {
    thin.set(1, 0, 0);
    axisCode = 0;
    thickness = size.x;
  } else if (size.y > 0 && size.y <= size.x && size.y <= size.z) {
    thin.set(0, 1, 0);
    axisCode = 1;
    thickness = size.y;
  }
  const faceRadius =
    axisCode === 0
      ? Math.max(size.y, size.z) * 0.5
      : axisCode === 1
        ? Math.max(size.x, size.z) * 0.5
        : Math.max(size.x, size.y) * 0.5 || Math.max(geometry.boundingSphere?.radius ?? 1, 1);
  return { thin, axisCode, faceRadius, thickness: Math.max(thickness, 1e-4) };
}

/**
 * Seuils hauteur : plateau du jeton vs crête du R embossé.
 * Suit la lettre, pas un cercle au centre.
 */
export function createLogoHoloReliefUniforms(
  THREE: LogoHoloThree,
  geometry: BufferGeometry,
): LogoHoloReliefUniforms {
  const { axisCode, thickness } = detectLogoThinAxis(THREE, geometry);
  const half = thickness * 0.5;
  return {
    uFaceHeight: { value: half * 0.28 },
    uCrestHeight: { value: half * 0.78 },
    uStrength: { value: 0.62 },
    uThinAxis: { value: axisCode },
    uAccent: { value: new THREE.Color(LOGO_HOLO.reliefAccent) },
  };
}

/** @deprecated */
export function createLogoHoloCenterDarkUniforms(
  THREE: LogoHoloThree,
  geometry: BufferGeometry,
): LogoHoloReliefUniforms {
  return createLogoHoloReliefUniforms(THREE, geometry);
}

/**
 * Catch light sur le relief embossé (R) :
 * - lissage sur la hauteur d’extrusion (axe mince)
 * - fresnel local léger pour un bord métallique lisible
 * - pas de tache de couleur circulaire
 */
export function bindLogoReliefAccentShader(
  material: MeshPhysicalMaterial,
  uniforms: LogoHoloReliefUniforms,
): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms['uFaceHeight'] = uniforms.uFaceHeight;
    shader.uniforms['uCrestHeight'] = uniforms.uCrestHeight;
    shader.uniforms['uStrength'] = uniforms.uStrength;
    shader.uniforms['uThinAxis'] = uniforms.uThinAxis;
    shader.uniforms['uAccent'] = uniforms.uAccent;

    shader.vertexShader = shader.vertexShader.replace(
      'void main() {',
      `varying vec3 vHoloLocal;
varying vec3 vHoloNormal;
void main() {`,
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
  vHoloLocal = position;
  vHoloNormal = normalize(normal);`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      'void main() {',
      `varying vec3 vHoloLocal;
varying vec3 vHoloNormal;
uniform float uFaceHeight;
uniform float uCrestHeight;
uniform float uStrength;
uniform float uThinAxis;
uniform vec3 uAccent;
void main() {`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
  float holoAlong = abs(vHoloLocal.z);
  if (uThinAxis < 0.5) holoAlong = abs(vHoloLocal.x);
  else if (uThinAxis < 1.5) holoAlong = abs(vHoloLocal.y);
  float letter = smoothstep(uFaceHeight, uCrestHeight, holoAlong);
  letter = letter * letter * (3.0 - 2.0 * letter);
  float edgeCatch = pow(1.0 - abs(dot(normalize(vHoloNormal), vec3(0.0, 0.0, 1.0))), 1.6);
  float accentMask = clamp(letter * (0.55 + edgeCatch * 0.7), 0.0, 1.0) * uStrength;
  // Teinte dorée discrète + boost specular — silhouette du R, pas un blob.
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.82 + uAccent * 0.55, accentMask * 0.5);
  totalEmissiveRadiance += uAccent * accentMask * 0.38;`,
    );
  };
  material.customProgramCacheKey = () => 'logo-stl-holo-relief-accent-v2';
}

/** @deprecated */
export function bindLogoCenterDarkShader(
  material: MeshPhysicalMaterial,
  uniforms: LogoHoloReliefUniforms,
): void {
  bindLogoReliefAccentShader(material, uniforms);
}

export function createLogoHoloMaterial(
  THREE: LogoHoloThree,
  geometry?: BufferGeometry,
): { material: MeshPhysicalMaterial; centerDark?: LogoHoloReliefUniforms; relief?: LogoHoloReliefUniforms } {
  const material = new THREE.MeshPhysicalMaterial({
    color: LOGO_HOLO.edgeBright,
    emissive: LOGO_HOLO.edgeGlow,
    ...LOGO_HOLO_PHYSICAL,
    sheenColor: new THREE.Color(LOGO_HOLO.edgeGlow),
    side: THREE.DoubleSide,
  });
  if (!geometry) {
    return { material };
  }
  const relief = createLogoHoloReliefUniforms(THREE, geometry);
  bindLogoReliefAccentShader(material, relief);
  return { material, centerDark: relief, relief };
}

export function addLogoHoloLights(
  THREE: LogoHoloThree,
  scene: Scene,
  scale = 1,
): {
  ambient: InstanceType<LogoHoloThree['AmbientLight']>;
  key: InstanceType<LogoHoloThree['DirectionalLight']>;
  fill: InstanceType<LogoHoloThree['DirectionalLight']>;
  rimA: InstanceType<LogoHoloThree['PointLight']>;
  rimB: InstanceType<LogoHoloThree['PointLight']>;
  core: InstanceType<LogoHoloThree['PointLight']>;
} {
  const ambient = new THREE.AmbientLight(LOGO_HOLO.ambient, 0.62);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(LOGO_HOLO.key, 2.1);
  key.position.set(0.55 * scale, 1.05 * scale, 3.6 * scale);
  scene.add(key);
  const fill = new THREE.DirectionalLight(LOGO_HOLO.fill, 0.85);
  fill.position.set(-2.4 * scale, 0.45 * scale, 2.2 * scale);
  scene.add(fill);
  const rimA = new THREE.PointLight(LOGO_HOLO.rimA, 1.55, 16 * scale);
  rimA.position.set(-2.1 * scale, -0.7 * scale, -0.5 * scale);
  scene.add(rimA);
  const rimB = new THREE.PointLight(LOGO_HOLO.rimB, 1.7, 16 * scale);
  rimB.position.set(2.2 * scale, 1.0 * scale, -0.35 * scale);
  scene.add(rimB);
  // Spot discret sur le relief central — renforce le R sans tache colorée.
  const core = new THREE.PointLight(LOGO_HOLO.core, 1.35, 9 * scale);
  core.position.set(0.05 * scale, 0.08 * scale, 2.35 * scale);
  scene.add(core);
  return { ambient, key, fill, rimA, rimB, core };
}

export function lerpLogoHoloCycle(stops: Color[], phase: number, out: Color): void {
  const n = stops.length;
  if (n === 0) return;
  if (n === 1) {
    out.copy(stops[0]);
    return;
  }
  const wrapped = ((phase % n) + n) % n;
  const i0 = Math.floor(wrapped);
  const i1 = (i0 + 1) % n;
  out.copy(stops[i0]).lerp(stops[i1], wrapped - i0);
}

/** Tick apparence : corps métal + catch light animé sur le relief du R. */
export function tickLogoHoloAppearance(opts: {
  material: MeshPhysicalMaterial;
  centerDark?: LogoHoloReliefUniforms;
  relief?: LogoHoloReliefUniforms;
  emissiveStops: Color[];
  sheenStops: Color[];
  scratchA: Color;
  scratchB: Color;
  edgeBright: Color;
  edgeGlow: Color;
  elapsed: number;
  bright?: number;
}): void {
  const bright = opts.bright ?? 0.55;
  const relief = opts.relief ?? opts.centerDark;
  lerpLogoHoloCycle(opts.emissiveStops, opts.elapsed * 0.18, opts.scratchA);
  lerpLogoHoloCycle(opts.sheenStops, opts.elapsed * 0.14, opts.scratchB);

  opts.material.color.copy(opts.edgeBright);
  opts.material.emissive.copy(opts.edgeGlow);
  opts.material.sheenColor.copy(opts.edgeGlow);
  opts.material.emissiveIntensity = 0.38 + bright * 0.32 + Math.sin(opts.elapsed * 1.2) * 0.025;
  opts.material.metalness = 0.4;
  opts.material.roughness = 0.36 - bright * 0.05;
  opts.material.clearcoat = 0.8 + bright * 0.12;

  if (relief) {
    // Doré luluw dominant + léger mélange cycle — catch light, pas une tache.
    relief.uAccent.value.set(LOGO_HOLO.reliefAccent);
    relief.uAccent.value.lerp(opts.scratchA, 0.22);
    relief.uStrength.value = 0.48 + bright * 0.28 + Math.sin(opts.elapsed * 1.1) * 0.04;
  }
}
