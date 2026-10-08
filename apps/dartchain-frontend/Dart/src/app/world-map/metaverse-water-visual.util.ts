import * as THREE from 'three';

/** Texture procédurale — eau méditerranéenne (turquoise → bleu profond). */
export function createHarborWaterTexture(seed = 0): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas);
    fallback.colorSpace = THREE.SRGBColorSpace;
    return fallback;
  }

  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;
  const gradient = ctx.createRadialGradient(cx, cy * 0.82, 40, cx, cy, canvas.width * 0.62);
  gradient.addColorStop(0, '#ede7d9');
  gradient.addColorStop(0.28, '#8b9dad');
  gradient.addColorStop(0.55, '#8b9dad');
  gradient.addColorStop(0.82, '#09814a');
  gradient.addColorStop(1, '#235789');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 2800; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const a = 0.015 + Math.random() * 0.04;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(237, 231, 217, ${a})` : `rgba(35, 87, 137, ${a})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }

  ctx.strokeStyle = 'rgba(237, 231, 217, 0.14)';
  ctx.lineWidth = 1.2;
  for (let wave = 0; wave < 18; wave++) {
    ctx.beginPath();
    const baseY = (wave / 18) * canvas.height;
    for (let x = 0; x <= canvas.width; x += 12) {
      const y = baseY + Math.sin(x * 0.018 + wave * 1.7 + seed) * 7;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.globalCompositeOperation = 'screen';
  for (let streak = 0; streak < 6; streak++) {
    const sx = canvas.width * (0.15 + streak * 0.13);
    const grad = ctx.createLinearGradient(sx - 30, 0, sx + 90, canvas.height);
    grad.addColorStop(0, 'rgba(237, 231, 217,0)');
    grad.addColorStop(0.45, 'rgba(237, 231, 217,0.22)');
    grad.addColorStop(1, 'rgba(237, 231, 217,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(sx - 40, 0, 120, canvas.height);
  }
  ctx.globalCompositeOperation = 'source-over';

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.anisotropy = 8;
  return texture;
}

export function createHarborWaterSurfaceMaterial(map: THREE.Texture): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0xede7d9,
    map,
    transparent: true,
    opacity: 0.94,
    roughness: 0.06,
    metalness: 0.08,
    transmission: 0.38,
    thickness: 1.4,
    ior: 1.33,
    envMapIntensity: 1.35,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    reflectivity: 0.92,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
}

export function createHarborWaterDeepMaterial(deepColor: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: deepColor,
    emissive: new THREE.Color(0x18314f),
    emissiveIntensity: 0.62,
    roughness: 0.95,
    metalness: 0.02,
    transparent: true,
    opacity: 0.98,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
}

export function createHarborFoamMaterial(foamColor: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: foamColor,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
}

export function createHarborPitWallMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x18314f,
    roughness: 0.92,
    metalness: 0.05,
    emissive: new THREE.Color(0x0d0630),
    emissiveIntensity: 0.42,
  });
}

export function createHarborQuayCapMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xede7d9,
    roughness: 0.72,
    metalness: 0.06,
    emissive: new THREE.Color(0x0d0630),
    emissiveIntensity: 0.08,
  });
}
