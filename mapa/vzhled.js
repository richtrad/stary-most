import * as T from 'three';

// Presentation colours. The choice is keyed by the footprint, never by author.
export const roofTones = [0xb4614b, 0xc67b58, 0x995344, 0xbe704f, 0x89675a, 0xca8d68, 0x64717b];
export const wallTones = [0xf1dfb9, 0xdfc59d, 0xe6d4af, 0xf3e4c7];
export function toneFor(tones, id) {
  return tones[Math.abs(Number(id) || 0) % tones.length];
}

export function mapAppearance(renderer, scene, sky, sun) {
  const effects = [];
  const groundMaterials = new Map();
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
  let lastRadius = 0;

  function onChange(effect) {
    effects.push(effect);
    effect(name === 'minimapa');
  }

  function tint(material, tone) {
    const before = material.color.clone(), after = new T.Color(tone);
    onChange(active => material.color.copy(active ? after : before));
    return material;
  }

  // Keep the original unlit surface, including its render order and pick identity.
  // The alternate material on the same mesh can receive directional shadows.
  function ground(mesh, tone) {
    const originalMaterial = mesh.material;
    const key = `${tone}/${originalMaterial.side}`;
    if (!groundMaterials.has(key)) {
      groundMaterials.set(key, new T.MeshLambertMaterial({color: tone, side: originalMaterial.side}));
    }
    const styled = groundMaterials.get(key);
    mesh.receiveShadow = true;
    onChange(active => { mesh.material = active ? styled : originalMaterial; });
  }

  function crowns(mesh) {
    const full = mesh.geometry;
    mesh.castShadow = mesh.receiveShadow = true;
    onChange(active => { mesh.geometry = active ? facets : full; });
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

  return {onChange, tint, ground, crowns, set, frame,
    changed() { if (name === 'minimapa') renderer.shadowMap.needsUpdate = true; },
    get name() { return name; }
  };
}
