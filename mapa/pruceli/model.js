import * as T from 'three';
import {roofTones, wallTones, toneFor} from '../vzhled.js?v=20261120-podzim';

// The GLBs use a common facade coordinate system: left jamb at x=0, street at +Z.
export function placeFront(file, house, variant, appearance) {
  const [[x,z],[xx,zz]] = house.edge;
  const yaw = T.MathUtils.degToRad(house.yaw);
  const group = file.scene;
  group.position.set(house.position[0] + x*Math.cos(yaw) + z*Math.sin(yaw), house.position[1],
    house.position[2] - x*Math.sin(yaw) + z*Math.cos(yaw));
  group.rotation.y = yaw - Math.atan2(zz-z,xx-x);
  const front = group.getObjectByName('Pruceli');
  let plaster;
  const materials = new Set();
  group.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    o.userData.cp = house.cp;
    o.userData.photoFront = false;
    for (const m of [].concat(o.material)) materials.add(m);
  });
  front.traverse(o => { if (o.isMesh) o.userData.photoFront = true; });
  for (const m of materials) {
    if (m.name === 'omitka') plaster = m;
    if (m.name === 'krytina') {
      m.color.setHex(0x8d9984);
      appearance.tint(m,toneFor(roofTones,house.id));
    }
  }
  const shapes = variant.outline.map(ring => new T.Shape(ring.map(([u,y]) => new T.Vector2(u,y))));
  const plain = new T.Mesh(new T.ShapeGeometry(shapes),plaster);
  plain.name = 'Ulicni_stena'; plain.userData = {cp:house.cp,photoFront:true};
  plain.castShadow = plain.receiveShadow = true;
  group.add(plain);
  function setLevel(level) {
    front.visible = level === 'pruceli';
    plain.visible = !front.visible;
  }
  setLevel('pruceli');
  return {group,setLevel};
}

const finishes = {lem:0xf2dfbc, osteni:0xa28e73, sklo:0x586571, dvere:0x785942, desky:0xaa8866, pole:0xc3ae8c, kamen:0xc1aa90, komin:0x795f4c};

export function schematicFronts(scene, loader, catalog, appearance, changed) {
  const loaded = new Map(), pending = new Set(), failed = new Set();
  const houses = Object.keys(catalog?.houses || {});
  let active = null, planes = [];
  function prepare(mesh) {
    const geometry = mesh.geometry, atlas = geometry.getAttribute('color');
    const colors = new Float32Array(atlas.count * 3);
    for (const [start, count, key, id] of mesh.userData.tones) {
      const color = new T.Color(key === 'omitka' ? toneFor(wallTones,id) : key === 'krytina' ? toneFor(roofTones,id) : finishes[key]);
      for (let vertex = start; vertex < start + count; vertex++) color.toArray(colors,vertex*3);
    }
    const mini = new T.BufferAttribute(colors,3);
    mesh.material = new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide});
    mesh.castShadow = mesh.receiveShadow = true;
    appearance.onChange(enabled => { geometry.setAttribute('color',enabled ? mini : atlas); });
  }
  async function load(layer) {
    const entry = catalog?.assets[layer];
    if (!entry || loaded.has(layer) || pending.has(layer) || failed.has(layer)) return;
    pending.add(layer);
    try {
      const file = await loader.loadAsync(new URL(entry.file,catalog.base).href);
      const root = file.scene;
      root.traverse(node => { if (node.isMesh) prepare(node); });
      root.visible = false;
      scene.add(root);
      loaded.set(layer,root);
    } catch (error) {
      failed.add(layer);
      console.warn('Schematická průčelí se nepodařilo načíst.',error);
    } finally {
      pending.delete(layer);
      changed();
    }
  }
  function configure(enabled,layer,clipping) {
    if (enabled) load(layer);
    active = enabled ? loaded.get(layer) : null;
    planes = clipping || [];
    for (const root of loaded.values()) root.visible = root === active;
    active?.traverse(node => { if (node.isMesh) node.material.clippingPlanes = planes; });
    return new Set(active ? houses : []);
  }
  function pick(ray) {
    if (!active) return null;
    const hit = ray.intersectObject(active,true).find(h => planes.every(p => p.distanceToPoint(h.point)>=0));
    if (!hit) return null;
    const {houseSpans,kind} = hit.object.userData;
    const cp = houses.find(code => {const [start,count]=houseSpans[code];return hit.faceIndex>=start && hit.faceIndex<start+count;});
    return cp ? {cp,kind:kind==='front'?'schematic-front':'roof',distance:hit.distance,intersection:hit} : null;
  }
  function face(cp,layer) {
    const info = catalog?.houses[cp]?.layers[layer];
    if (!info) return null;
    const [[x,z],[xx,zz]] = info.edge;
    const normal = new T.Vector3(z-zz,0,xx-x).normalize();
    const center = new T.Vector3((x+xx)/2,info.height*.54,(z+zz)/2);
    return {center,normal,width:info.width,height:info.height};
  }
  return {configure,pick,face,inspect:()=>({visible:!!active,ready:[...loaded.keys()],failed:[...failed],houses:active?houses:[]})};
}
