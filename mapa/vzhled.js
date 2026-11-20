import * as T from 'three';

// Presentation colours. The choice is keyed by the footprint, never by author.
export const roofTones = [0xb4614b, 0xc67b58, 0x995344, 0xbe704f, 0x89675a, 0xca8d68, 0x64717b];
export const wallTones = [0xf1dfb9, 0xdfc59d, 0xe6d4af, 0xf3e4c7];
// Seasonal colours are an interpretation of the surveyed vegetation.
export const autumnLeaves = {
  atlas: [0xb39748, 0xb87444, 0x89894b, 0xa45e3b, 0xc4a351, 0xa78546],
  minimapa: [0xd39f43, 0xc8793f, 0x91934c, 0xb45e39, 0xe0b552, 0xb78f43]
};
export const autumnGround = {
  lawn: {atlas: 0xa5a278, minimapa: 0xb0aa6e},
  garden: {atlas: 0xa19b71, minimapa: 0xa9a169},
  woodland: {atlas: 0x90875e, minimapa: 0x998e60}
};
export function hasCrowns(mode) {
  return mode === 'crowns' || mode === 'autumn';
}
export function toneFor(tones, id) {
  return tones[Math.abs(Number(id) || 0) % tones.length];
}

export function mapAppearance(renderer, scene, sky, sun) {
  const effects = [];
  const seasonEffects = [];
  const groundMaterials = new Map();
  const seasonalGrounds = new WeakSet();
  const facets = new T.IcosahedronGeometry(1, 0);
  const original = {
    background: scene.background.clone(), sky: sky.color.clone(), earth: sky.groundColor.clone(),
    sunlight: sun.color.clone(), skyPower: sky.intensity, sunPower: sun.intensity,
    direction: sun.position.clone(), exposure: renderer.toneMappingExposure
  };
  const direction = new T.Vector3(-0.7, 1, 0.54).normalize();
  const resolution = Math.min(2048, renderer.capabilities.maxTextureSize);
  sun.shadow.mapSize.set(resolution, resolution);
  sun.shadow.bias = -0.00065;
  sun.shadow.normalBias = 0.13;
  scene.add(sun.target);
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  let name = 'atlas';
  let autumn = false;
  let lastRadius = 0;

  function onChange(effect) {
    effects.push(effect);
    effect(name === 'minimapa');
  }

  function onSeason(effect) {
    const update = active => effect(active, autumn);
    seasonEffects.push(update);
    onChange(update);
  }

  function setAutumn(next) {
    if (next === autumn) return;
    autumn = next;
    for (const update of seasonEffects) update(name === 'minimapa');
  }

  function tint(material, tone, fall) {
    const before = material.color.clone(), after = new T.Color(tone);
    if (fall) {
      const atlas = new T.Color(fall.atlas), minimapa = new T.Color(fall.minimapa);
      onSeason((active, isAutumn) => {
        if (isAutumn) material.color.copy(active ? minimapa : atlas);
        else material.color.copy(active ? after : before);
      });
    } else onChange(active => material.color.copy(active ? after : before));
    return material;
  }

  // Keep the original unlit surface, including its render order and pick identity.
  // The alternate material on the same mesh can receive directional shadows.
  function ground(mesh, tone, fall) {
    const originalMaterial = mesh.material;
    const key = `${tone}/${originalMaterial.side}/${fall?.minimapa ?? ''}`;
    if (!groundMaterials.has(key)) {
      const styled = new T.MeshLambertMaterial({color: tone, side: originalMaterial.side});
      if (fall) tint(styled, tone, fall);
      groundMaterials.set(key, styled);
    }
    if (fall && !seasonalGrounds.has(originalMaterial)) {
      seasonalGrounds.add(originalMaterial);
      tint(originalMaterial, originalMaterial.color, fall);
    }
    const styled = groundMaterials.get(key);
    mesh.receiveShadow = true;
    onChange(active => { mesh.material = active ? styled : originalMaterial; });
  }

  function crowns(mesh, summerTones, summerTint) {
    const full = mesh.geometry;
    mesh.castShadow = mesh.receiveShadow = true;
    onChange(active => { mesh.geometry = active ? facets : full; });
    if (!summerTones) return;

    // Neighbours tend to turn together. The variation stays anchored to the map.
    const shades = new Uint8Array(mesh.count), matrix = new T.Matrix4(), color = new T.Color();
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix);
      const x = matrix.elements[12], z = matrix.elements[14];
      const patch = Math.imul(Math.floor(x / 28), 73856093) ^ Math.imul(Math.floor(z / 28), 19349663);
      const tree = Math.imul(Math.round(x), 19349663) ^ Math.imul(Math.round(z), 83492791);
      shades[i] = ((tree % 4 === 0 ? tree : patch) >>> 0) % autumnLeaves.atlas.length;
    }
    onSeason((active, isAutumn) => {
      const fall = active ? autumnLeaves.minimapa : autumnLeaves.atlas;
      mesh.material.color.setHex(active && !isAutumn ? summerTint : 0xffffff);
      for (let i = 0; i < mesh.count; i++) {
        mesh.setColorAt(i, color.setHex(isAutumn ? fall[shades[i]] : summerTones[i % summerTones.length]));
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }

  function set(next) {
    if (next === name) return;
    name = next;
    lastRadius = 0;
    const active = name === 'minimapa';
    if (active) {
      scene.background.set(0xf2ead4);
      sky.color.set(0xeaf3ff);
      sky.groundColor.set(0xd6cbb8);
      sun.color.set(0xffefda);
    } else {
      scene.background.copy(original.background);
      sky.color.copy(original.sky);
      sky.groundColor.copy(original.earth);
      sun.color.copy(original.sunlight);
      sun.position.copy(original.direction);
      sun.target.position.set(0, 0, 0);
    }
    sky.intensity = active ? 1.8 : original.skyPower;
    sun.intensity = active ? 2.4 : original.sunPower;
    renderer.toneMappingExposure = active ? 1.0 : original.exposure;
    sun.castShadow = renderer.shadowMap.enabled = active;
    renderer.shadowMap.needsUpdate = active;
    for (const effect of effects) effect(active);
  }

  function frame(target, distance) {
    if (name !== 'minimapa') return;
    // Snap the shadow map to world-space texels to keep it still while orbiting.
    const radius = Math.min(1800, Math.max(64, Math.ceil(distance / 24) * 24));
    const texel = 2 * radius / resolution;
    const x = Math.round(target.x / texel) * texel, z = Math.round(target.z / texel) * texel;
    const camera = sun.shadow.camera;
    if (lastRadius === radius && sun.target.position.x === x && sun.target.position.z === z) return;
    lastRadius = radius;
    sun.target.position.set(x, 0, z);
    sun.position.copy(sun.target.position).addScaledVector(direction, 3 * radius);
    camera.left = camera.bottom = -radius;
    camera.right = camera.top = radius;
    camera.near = 1;
    camera.far = 5 * radius;
    camera.updateProjectionMatrix();
    renderer.shadowMap.needsUpdate = true;
  }

  return {onChange, onSeason, setAutumn, tint, ground, crowns, set, frame,
    changed() { if (name === 'minimapa') renderer.shadowMap.needsUpdate = true; },
    get name() { return name; }
  };
}
