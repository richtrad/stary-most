import * as T from 'three';

const base = new URL('./', import.meta.url);
let catalogue;
export function cityFacades() {
  catalogue ??= fetch(new URL('mestska-pruceli.json', base)).then(r => {
    if (!r.ok) throw Error('Nepodařilo se načíst polohy průčelí.');
    return r.json();
  });
  return catalogue;
}

export function facadeURL(id, layer, side = '', source = false) {
  const url = new URL('./', base);
  url.searchParams.set('gis', id);
  url.searchParams.set('layer', layer);
  if (side) url.searchParams.set('stena', side);
  if (source) url.searchParams.set('pramen', '1');
  return url;
}

export function cityFacadeLayer(scene, changed) {
  const faces = [], visible = new Map(), textures = new Map();
  const plane = new T.PlaneGeometry(1, 1), loader = new T.TextureLoader();
  const frustum = new T.Frustum(), projection = new T.Matrix4();
  let requested = false, tick = 0;
  function read(data) {
    for (const house of data) for (const face of house.faces) {
      const placements = {};
      for (const [layer, [x, z, u, t, baseY, height]] of Object.entries(face.layers)) {
        const width = Math.hypot(u - x, t - z);
        if (!width) continue;
        const normal = new T.Vector3((z - t) / width, 0, (u - x) / width);
        function placement([top,bottom]) {
          const h = (bottom - top) * height;
          const center = new T.Vector3((x + u) / 2, baseY + height * (1 - (top + bottom) / 2), (z + t) / 2);
          center.addScaledVector(normal, .035);
          return {normal,center,width,height:h,angle:-Math.atan2(t-z,u-x),bounds:new T.Sphere(center,Math.hypot(width,h)/2)};
        }
        placements[layer] = {photo:placement(face.coverage),sketch:placement([0,1])};
      }
      faces.push({id:house.id, cp:house.cp, side:face.side, asset:face.asset, sketch:face.sketch, placements});
    }
    changed();
  }
  function textureFor(asset) {
    let entry = textures.get(asset);
    if (!entry) {
      entry = {last:tick, loaded:false};
      textures.set(asset, entry);
      entry.texture = loader.load(new URL(asset,base).href, tex => {
        tex.encoding = T.sRGBEncoding;
        entry.loaded = true;
        changed();
      }, undefined, () => { entry.failed = true; changed(); });
    }
    entry.last = tick;
    return entry;
  }
  function frame(camera, distance, layer, mode, planes, existing) {
    ++tick;
    const nearby = [];
    if (mode && distance < 235) {
      if (!requested) {
        requested = true;
        cityFacades().then(read).catch(() => {});
      }
      frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
      for (const face of faces) {
        if (existing.has(face.cp)) continue;
        const v = (face.placements[layer] || face.placements.gis)?.[mode];
        if (!v || !frustum.intersectsSphere(v.bounds)) continue;
        const d = camera.position.distanceToSquared(v.center);
        if (d > 245 * 245 || v.normal.dot(camera.position) <= v.normal.dot(v.center)) continue;
        nearby.push({face,v,d});
      }
      nearby.sort((a,b) => a.d - b.d);
    }
    const nearest = nearby.slice(0,24), keep = new Set(nearest.map(i => i.face));
    for (const [face,mesh] of visible) if (!keep.has(face)) {
      mesh.removeFromParent();mesh.material.dispose();visible.delete(face);
    }
    for (const {face,v} of nearest) {
      let mesh = visible.get(face);
      const image = textureFor(mode==='sketch'?face.sketch:face.asset);
      if (!image.loaded) {if(mesh)mesh.visible=false;continue;}
      if (!mesh) {
        const mat = new T.MeshBasicMaterial({map:image.texture,toneMapped:false,side:T.FrontSide,alphaTest:.05,polygonOffset:true,polygonOffsetFactor:-1});
        mesh = new T.Mesh(plane,mat);
        mesh.userData.front = face;
        visible.set(face,mesh);scene.add(mesh);
      }
      mesh.visible = true;
      if(mesh.material.map!==image.texture){mesh.material.map=image.texture;mesh.material.needsUpdate=true;}
      mesh.material.clippingPlanes = planes;
      mesh.position.copy(v.center);mesh.rotation.y = v.angle;mesh.scale.set(v.width,v.height,1);
    }
    if (textures.size > 48) for (const [asset,entry] of [...textures].sort((a,b) => a[1].last-b[1].last)) {
      if (textures.size <= 48 || entry.last === tick) break;
      if (entry.loaded || entry.failed) {entry.texture.dispose();textures.delete(asset);}
    }
  }
  function pick(ray,planes) {
    return ray.intersectObjects([...visible.values()].filter(m=>m.visible),false).find(h => !planes?.some(p => p.distanceToPoint(h.point)<0));
  }
  return {frame,pick,inspect:() => ({loaded:faces.length,visible:[...visible].filter(([,m])=>m.visible).map(([f])=>f.id)})};
}
